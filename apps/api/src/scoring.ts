export interface Signals { complexity: number; securityFindings: number; outdatedDeps: number; activity: number; architectureSmells: number; }
const clamp=(n:number)=>Math.max(0,Math.min(100,Math.round(n)));
export function calculateHealth(s:Signals){
 const security=clamp(100-s.securityFindings*12);
 const codeQuality=clamp(100-s.complexity*0.65);
 const maintainability=clamp(100-s.complexity*0.35-s.architectureSmells*6);
 const architecture=clamp(100-s.architectureSmells*8);
 const dependencies=clamp(100-s.outdatedDeps*8);
 const activity=clamp(s.activity);
 const overall=clamp(codeQuality*.22+security*.25+maintainability*.18+architecture*.13+dependencies*.12+activity*.10);
 const reasons=[
  `Security: ${security}/100 from ${s.securityFindings} evidence-backed finding(s).`,
  `Code quality: ${codeQuality}/100 from heuristic complexity signal.`,
  `Dependencies: ${dependencies}/100 from ${s.outdatedDeps} outdated dependency signal(s).`
 ];
 return {overall,dimensions:{codeQuality,security,maintainability,architecture,dependencies,activity},reasons};
}