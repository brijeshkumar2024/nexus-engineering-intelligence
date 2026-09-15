import { describe,it,expect } from 'vitest';
import { calculateHealth } from '../apps/api/src/scoring.ts';
describe('health scoring',()=>{
 it('is deterministic and bounded',()=>{
  const result=calculateHealth({complexity:10,securityFindings:0,outdatedDeps:0,activity:100,architectureSmells:0});
  expect(result.overall).toBeGreaterThanOrEqual(0);
  expect(result.overall).toBeLessThanOrEqual(100);
  expect(result.overall).toBe(100);
 });
 it('penalizes evidence signals',()=>{
  const healthy=calculateHealth({complexity:5,securityFindings:0,outdatedDeps:0,activity:100,architectureSmells:0});
  const risky=calculateHealth({complexity:40,securityFindings:4,outdatedDeps:5,activity:40,architectureSmells:5});
  expect(risky.overall).toBeLessThan(healthy.overall);
 });
});