import { Worker } from 'bullmq';
import IORedis from 'ioredis';

const url=process.env.REDIS_URL??'redis://localhost:6379';
const connection=new IORedis(url,{maxRetriesPerRequest:null});
const worker=new Worker('nexus-analysis',async job=>{
 console.log(JSON.stringify({event:'analysis_job_started',jobId:job.id,type:job.name,repositoryId:job.data?.repositoryId}));
 // Real pipeline adapters belong here: fetch -> parse -> security -> dependencies -> AI -> persist.
 await new Promise(r=>setTimeout(r,100));
 return {status:'processed',jobId:job.id};
},{connection,concurrency:2});
worker.on('completed',job=>console.log(JSON.stringify({event:'analysis_job_completed',jobId:job.id})));
worker.on('failed',(job,error)=>console.error(JSON.stringify({event:'analysis_job_failed',jobId:job?.id,error:error.message})));