import { Router } from 'express';
import { verifyToken } from '../middleware/auth';
import type { AuthRequest } from '../types';
import { callAI, extractJSON } from '../services/aiProvider';
import { query } from '../db/client';

export const investorAnalysisRouter = Router();

const IDEAL_ORGS: Record<string, { critical_roles: string[]; level_kpis: Record<number, string[]> }> = {
  fintech: {
    critical_roles: ['Chief Risk Officer','Chief Compliance Officer','CISO','Chief Data Officer','Chief Product Officer','Chief Operating Officer','VP Customer Success','Head of Partnerships','General Counsel','Head of Growth','ML/AI Lead','Head of Regulatory Affairs'],
    level_kpis: {
      0: ['Company OKRs','Investor relations','Board reporting','Capital allocation','Strategic vision','Culture & values'],
      1: ['Departmental OKRs','Team health score','Budget ownership','Quarterly roadmap delivery','Talent pipeline','Cross-functional alignment'],
      2: ['Sprint velocity','Hiring plan execution','Revenue targets','Churn metrics','Feature delivery','Team engagement'],
      3: ['Individual OKRs','Code quality / test coverage','Deal pipeline','Customer NPS contribution','Upskilling goals'],
    },
  },
  saas: {
    critical_roles: ['Chief Product Officer','VP Customer Success','Head of Growth','VP Engineering','Chief Revenue Officer','Head of Solutions Engineering','Head of Partnerships','Chief Operating Officer','CISO','Head of Data Analytics'],
    level_kpis: {
      0: ['ARR/MRR growth','Net churn','NPS','Fundraising','Strategic partnerships','Company OKRs'],
      1: ['Departmental KPIs','Headcount plan','Revenue quota','Product roadmap delivery','Customer retention'],
      2: ['Feature adoption','CAC/LTV','Support ticket resolution','Sprint delivery','Quota attainment'],
      3: ['Individual OKRs','Deal closed/pipeline','Bug rate','Customer calls/week','Docs contribution'],
    },
  },
  ecommerce: {
    critical_roles: ['VP Supply Chain','Head of Logistics','Chief Marketing Officer','Head of Merchandising','VP Customer Experience','Head of Data & Analytics','Head of Payments','Head of Seller Success'],
    level_kpis: {
      0: ['GMV growth','Contribution margin','Brand NPS','Strategic vision','Investor KPIs'],
      1: ['Department OKRs','Budget ownership','Quarterly targets','Team retention'],
      2: ['Conversion rate','ROAS','Fulfillment SLA','Inventory turn'],
      3: ['Individual OKRs','Task completion','Campaign metrics'],
    },
  },
  healthtech: {
    critical_roles: ['Chief Medical Officer','Head of Regulatory Affairs','Head of Clinical Operations','CISO','Chief Product Officer','VP Customer Success','Head of Compliance','Medical Affairs Lead'],
    level_kpis: {
      0: ['Regulatory clearances','Patient outcomes','Clinical KPIs','Fundraising','Strategic partnerships'],
      1: ['Clinical trial progress','Compliance audits','Product roadmap','Team retention'],
      2: ['Patient acquisition','Clinical efficacy metrics','Feature delivery','Support SLA'],
      3: ['Individual OKRs','Case completion','Patient feedback','Clinical documentation'],
    },
  },
  deeptech: {
    critical_roles: ['Chief Scientist','Head of Research','VP Engineering','Head of IP/Patents','Chief Product Officer','Head of Partnerships','Head of Hardware','VP Sales'],
    level_kpis: {
      0: ['R&D milestones','IP portfolio','Strategic partnerships','Fundraising','Technology roadmap'],
      1: ['Research output','Patent filings','Product roadmap delivery','Team retention'],
      2: ['Experiment velocity','Model accuracy','Feature delivery','Customer pilots'],
      3: ['Individual OKRs','Research publications','Code quality','Customer feedback'],
    },
  },
  logistics: {
    critical_roles: ['Chief Operations Officer','VP Supply Chain','Head of Technology','Head of Compliance','VP Sales','Head of Fleet/Last-mile','Head of Data Analytics','Head of Customer Success'],
    level_kpis: {
      0: ['Network efficiency','Cost per delivery','Strategic growth','Fundraising','Regulatory compliance'],
      1: ['Operational KPIs','SLA attainment','Budget ownership','Team retention'],
      2: ['On-time delivery rate','Route optimization','Customer satisfaction','Fleet utilization'],
      3: ['Individual OKRs','Delivery accuracy','Customer feedback','Incident resolution'],
    },
  },
};

function getIdeal(industry: string) {
  return IDEAL_ORGS[industry] ?? IDEAL_ORGS['saas'];
}

function flattenTree(node: Record<string, unknown>, out: Record<string, unknown>[] = []): Record<string, unknown>[] {
  out.push(node);
  const children = node.children as Record<string, unknown>[] | undefined;
  if (children?.length) children.forEach(c => flattenTree(c, out));
  return out;
}

function inferLevel(title: string): number {
  const t = title.toLowerCase();
  if (/chief|ceo|cto|cfo|coo|cro|cpo|president|co-founder|founder/.test(t)) return 0;
  if (/\bvp\b|vice president|head of|director of|svp|evp/.test(t)) return 1;
  if (/manager|lead|principal|staff/.test(t)) return 2;
  return 3;
}

function inferDept(title: string): string {
  const t = title.toLowerCase();
  if (/engineer|tech|dev|cto|architect|data|ml|ai|cloud|infra|devops/.test(t)) return 'Engineering';
  if (/product|pm|ux|design/.test(t)) return 'Product';
  if (/sales|account|revenue|cro|business dev/.test(t)) return 'Sales';
  if (/market|growth|brand|content|seo|demand/.test(t)) return 'Marketing';
  if (/finance|cfo|accounting|treasury/.test(t)) return 'Finance';
  if (/hr|people|talent|recruit|culture/.test(t)) return 'HR';
  if (/ceo|coo|president|founder/.test(t)) return 'Executive';
  if (/legal|counsel|compliance|risk/.test(t)) return 'Legal/Compliance';
  if (/customer|success|support/.test(t)) return 'Customer Success';
  if (/ops|operation/.test(t)) return 'Operations';
  return 'General';
}

// POST /api/investor-analysis
investorAnalysisRouter.post('/', verifyToken, async (req: AuthRequest, res) => {
  const { orgTree, industry, companyName, domain } = req.body as {
    orgTree: Record<string, unknown>;
    industry: string;
    companyName: string;
    domain?: string;
  };

  if (!orgTree || !industry || !companyName) {
    res.status(400).json({ error: 'orgTree, industry, and companyName are required' });
    return;
  }

  const settingsRows = await query<{ key: string; value: unknown }>('SELECT key, value FROM settings');
  const settings = Object.fromEntries(settingsRows.map(r => [r.key, r.value]));

  const ideal = getIdeal(industry);
  const people = flattenTree(orgTree);

  // Match ideal roles against actual titles
  const titles = people.map(p => ((p.title as string) ?? '').toLowerCase());
  const matchedRoles = ideal.critical_roles.map(role => {
    const keywords = role.toLowerCase().split(/[\s\/,]+/).filter(w => w.length > 3);
    const present = keywords.some(kw => titles.some(t => t.includes(kw)));
    const partial = !present && keywords.some(kw =>
      titles.some(t => [...kw].filter(c => t.includes(c)).length / kw.length > 0.7)
    );
    return { role, present, partial: !present && partial };
  });

  const presentCount = matchedRoles.filter(r => r.present).length;
  const partialCount = matchedRoles.filter(r => r.partial).length;
  const completeness = Math.round(((presentCount + partialCount * 0.5) / matchedRoles.length) * 100);
  const levels = [...new Set(people.map(p => inferLevel(String(p.title ?? ''))))].length;
  const depts = [...new Set(people.map(p => inferDept(String(p.title ?? ''))))].length;
  const ceoDirectReports = people.filter(p => inferLevel(String(p.title ?? '')) === 1).length;
  const spanScore = ceoDirectReports >= 3 && ceoDirectReports <= 8 ? 100 : 70;
  const overallScore = Math.round(completeness * 0.5 + spanScore * 0.25 + Math.min(depts, 8) / 8 * 100 * 0.25);

  const missingRoles = matchedRoles.filter(r => !r.present && !r.partial).map(r => r.role);
  const peopleList = people
    .map(p => `- ${p.name ?? 'Unknown'} | ${p.title ?? ''} | Level ${inferLevel(String(p.title ?? ''))} | ${inferDept(String(p.title ?? ''))}`)
    .join('\n');

  const prompt = `You are a senior VC investor and org design expert conducting pre-investment due diligence.

COMPANY: ${companyName} | SECTOR: ${industry} | PEOPLE: ${people.length}
${domain ? `DOMAIN: ${domain}` : ''}

ORG STRUCTURE:
${peopleList}

MISSING CRITICAL ROLES (vs ideal ${industry} benchmark):
${missingRoles.join(', ') || 'None identified'}

SCORES: Completeness ${completeness}%, Overall Health ${overallScore}%, Levels ${levels}, Depts ${depts}, CEO span ${ceoDirectReports}

Return ONLY this exact JSON (no markdown):
{
  "executive_summary": "2-3 sentence investor-focused summary",
  "investment_signals": [
    {"type": "positive|warning|critical", "title": "short title", "detail": "1-2 sentence insight"}
  ],
  "level_analysis": [
    {"level": 0, "label": "C-Suite", "strength": "...", "gap": "...", "missing_kpis": ["kpi1", "kpi2", "kpi3"]},
    {"level": 1, "label": "VP/Director", "strength": "...", "gap": "...", "missing_kpis": ["kpi1", "kpi2", "kpi3"]},
    {"level": 2, "label": "Manager/Lead", "strength": "...", "gap": "...", "missing_kpis": ["kpi1", "kpi2", "kpi3"]},
    {"level": 3, "label": "Individual Contributor", "strength": "...", "gap": "...", "missing_kpis": ["kpi1", "kpi2"]}
  ],
  "person_analysis": [
    {"name": "exact name from list", "title": "their title", "responsibility_gap": "specific gap for this person", "missing_kpis": ["kpi1", "kpi2"], "risk": "low|medium|high", "note": "one-sentence investor note"}
  ],
  "top_actions": ["action 1 — specific hire or restructure", "action 2", "action 3"],
  "verdict": "pass|watchlist|concern",
  "verdict_reason": "one sentence with specific reasoning"
}`;

  try {
    const raw = await callAI(
      'You are a VC investor and org design expert. Return only valid JSON, no markdown.',
      prompt,
      settings
    );
    const analysis = extractJSON(raw) as Record<string, unknown>;

    res.json({
      analysis,
      scores: { completeness, overallScore, levels, depts, ceoDirectReports, spanScore },
      matchedRoles,
      missingRoles,
      levelKpis: ideal.level_kpis,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Analysis failed' });
  }
});
