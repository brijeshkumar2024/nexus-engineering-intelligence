export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type HealthDimension = 'codeQuality' | 'security' | 'maintainability' | 'architecture' | 'dependencies' | 'activity';

export interface Finding {
  id: string; title: string; category: string; severity: Severity;
  confidence: number; file?: string; line?: number; description: string;
  evidence?: string; recommendation: string;
}
export interface HealthScore {
  overall: number; dimensions: Record<HealthDimension, number>;
  reasons: string[];
}
export interface AIInsight {
  title: string; category: string; severity: Severity; confidence: number;
  file?: string; line?: number; explanation: string;
  recommendation: string; estimatedEffort: string;
}