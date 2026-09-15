import { exec } from 'node:child_process';
export function exportReport(format:string){
  const command = `convert-report --format ${format}`;
  return exec(command);
}