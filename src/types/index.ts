export interface CompanyProfile {
  name: string;
  legalName: string;
  hq: string;
  founded: number;
  sector: string;
  subSector: string;
  employeeCount: string;
  fundingStage: string;
  totalRaised: string;
  ceo: string;
  description: string;
  keyProducts: string[];
  markets: string[];
  recentNews: { headline: string; date: string; url: string }[];
}

export interface Competitor {
  rank: number;
  name: string;
  hq: string;
  founded: number;
  employees: string;
  fundingStage: string;
  totalRaised: string;
  ceo: string;
  differentiator: string;
  marketPosition: string;
  threatLevel: 'high' | 'medium' | 'low';
}

export interface OrgNode {
  id: string;
  name: string;
  title: string;
  tenure?: string;
  previousCompany?: string;
  confidence: 'confirmed' | 'inferred' | 'estimated';
  teamSize?: number;
  department?: string;
  linkedinUrl?: string;
  children?: OrgNode[];
}

export interface OrgChart {
  company: string;
  lastUpdated: string;
  totalEmployees: string;
  orgTree: OrgNode;
  recentChanges: { type: 'join' | 'departure'; name: string; title: string; date: string }[];
  openRoles: string[];
}

export interface TalentInsights {
  talentGaps: { role: string; company: string; severity: 'critical' | 'moderate' | 'minor' }[];
  keyManRisk: { name: string; title: string; company: string; riskLevel: 'high' | 'medium' | 'low'; reason: string }[];
  hiringVelocity: { company: string; trend: 'growing' | 'stable' | 'shrinking'; growthRate: string }[];
  leadershipQuality: { company: string; score: number; tier1Percentage: number }[];
  poachingRisk: { name: string; title: string; company: string; reason: string }[];
  hiringRecommendations: { role: string; urgency: 'immediate' | 'near-term' | 'strategic'; rationale: string }[];
}

export interface InvestmentSignals {
  signal: 'GO' | 'HOLD' | 'PASS';
  confidence: number;
  bullCase: { point: string; detail: string }[];
  bearCase: { point: string; detail: string }[];
  moat: { rating: 'Strong' | 'Moderate' | 'Weak'; reasoning: string };
  teamScore: number;
  teamScoreJustification: string;
  talentTrajectory: 'Improving' | 'Stable' | 'Declining';
  dueDiligence: { item: string }[];
  comparableExits: { company: string; exitType: string; exitValue: string; year: string }[];
}

export interface Analysis {
  id: string;
  created_at: string;
  company_name: string;
  company_slug: string;
  company_profile: CompanyProfile | null;
  competitors: { competitors: Competitor[] } | null;
  org_charts: Record<string, OrgChart> | null;
  talent_insights: TalentInsights | null;
  investment_signals: InvestmentSignals | null;
  status: 'pending' | 'processing' | 'complete' | 'error';
  user_id: string;
}

export type PipelineStep = 1 | 2 | 3 | 4 | 5;

export interface PipelineState {
  step: PipelineStep;
  status: 'idle' | 'running' | 'done' | 'error';
  label: string;
}
