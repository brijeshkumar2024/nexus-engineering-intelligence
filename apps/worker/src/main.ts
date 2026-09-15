import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import path from 'node:path';
import { scanRepository } from './repository-scanner';

const url = process.env.REDIS_URL ?? 'redis://localhost:6379';

const connection = new IORedis(url, {
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  'nexus-analysis',
  async (job) => {
    const repositoryId = job.data?.repositoryId;

    console.log(
      JSON.stringify({
        event: 'analysis_job_started',
        jobId: job.id,
        type: job.name,
        repositoryId,
      }),
    );

    if (!repositoryId) {
      throw new Error('Missing repositoryId in analysis job');
    }

    /*
     * For the current local/demo pipeline, repositoryId can point
     * to a local repository directory.
     *
     * GitHub repository fetching will be added as a separate adapter.
     */
    const repositoryPath = path.resolve(repositoryId);

    const scan = await scanRepository(repositoryPath);

    console.log(
      JSON.stringify({
        event: 'repository_scan_completed',
        jobId: job.id,
        repositoryId,
        totalFiles: scan.totalFiles,
        totalLines: scan.totalLines,
        totalBytes: scan.totalBytes,
        languages: scan.languages,
      }),
    );

    return {
      status: 'processed',
      jobId: job.id,
      repositoryId,
      scan: {
        totalFiles: scan.totalFiles,
        totalLines: scan.totalLines,
        totalBytes: scan.totalBytes,
        languages: scan.languages,
      },
    };
  },
  {
    connection,
    concurrency: 2,
  },
);

worker.on('completed', (job) => {
  console.log(
    JSON.stringify({
      event: 'analysis_job_completed',
      jobId: job.id,
    }),
  );
});

worker.on('failed', (job, error) => {
  console.error(
    JSON.stringify({
      event: 'analysis_job_failed',
      jobId: job?.id,
      error: error.message,
    }),
  );
});