import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { scanRepository } from './repository-scanner';
import { analyzeTypeScriptAST } from './ast-analyzer';

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

    // Phase 1: repository discovery and file metadata.
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

    // Phase 2: AST analysis for supported TypeScript files.
    const astResults = [];

    for (const file of scan.files) {
      if (file.language !== 'typescript') {
        continue;
      }

      const filePath = path.join(repositoryPath, file.path);

      try {
        const content = await readFile(filePath, 'utf8');

        const ast = analyzeTypeScriptAST(file.path, content);

        astResults.push({
          filePath: file.path,
          ...ast,
        });
      } catch (error) {
        console.warn(
          JSON.stringify({
            event: 'ast_analysis_skipped',
            repositoryId,
            filePath: file.path,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    }

    const astSummary = {
      filesAnalyzed: astResults.length,
      functions: astResults.reduce(
        (total, result) => total + result.metrics.functionCount,
        0,
      ),
      classes: astResults.reduce(
        (total, result) => total + result.metrics.classCount,
        0,
      ),
      imports: astResults.reduce(
        (total, result) => total + result.metrics.importCount,
        0,
      ),
      exports: astResults.reduce(
        (total, result) => total + result.metrics.exportCount,
        0,
      ),
    };

    console.log(
      JSON.stringify({
        event: 'ast_analysis_completed',
        jobId: job.id,
        repositoryId,
        ...astSummary,
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
      ast: {
        summary: astSummary,
        files: astResults,
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