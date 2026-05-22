import { query, queryOne } from '../db/client';
import { callAI, extractJSON } from './aiProvider';
import { fetchOrgData, formatLushaContext } from './lusha';
import type { DbAnalysis } from '../types';

type PipelineAction = 'profile' | 'competitors' | 'orgcharts' | 'talent' | 'signals';

async function getSettings(): Promise<Record<string, unknown>> {
  const rows = await query<{ key: string; value: unknown }>(
    'SELECT key, value FROM settings'
  );
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

async function updateAnalysis(id: string, patch: Record<string, unknown>, step: number) {
  const cols = Object.keys(patch).map((k, i) => `${k} = $${i + 1}::jsonb`).join(', ');
  const vals = Object.values(patch).map(v => JSON.stringify(v));
  vals.push(String(step), id);
  await query(
    `UPDATE analyses SET ${cols}, pipeline_step = $${vals.length - 1}, updated_at = NOW() WHERE id = $${vals.length}`,
    vals
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Company Normalization + Identity Intelligence
// Maps to: Framework Steps 1 + 2 (Normalization Engine + LinkedIn Matching)
// ─────────────────────────────────────────────────────────────────────────────
export async function runProfileStep(analysisId: string, companyName: string): Promise<void> {
  const settings = await getSettings();

  const text = await callAI(
    `You are a VC Operating Partner and Competitive Intelligence Specialist at a top-tier venture firm.
Your job is to produce institutional-grade company intelligence — the kind used in Sequoia memos, Tiger Global portfolio reviews, and McKinsey org audits.
CRITICAL RULES:
- Never hallucinate. If data is uncertain, mark confidence accordingly.
- Always respond with valid JSON only — no prose, no markdown outside the JSON block.
- Every claim must be researchable via web search, LinkedIn, Crunchbase, or public filings.`,

    `Perform a deep institutional intelligence snapshot of "${companyName}".

STEP 1 — NORMALIZE THE COMPANY IDENTITY:
Strip from the name: Pvt Ltd, Private Limited, Inc, Technologies, AI, Labs, Tech, Solutions, Corp, Ltd.
Resolve rebrands, subsidiaries, aliases, and abbreviations.

STEP 2 — LINKEDIN ENTITY MATCHING:
Find the exact LinkedIn company page. Score confidence based on:
- Website domain match (strongest signal)
- Founder name match
- Employee count similarity
- Industry and geography match
Score 0–100. If < 75, note the uncertainty.

Return ONLY this exact JSON:
{
  "name": "Clean display name (e.g. Intangles)",
  "normalizedName": "Shortest canonical form",
  "legalName": "Full registered legal name",
  "hq": "City, Country",
  "founded": 2015,
  "sector": "Primary sector (e.g. Automotive SaaS)",
  "subSector": "Specific niche (e.g. Fleet Intelligence)",
  "employeeCount": "200-300",
  "fundingStage": "Series B",
  "totalRaised": "$28M",
  "ceo": "Full Name",
  "description": "2–3 sentence institutional description: what they do, for whom, and core differentiation",
  "keyProducts": ["Product A", "Platform B"],
  "markets": ["India", "USA", "Middle East"],
  "recentNews": [
    {
      "headline": "Company raises $X in Series B",
      "date": "2024-03",
      "url": "https://... or null",
      "significance": "Why this matters for VC context"
    }
  ],
  "linkedinMatch": {
    "url": "https://linkedin.com/company/...",
    "confidence": 88,
    "matchReasons": ["domain match", "founder verified", "employee count aligned"],
    "linkedinEmployeeCount": "210"
  },
  "businessModel": "B2B SaaS / Marketplace / Hardware+SaaS / etc",
  "revenueModel": "Annual subscription + professional services",
  "keyCustomers": ["Named customer or segment if public"],
  "geographicPresence": ["India (HQ)", "USA (Sales)", "Dubai (Ops)"],
  "techStack": ["Python", "AWS", "CAN bus", "React"],
  "founderBackground": "Institutional summary — prior exits, tier-1 education, domain expertise",
  "boardAndInvestors": ["Investor A", "Investor B"],
  "competitiveAdvantage": "Single-sentence moat description"
}`,
    settings,
  );

  await updateAnalysis(analysisId, { company_profile: extractJSON(text) }, 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Competitor Discovery with Weighted Scoring
// Maps to: Framework Step 3 (Competitor Discovery Engine)
// ─────────────────────────────────────────────────────────────────────────────
export async function runCompetitorsStep(analysisId: string, companyName: string): Promise<void> {
  const settings = await getSettings();
  const maxComp = Number(settings['max_competitors'] ?? 5);

  const analysis = await queryOne<DbAnalysis>('SELECT company_profile FROM analyses WHERE id = $1', [analysisId]);
  const profile = analysis?.company_profile as Record<string, unknown> ?? {};
  const sector = (profile.sector as string) ?? 'technology';
  const businessModel = (profile.businessModel as string) ?? '';
  const markets = (profile.markets as string[]) ?? [];
  const fundingStage = (profile.fundingStage as string) ?? '';

  const text = await callAI(
    `You are a VC Operating Partner performing an institutional competitive landscape analysis.
Your competitor scoring must be rigorous and evidence-based — the kind used in BCG competitive benchmarks.
CRITICAL: Always respond with valid JSON only. Never hallucinate companies.`,

    `Identify the top ${maxComp} direct competitors of "${companyName}".

Context:
- Sector: ${sector}
- Business model: ${businessModel}
- Markets: ${markets.join(', ')}
- Funding stage: ${fundingStage}

SCORING FORMULA (total = 100):
- 35% Product Similarity (core product overlap, same customer pain point)
- 20% GTM Similarity (sales motion, ICP, channel strategy)
- 15% Funding Stage Proximity (within 1 stage = 15, 2 stages = 8, 3+ = 0)
- 10% Geography Overlap (same primary market)
- 10% Employee Scale (within 2x = 10, within 5x = 5)
- 10% Technology Stack Similarity

Use sources: Crunchbase, Tracxn, G2, CB Insights, LinkedIn, company websites.

Return ONLY this exact JSON:
{
  "competitors": [
    {
      "rank": 1,
      "name": "Competitor Name",
      "hq": "City, Country",
      "founded": 2016,
      "employees": "150-200",
      "fundingStage": "Series A",
      "totalRaised": "$15M",
      "ceo": "Name",
      "website": "https://...",
      "differentiator": "What they do differently vs target company",
      "marketPosition": "How they position in the market",
      "threatLevel": "high",
      "similarityScore": 82,
      "similarityBreakdown": {
        "productSimilarity": 30,
        "gtmSimilarity": 16,
        "fundingStageProximity": 15,
        "geographyOverlap": 8,
        "employeeScale": 7,
        "techSimilarity": 6
      },
      "gtmStrategy": "Direct enterprise sales via fleet managers",
      "keyStrengths": ["Strong brand in EU", "Deep OEM partnerships"],
      "keyWeaknesses": ["No India presence", "Hardware-only play"],
      "recentDevelopments": "Raised Series B in Q1 2024, expanding to MENA"
    }
  ],
  "competitiveSummary": "2–3 sentence institutional summary of the competitive landscape"
}`,
    settings,
  );

  await updateAnalysis(analysisId, { competitors: extractJSON(text) }, 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — Org Chart Intelligence + Maturity Scoring + Structural Analysis
// Maps to: Framework Steps 4 + 5 + 6 (Extraction + Inference + Maturity)
// ─────────────────────────────────────────────────────────────────────────────
export async function runOrgChartsStep(analysisId: string, companyName: string): Promise<void> {
  const settings = await getSettings();
  const lushaEnabled = settings['lusha_enabled'] !== false;
  const seniorityLevels = (settings['lusha_seniority_levels'] as string[]) ?? ['c_level', 'vp', 'director'];

  const analysis = await queryOne<DbAnalysis>('SELECT competitors FROM analyses WHERE id = $1', [analysisId]);
  const competitors = ((analysis?.competitors as Record<string, unknown>)?.competitors as Array<{ name: string }>) ?? [];
  const allCompanies = [companyName, ...competitors.map(c => c.name)];
  const today = new Date().toISOString().split('T')[0];
  const orgCharts: Record<string, unknown> = {};

  for (const company of allCompanies) {
    try {
      let lushaContext = '';
      let employeeCount = 'Unknown';

      if (lushaEnabled) {
        const { people, company: companyData } = await fetchOrgData(company, seniorityLevels);
        lushaContext = formatLushaContext(people, companyData);
        employeeCount = String(companyData?.employeeCount ?? companyData?.employeeRange ?? 'Unknown');
      }

      const lushaSection = lushaContext
        ? `\n\nVERIFIED DATA FROM LUSHA — mark every person in this list as confidence "confirmed":\n${lushaContext}\n`
        : '\n\n(No Lusha data available — infer from LinkedIn, web search, job boards. Mark as "inferred" or "estimated".)\n';

      const text = await callAI(
        `You are a VC Operating Partner building institutional-grade org intelligence — the kind used in McKinsey org audits and Sequoia operating reviews.

CRITICAL RULES FOR ORG TREE:
1. Never hallucinate people. Every name must be verifiable via LinkedIn or Lusha.
2. Unknown people: use title only with name "Unknown" and confidence "estimated".
3. IDs must be unique slugs: "ceo", "cto", "vp-eng", "vp-sales", "dir-product", "head-ai", etc.
4. Confidence levels: "confirmed" (Lusha/verified), "inferred" (LinkedIn/job posts), "estimated" (inferred from structure).
5. Max depth: 4 levels (CEO → C-Suite → VP → Director). Do not go deeper.
6. Every node MUST have a "children" array (empty [] if no reports known).
7. Always respond with valid JSON only.`,

        `Build the complete organizational intelligence report for "${company}".${lushaSection}

Sources to use: LinkedIn People search, leadership/team pages, job postings, Lusha data above, press releases, executive bios.

MATURITY SCORING (0–100 per function):
- 0–20: Chaotic (no structure)
- 21–40: Early Startup (founder-led)
- 41–60: Scaling (some process)
- 61–80: Institutionalizing (clear ownership)
- 81–100: Enterprise Grade (full governance)

Return ONLY this exact JSON:
{
  "company": "${company}",
  "lastUpdated": "${today}",
  "totalEmployees": "${employeeCount}",
  "orgMaturityScore": 58,
  "orgMaturityClassification": "Scaling",
  "functionScores": {
    "product": 55,
    "engineering": 65,
    "aiMl": 40,
    "operations": 50,
    "sales": 60,
    "customerSuccess": 45,
    "marketing": 35,
    "finance": 50,
    "hr": 30,
    "compliance": 25
  },
  "orgTree": {
    "id": "ceo",
    "name": "Exact Name or Unknown",
    "title": "CEO & Co-Founder",
    "tenure": "5 years",
    "previousCompany": "Prior company name",
    "confidence": "confirmed",
    "department": "Executive",
    "teamSize": 180,
    "linkedinUrl": "https://linkedin.com/in/... or null",
    "children": [
      {
        "id": "cto",
        "name": "Name or Unknown",
        "title": "CTO",
        "tenure": "3 years",
        "previousCompany": "Prior company",
        "confidence": "confirmed",
        "department": "Engineering",
        "teamSize": 45,
        "linkedinUrl": null,
        "children": [
          {
            "id": "vp-eng",
            "name": "Name or Unknown",
            "title": "VP Engineering",
            "tenure": "2 years",
            "previousCompany": "Prior company",
            "confidence": "inferred",
            "department": "Engineering",
            "teamSize": 30,
            "linkedinUrl": null,
            "children": []
          },
          {
            "id": "head-ai",
            "name": "Name or Unknown",
            "title": "Head of AI/ML",
            "tenure": "1 year",
            "previousCompany": "Prior company",
            "confidence": "inferred",
            "department": "Engineering",
            "teamSize": 8,
            "linkedinUrl": null,
            "children": []
          }
        ]
      },
      {
        "id": "cro",
        "name": "Name or Unknown",
        "title": "CRO / VP Sales",
        "tenure": "Unknown",
        "previousCompany": null,
        "confidence": "estimated",
        "department": "Sales",
        "teamSize": 20,
        "linkedinUrl": null,
        "children": []
      }
    ]
  },
  "structuralFlags": {
    "titleInflation": ["VP title given to IC-level contributor (inferred from team size < 3)"],
    "parallelVPs": ["Two VP Sales titles detected — possible territory conflict"],
    "shadowReporting": ["Finance appears to report to CEO bypassing CFO"],
    "reportingConflicts": ["Customer Success split between CRO and CTO — unclear ownership"],
    "founderDependencies": ["CEO directly manages 6 functions — high SPOF risk"]
  },
  "recentChanges": [
    {"type": "join", "name": "Person Name", "title": "Title", "date": "2024-06"},
    {"type": "departure", "name": "Person Name", "title": "Title", "date": "2024-02"}
  ],
  "openRoles": ["VP Marketing", "Head of Compliance", "Director Customer Success"]
}`,
        settings,
      );

      orgCharts[company] = extractJSON(text);
    } catch {
      orgCharts[company] = {
        company,
        lastUpdated: today,
        totalEmployees: employeeCount ?? 'Unknown',
        orgMaturityScore: 0,
        orgMaturityClassification: 'Unknown',
        functionScores: {},
        orgTree: {
          id: 'ceo',
          name: 'Unknown',
          title: 'CEO',
          confidence: 'estimated',
          department: 'Executive',
          children: [],
        },
        structuralFlags: {},
        recentChanges: [],
        openRoles: [],
      };
    }
  }

  await updateAnalysis(analysisId, { org_charts: orgCharts }, 3);
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 — Gap Detection + Competitor Benchmarking + Talent Prospecting
// Maps to: Framework Steps 7 + 8 + 9 (Benchmarking + Gap Detection + Talent)
// ─────────────────────────────────────────────────────────────────────────────
export async function runTalentStep(analysisId: string, companyName: string): Promise<void> {
  const settings = await getSettings();
  const analysis = await queryOne<DbAnalysis>('SELECT competitors, org_charts FROM analyses WHERE id = $1', [analysisId]);
  const competitors = ((analysis?.competitors as Record<string, unknown>)?.competitors as Array<{ name: string }>) ?? [];
  const competitorList = competitors.map(c => c.name).join(', ');

  // Pull maturity scores from org_charts for context
  const orgCharts = (analysis?.org_charts ?? {}) as Record<string, Record<string, unknown>>;
  const targetOrgData = orgCharts[companyName] ?? {};
  const targetMaturity = targetOrgData['orgMaturityScore'] ?? 'unknown';
  const targetFunctions = JSON.stringify(targetOrgData['functionScores'] ?? {});

  const text = await callAI(
    `You are a VC Operating Partner and Organizational Architect performing an institutional talent and structural gap analysis.
Your output is used directly in board presentations and Series B due diligence packages — McKinsey-grade, Bain-grade.
CRITICAL: Never hallucinate people. Do not invent names. Use only publicly verifiable identities.
Always respond with valid JSON only.`,

    `Perform a comprehensive talent intelligence and structural gap analysis for "${companyName}" benchmarked against competitors: ${competitorList}.

Known context:
- Target org maturity score: ${targetMaturity}/100
- Target function scores: ${targetFunctions}

ANALYSIS REQUIREMENTS:

1. TALENT GAPS — roles the company critically needs vs competitors who have them
2. KEY MAN RISK — individuals whose departure would materially harm operations
3. HIRING VELOCITY — growth signals from LinkedIn headcount trends and job postings
4. LEADERSHIP QUALITY — caliber of executive team vs competitor bench strength
5. POACHING RISK — high-value people at target likely to be recruited away
6. HIRING RECOMMENDATIONS — prioritized by urgency
7. EXECUTIVE GAPS — missing C-suite and VP-level roles vs competitor benchmarks
8. STRUCTURAL GAPS — broken reporting, missing functions, SPOF risks
9. BENCHMARK MATRIX — function-by-function maturity comparison vs all competitors
10. TALENT PROSPECTS — real, identifiable executives at competitors who could fill gaps

GAP SEVERITY FRAMEWORK:
- CRITICAL: Revenue or product delivery at risk. Fix within 90 days.
- HIGH: Competitive disadvantage growing. Fix within 6 months.
- MEDIUM: Scaling inefficiency. Fix within 12 months.
- LOW: Nice to have. Address when ready.

Return ONLY this exact JSON:
{
  "talentGaps": [
    {
      "role": "Chief Revenue Officer",
      "company": "${companyName}",
      "severity": "critical",
      "gapDescription": "No centralized revenue leadership. Multiple sales VPs creating pipeline duplication.",
      "competitorBenchmark": "4/5 competitors have a dedicated CRO",
      "revenueImpact": "Estimated 20–30% pipeline leakage from uncoordinated GTM"
    }
  ],
  "keyManRisk": [
    {
      "name": "Founder Name (if publicly known, else 'CEO — name withheld')",
      "title": "CEO & Co-Founder",
      "company": "${companyName}",
      "riskLevel": "high",
      "reason": "Direct control over Product, Engineering, and Sales. No succession plan evident.",
      "mitigationRecommendation": "Hire COO to distribute operational load within 6 months"
    }
  ],
  "hiringVelocity": [
    {
      "company": "${companyName}",
      "trend": "growing",
      "growthRate": "+18% headcount in 12 months",
      "openRolesCount": 12,
      "hiringFocus": "Engineering and Customer Success",
      "velocitySignal": "Accelerating — Series B deployment visible"
    }
  ],
  "leadershipQuality": [
    {
      "company": "${companyName}",
      "score": 62,
      "tier1Percentage": 25,
      "benchmarkVsCompetitors": "Below median — competitors average 71",
      "keyStrength": "Strong technical founding team",
      "keyGap": "Weak commercial leadership bench"
    }
  ],
  "poachingRisk": [
    {
      "name": "Name or title if name unknown",
      "title": "VP Engineering",
      "company": "${companyName}",
      "reason": "2+ years tenure, likely vested. Actively viewed on LinkedIn. Competitor recruiting.",
      "retentionRisk": "high"
    }
  ],
  "hiringRecommendations": [
    {
      "role": "Chief Revenue Officer",
      "urgency": "immediate",
      "rationale": "Revenue fragmentation across 2 sales VPs creating territory conflicts and pricing inconsistency",
      "targetProfile": "Series B–C SaaS CRO, India + international GTM experience, $5M–$50M ARR playbook",
      "estimatedHiringTimeline": "3–5 months",
      "estimatedCompensation": "₹80–120L + equity"
    }
  ],
  "executiveGaps": [
    {
      "gapId": "GAP-001",
      "missingRole": "Chief Revenue Officer",
      "severity": "critical",
      "observation": "No centralized revenue governance. Two parallel sales VPs without unified pipeline.",
      "risk": "Pipeline duplication, territory conflicts, pricing inconsistency across enterprise accounts.",
      "competitorBenchmark": "4/5 comparable companies have a CRO.",
      "recommendation": "Hire Global CRO with RevOps pod within 90 days."
    }
  ],
  "operationalGaps": [
    {
      "gapId": "GAP-002",
      "missingFunction": "Customer Success Leadership",
      "severity": "high",
      "observation": "Customer success split between CRO and CTO — unclear ownership and escalation path.",
      "riskToRevenue": "NRR risk from unresolved escalations. Churn signal from CS team not aligned with product.",
      "recommendation": "Appoint Head of Customer Success reporting to CRO within 6 months."
    }
  ],
  "technicalGaps": [
    {
      "gapId": "GAP-003",
      "missingFunction": "Platform Engineering / DevOps",
      "severity": "medium",
      "observation": "AI team and engineering appear siloed. No shared platform layer or MLOps infrastructure evident.",
      "scalingRisk": "Technical debt and deployment bottlenecks will accelerate as product scales.",
      "recommendation": "Hire VP Platform Engineering or Head of DevOps within 12 months."
    }
  ],
  "revenueGaps": [
    {
      "gapId": "GAP-004",
      "missingFunction": "Revenue Operations (RevOps)",
      "severity": "high",
      "observation": "No RevOps function. CRM data quality and pipeline accuracy at risk.",
      "pipelineImpact": "Sales forecasting unreliable. Commission disputes likely at scale.",
      "recommendation": "Build RevOps function under CRO — 1 Director + 2 analysts within 6 months."
    }
  ],
  "governanceRisks": [
    {
      "riskId": "GOV-001",
      "risk": "Founder Dependency — Single Point of Failure",
      "severity": "critical",
      "description": "CEO directly controls Product, Engineering, and Sales decisions. No second-in-command.",
      "boardImpact": "Unacceptable for Series B institutional investors. Governance red flag.",
      "mitigation": "Hire COO with operational mandate within 90 days. Define CEO scope to Vision + External.",
      "urgency": "immediate"
    }
  ],
  "benchmarkMatrix": {
    "functions": ["Product", "Engineering", "AI/ML", "Sales", "CustomerSuccess", "Marketing", "Finance", "HR", "Compliance"],
    "companies": [
      {
        "company": "${companyName}",
        "scores": [55, 65, 40, 50, 35, 30, 45, 25, 20],
        "overallScore": 40,
        "classification": "Early Scaling"
      }
    ]
  },
  "talentProspects": [
    {
      "name": "Do NOT hallucinate — use real publicly known executives only, else omit",
      "title": "CRO",
      "currentCompany": "Competitor name",
      "linkedinUrl": "https://linkedin.com/in/... or null",
      "emailConfidence": "medium",
      "reasonForFit": "Led $0–$20M ARR at similar B2B SaaS, managed India + SEA territory, ex-Salesforce"
    }
  ]
}`,
    settings,
  );

  await updateAnalysis(analysisId, { talent_insights: extractJSON(text) }, 4);
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5 — Investment Signal + Future-State Org + Risk Scores + 12-Month Plan
// Maps to: Framework Steps 10 + 11 + 12 (Future Org + Risk + Final Report)
// ─────────────────────────────────────────────────────────────────────────────
export async function runSignalsStep(analysisId: string, companyName: string): Promise<void> {
  const settings = await getSettings();
  const investmentFocus = (settings['investment_focus'] as string) ?? 'India-focused VC backing technology companies';

  const analysis = await queryOne<DbAnalysis>(
    'SELECT competitors, talent_insights FROM analyses WHERE id = $1',
    [analysisId]
  );
  const competitors = ((analysis?.competitors as Record<string, unknown>)?.competitors as Array<{ name: string }>) ?? [];
  const competitorList = competitors.map(c => c.name).join(', ');

  // Pull gap count for signal calibration
  const talent = (analysis?.talent_insights ?? {}) as Record<string, unknown>;
  const execGaps = (talent['executiveGaps'] as unknown[])?.length ?? 0;
  const govRisks = (talent['governanceRisks'] as unknown[])?.length ?? 0;

  const text = await callAI(
    `You are a Senior VC Partner at a top-tier firm (${investmentFocus}).
You are producing the final boardroom-grade investment and organizational intelligence report — equivalent to a McKinsey Org Audit, Bain Transformation Memo, or Sequoia Operating Review.
CRITICAL: Always respond with valid JSON only. Be deeply analytical, institutional in tone, and evidence-based.`,

    `Produce the final investment signal and organizational restructuring blueprint for "${companyName}" benchmarked against: ${competitorList}.

Known gap counts: ${execGaps} executive gaps, ${govRisks} governance risks identified.

Your output must cover:

1. INVESTMENT SIGNAL — GO / HOLD / PASS with confidence score and detailed rationale
2. BULL CASE — 3–5 evidence-based reasons to invest
3. BEAR CASE — 3–5 structural or market risks
4. MOAT ANALYSIS — competitive durability assessment
5. TEAM SCORE — leadership quality vs Series B benchmarks
6. FUTURE-STATE ORG — institutional-grade restructuring blueprint
7. RISK SCORES — multi-dimensional risk quantification
8. SCALING READINESS SCORECARD — 0–100 with sub-scores
9. 12-MONTH HIRING PLAN — sequenced by priority and quarter
10. ORG MIGRATION ROADMAP — phased transition plan

FUTURE-STATE ORG DESIGN PRINCIPLES:
- Series B readiness and institutional governance
- Reduced single-point-of-failure risk
- Centralized revenue under CRO
- AI/ML integrated with Engineering
- Clear CEO scope: Vision, Board, External
- COO owns all internal operations

RISK SCORING (0–100, higher = more risk):
- Structural Risk: broken reporting, missing functions
- Governance Risk: founder dependency, board gaps
- Revenue Execution Risk: GTM fragmentation, pipeline quality
- Scaling Risk: capacity to handle 3–5x growth
- AI Deployment Risk: ML maturity and productionization
- Compliance Risk: regulatory exposure, data governance

Return ONLY this exact JSON:
{
  "signal": "HOLD",
  "confidence": 68,
  "signalRationale": "3–4 sentence institutional rationale for the signal",
  "bullCase": [
    {
      "point": "Category-defining product in underpenetrated market",
      "detail": "Fleet IoT penetration in India is <8%. ${companyName} has first-mover advantage with 3+ year data moat."
    }
  ],
  "bearCase": [
    {
      "point": "Revenue leadership fragmentation",
      "detail": "Dual VP Sales without CRO governance creating pipeline duplication and pricing inconsistency across enterprise accounts."
    }
  ],
  "moat": {
    "rating": "Moderate",
    "reasoning": "Data network effects emerging but replicable by well-funded competitor within 18–24 months absent defensible integrations."
  },
  "teamScore": 64,
  "teamScoreJustification": "Strong technical co-founders but commercial bench significantly below Series B standards. No CRO, no COO, no CFO.",
  "talentTrajectory": "Improving",
  "dueDiligence": [
    {"item": "Validate CRO hire plan and timeline — this is the primary execution risk"},
    {"item": "Review NRR by cohort — CS fragmentation likely creating churn"},
    {"item": "Assess AI/ML team independence from product engineering"},
    {"item": "Confirm board composition and governance charter post-Series B"}
  ],
  "comparableExits": [
    {
      "company": "Comparable company name",
      "exitType": "Acquisition / IPO",
      "exitValue": "$180M",
      "year": "2022",
      "relevance": "Why this exit is comparable"
    }
  ],
  "futureStateOrg": {
    "vision": "Institutional-grade org structure optimized for Series B governance and 3x scale",
    "ceoScope": "Vision, Board Relations, Strategic Partnerships — remove from day-to-day ops",
    "executiveLayer": [
      {
        "role": "COO",
        "priority": 1,
        "reportingTo": "CEO",
        "scope": "All internal operations: Engineering, Product, Customer Success, HR",
        "hiringTimeline": "0–90 days",
        "rationale": "Immediately reduces CEO operational load and SPOF risk"
      },
      {
        "role": "CRO",
        "priority": 2,
        "reportingTo": "CEO",
        "scope": "Enterprise Sales, SDR, RevOps, Customer Success",
        "hiringTimeline": "0–90 days",
        "rationale": "Centralizes revenue under single P&L owner, eliminates pipeline duplication"
      },
      {
        "role": "CFO",
        "priority": 3,
        "reportingTo": "CEO",
        "scope": "Finance, FP&A, Legal, Compliance",
        "hiringTimeline": "3–6 months",
        "rationale": "Series B and IPO-readiness requires institutional finance governance"
      }
    ],
    "functionalPods": [
      {
        "pod": "Revenue Pod",
        "leader": "CRO",
        "functions": ["Enterprise Sales", "SDR / BDR", "RevOps", "Customer Success", "Partnerships"],
        "currentGap": "Fragmented across 2 VPs — no unified pipeline or customer health view"
      },
      {
        "pod": "Product & Engineering Pod",
        "leader": "CTO + VP Product",
        "functions": ["Product Management", "Engineering", "AI/ML", "Platform / DevOps", "QA"],
        "currentGap": "AI team isolated from product roadmap process"
      },
      {
        "pod": "Operations Pod",
        "leader": "COO",
        "functions": ["Business Operations", "HR & People", "Legal", "Procurement", "Facilities"],
        "currentGap": "No COO — CEO managing all operational functions"
      }
    ],
    "orgAsciiChart": "CEO\\n├── COO\\n│    ├── HR & People\\n│    ├── Legal & Compliance\\n│    └── Business Ops\\n├── CTO\\n│    ├── VP Engineering\\n│    ├── Head of AI/ML\\n│    └── DevOps / Platform\\n├── CRO\\n│    ├── VP Enterprise Sales\\n│    ├── Head of RevOps\\n│    └── Head of Customer Success\\n└── CFO\\n     ├── FP&A\\n     └── Finance & Accounting"
  },
  "riskScores": {
    "structural": {"score": 72, "label": "High", "primaryDriver": "Missing COO and CRO creating operational SPOF"},
    "governance": {"score": 65, "label": "Medium-High", "primaryDriver": "Founder controls 6 direct functions — Series B governance misalignment"},
    "revenueExecution": {"score": 60, "label": "Medium-High", "primaryDriver": "Fragmented GTM without unified CRO governance"},
    "scaling": {"score": 55, "label": "Medium", "primaryDriver": "Engineering and CS capacity insufficient for 3x customer growth"},
    "aiDeployment": {"score": 70, "label": "High", "primaryDriver": "AI team operationally isolated — no MLOps or productionization layer"},
    "compliance": {"score": 75, "label": "High", "primaryDriver": "No dedicated compliance function — data privacy exposure at enterprise scale"}
  },
  "scalingReadinessScore": 58,
  "scalingReadinessClassification": "Institutionalizing but structurally fragmented",
  "scalingReadinessBreakdown": {
    "revenueStructure": 45,
    "productOrg": 65,
    "engineeringMaturity": 60,
    "aiMlReadiness": 40,
    "governanceStructure": 35,
    "internationalReadiness": 30,
    "operationalInfrastructure": 50,
    "talentBench": 55
  },
  "hiringPlan12Month": [
    {
      "quarter": "Q1",
      "role": "COO",
      "priority": "critical",
      "estimatedCost": "₹1.2–1.8 Cr CTC + 0.5–1% equity",
      "rationale": "Immediate: removes CEO from ops, enables governance restructure"
    },
    {
      "quarter": "Q1",
      "role": "CRO",
      "priority": "critical",
      "estimatedCost": "₹80L–1.2 Cr CTC + 0.3–0.6% equity",
      "rationale": "Immediate: consolidates revenue leadership, eliminates GTM fragmentation"
    },
    {
      "quarter": "Q2",
      "role": "Head of Customer Success",
      "priority": "high",
      "estimatedCost": "₹40–60L CTC",
      "rationale": "NRR protection. CS currently split between CRO and CTO."
    },
    {
      "quarter": "Q2",
      "role": "Head of RevOps",
      "priority": "high",
      "estimatedCost": "₹35–50L CTC",
      "rationale": "Pipeline integrity and sales forecasting at Series B scale."
    },
    {
      "quarter": "Q3",
      "role": "CFO / VP Finance",
      "priority": "high",
      "estimatedCost": "₹80L–1.2 Cr CTC",
      "rationale": "Series B governance requirement. Board will mandate this."
    },
    {
      "quarter": "Q3",
      "role": "VP Platform Engineering / DevOps",
      "priority": "medium",
      "estimatedCost": "₹50–80L CTC",
      "rationale": "Enables AI/ML productionization and engineering velocity."
    },
    {
      "quarter": "Q4",
      "role": "Head of Compliance",
      "priority": "medium",
      "estimatedCost": "₹35–55L CTC",
      "rationale": "Enterprise deals require SOC2, ISO27001, and data governance certifications."
    }
  ],
  "orgMigrationRoadmap": [
    {
      "phase": "Phase 1 — Stabilize (0–90 days)",
      "actions": [
        "Hire COO and CRO — begin search Day 1",
        "Define CEO scope: Vision, Board, External only",
        "Merge 2 sales VP structures under interim CRO",
        "Establish weekly leadership cadence with clear DRIs"
      ],
      "successMetrics": "CEO ops load reduced by 60%, single revenue number owned"
    },
    {
      "phase": "Phase 2 — Structure (90–180 days)",
      "actions": [
        "Launch Customer Success as dedicated function under CRO",
        "Build RevOps team: CRM hygiene, pipeline governance, forecasting",
        "Integrate AI/ML team into Engineering under unified CTO+COO governance",
        "Begin CFO search — target Series B governance readiness"
      ],
      "successMetrics": "NRR tracking established, pipeline forecast accuracy > 80%"
    },
    {
      "phase": "Phase 3 — Institutionalize (180–365 days)",
      "actions": [
        "CFO onboarded, FP&A function established",
        "Compliance function live — SOC2 audit initiated",
        "International expansion structure defined (MENA or SEA pod)",
        "Annual org health review process established"
      ],
      "successMetrics": "Series B governance checklist complete, institutional investor ready"
    }
  ]
}`,
    settings,
  );

  await updateAnalysis(analysisId, { investment_signals: extractJSON(text) }, 5);

  await query(
    `UPDATE analyses SET status = 'complete', pipeline_step = 5 WHERE id = $1`,
    [analysisId]
  );
}

// ── Run a single named step ───────────────────────────────────────────────────
export async function runStep(action: PipelineAction, analysisId: string, companyName: string): Promise<void> {
  await query(
    `UPDATE analyses SET status = 'processing', error_message = NULL WHERE id = $1`,
    [analysisId]
  );

  switch (action) {
    case 'profile':     await runProfileStep(analysisId, companyName); break;
    case 'competitors': await runCompetitorsStep(analysisId, companyName); break;
    case 'orgcharts':   await runOrgChartsStep(analysisId, companyName); break;
    case 'talent':      await runTalentStep(analysisId, companyName); break;
    case 'signals':     await runSignalsStep(analysisId, companyName); break;
  }
}
