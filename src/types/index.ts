// ── Org Chart ─────────────────────────────────────────────────
export interface OrgNode {
  id: string;
  name: string;
  title: string;
  tenure?: string;
  previousCompany?: string | null;
  confidence: 'confirmed' | 'inferred' | 'estimated';
  teamSize?: number;
  department?: string;
  linkedinUrl?: string | null;
  children?: OrgNode[];
}

export interface OrgChart {
  company: string;
  lastUpdated: string;
  totalEmployees: string;
  orgTree: OrgNode;
  recentChanges: { type: 'join' | 'departure'; name: string; title: string; date: string }[];
  openRoles: string[];
  // Enhanced intelligence fields
  orgMaturityScore?: number;
  orgMaturityClassification?: string;
  functionScores?: {
    product?: number;
    engineering?: number;
    aiMl?: number;
    operations?: number;
    sales?: number;
    customerSuccess?: number;
    marketing?: number;
    finance?: number;
    hr?: number;
    compliance?: number;
  };
  structuralFlags?: {
    titleInflation?: string[];
    parallelVPs?: string[];
    shadowReporting?: string[];
    reportingConflicts?: string[];
    founderDependencies?: string[];
  };
}

// ── Company Profile ────────────────────────────────────────────
export interface CompanyProfile {
  name: string;
  normalizedName?: string;
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
  recentNews: { headline: string; date: string; url: string; significance?: string }[];
  linkedinMatch?: { url: string; confidence: number; matchReasons: string[]; linkedinEmployeeCount?: string };
  businessModel?: string;
  revenueModel?: string;
  keyCustomers?: string[];
  geographicPresence?: string[];
  techStack?: string[];
  founderBackground?: string;
  boardAndInvestors?: string[];
  competitiveAdvantage?: string;
}

// ── Competitors ───────────────────────────────────────────────
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
  // Enhanced fields
  website?: string;
  similarityScore?: number;
  similarityBreakdown?: {
    productSimilarity: number;
    gtmSimilarity: number;
    fundingStageProximity: number;
    geographyOverlap: number;
    employeeScale: number;
    techSimilarity: number;
  };
  gtmStrategy?: string;
  keyStrengths?: string[];
  keyWeaknesses?: string[];
  recentDevelopments?: string;
}

// ── Talent Insights ───────────────────────────────────────────
export interface GapItem {
  gapId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  observation: string;
  recommendation: string;
}

export interface TalentInsights {
  // Core fields (backwards compatible)
  talentGaps: {
    role: string;
    company: string;
    severity: 'critical' | 'moderate' | 'minor';
    gapDescription?: string;
    competitorBenchmark?: string;
    revenueImpact?: string;
  }[];
  keyManRisk: {
    name: string;
    title: string;
    company: string;
    riskLevel: 'high' | 'medium' | 'low';
    reason: string;
    mitigationRecommendation?: string;
  }[];
  hiringVelocity: {
    company: string;
    trend: 'growing' | 'stable' | 'shrinking';
    growthRate: string;
    openRolesCount?: number;
    hiringFocus?: string;
    velocitySignal?: string;
  }[];
  leadershipQuality: {
    company: string;
    score: number;
    tier1Percentage: number;
    benchmarkVsCompetitors?: string;
    keyStrength?: string;
    keyGap?: string;
  }[];
  poachingRisk: {
    name: string;
    title: string;
    company: string;
    reason: string;
    retentionRisk?: string;
  }[];
  hiringRecommendations: {
    role: string;
    urgency: 'immediate' | 'near-term' | 'strategic';
    rationale: string;
    targetProfile?: string;
    estimatedHiringTimeline?: string;
    estimatedCompensation?: string;
  }[];
  // Enhanced gap detection fields
  executiveGaps?: {
    gapId: string;
    missingRole: string;
    severity: string;
    observation: string;
    risk: string;
    competitorBenchmark: string;
    recommendation: string;
  }[];
  operationalGaps?: {
    gapId: string;
    missingFunction: string;
    severity: string;
    observation: string;
    riskToRevenue: string;
    recommendation: string;
  }[];
  technicalGaps?: {
    gapId: string;
    missingFunction: string;
    severity: string;
    observation: string;
    scalingRisk: string;
    recommendation: string;
  }[];
  revenueGaps?: {
    gapId: string;
    missingFunction: string;
    severity: string;
    observation: string;
    pipelineImpact: string;
    recommendation: string;
  }[];
  governanceRisks?: {
    riskId: string;
    risk: string;
    severity: string;
    description: string;
    boardImpact: string;
    mitigation: string;
    urgency: string;
  }[];
  benchmarkMatrix?: {
    functions: string[];
    companies: { company: string; scores: number[]; overallScore: number; classification: string }[];
  };
  talentProspects?: {
    name: string;
    title: string;
    currentCompany: string;
    linkedinUrl?: string | null;
    emailConfidence?: string;
    reasonForFit: string;
  }[];
}

// ── Investment Signals ────────────────────────────────────────
export interface RiskScore {
  score: number;
  label: string;
  primaryDriver: string;
}

export interface InvestmentSignals {
  // Core fields (backwards compatible)
  signal: 'GO' | 'HOLD' | 'PASS';
  confidence: number;
  bullCase: { point: string; detail: string }[];
  bearCase: { point: string; detail: string }[];
  moat: { rating: 'Strong' | 'Moderate' | 'Weak'; reasoning: string };
  teamScore: number;
  teamScoreJustification: string;
  talentTrajectory: 'Improving' | 'Stable' | 'Declining';
  dueDiligence: { item: string }[];
  comparableExits: { company: string; exitType: string; exitValue: string; year: string; relevance?: string }[];
  // Enhanced intelligence fields
  signalRationale?: string;
  futureStateOrg?: {
    vision: string;
    ceoScope: string;
    executiveLayer: {
      role: string;
      priority: number;
      reportingTo: string;
      scope: string;
      hiringTimeline: string;
      rationale: string;
    }[];
    functionalPods: {
      pod: string;
      leader: string;
      functions: string[];
      currentGap: string;
    }[];
    orgAsciiChart?: string;
  };
  riskScores?: {
    structural?: RiskScore;
    governance?: RiskScore;
    revenueExecution?: RiskScore;
    scaling?: RiskScore;
    aiDeployment?: RiskScore;
    compliance?: RiskScore;
  };
  scalingReadinessScore?: number;
  scalingReadinessClassification?: string;
  scalingReadinessBreakdown?: Record<string, number>;
  hiringPlan12Month?: {
    quarter: string;
    role: string;
    priority: string;
    estimatedCost: string;
    rationale: string;
  }[];
  orgMigrationRoadmap?: {
    phase: string;
    actions: string[];
    successMetrics: string;
  }[];
}

// ── Legacy Analysis type ───────────────────────────────────────
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
