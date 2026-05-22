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

// ── Step 1: Company Profile ───────────────────────────────────
export async function runProfileStep(analysisId: string, companyName: string): Promise<void> {
  const settings = await getSettings();

  const text = await callAI(
    'You are a VC research analyst. Always respond with valid JSON only — no prose outside code fences.',
    `Research the company "${companyName}". Return ONLY valid JSON:
{
  "name":"string","legalName":"string","hq":"string","founded":0,
  "sector":"string","subSector":"string","employeeCount":"string",
  "fundingStage":"string","totalRaised":"string","ceo":"string",
  "description":"string","keyProducts":["string"],"markets":["string"],
  "recentNews":[{"headline":"string","date":"string","url":"string"}]
}`,
    settings,
  );
  await updateAnalysis(analysisId, { company_profile: extractJSON(text) }, 1);
}

// ── Step 2: Competitors ───────────────────────────────────────
export async function runCompetitorsStep(analysisId: string, companyName: string): Promise<void> {
  const settings = await getSettings();
  const maxComp = Number(settings['max_competitors'] ?? 5);

  const analysis = await queryOne<DbAnalysis>('SELECT company_profile FROM analyses WHERE id = $1', [analysisId]);
  const sector = (analysis?.company_profile as Record<string, string>)?.sector ?? 'technology';

  const text = await callAI(
    'You are a VC research analyst. Always respond with valid JSON only.',
    `Identify the top ${maxComp} direct competitors of "${companyName}" in the "${sector}" space.
Return ONLY: {"competitors":[{"rank":1,"name":"string","hq":"string","founded":0,"employees":"string","fundingStage":"string","totalRaised":"string","ceo":"string","differentiator":"string","marketPosition":"string","threatLevel":"high|medium|low"}]}`,
    settings,
  );
  await updateAnalysis(analysisId, { competitors: extractJSON(text) }, 2);
}

// ── Step 3: Org Charts (Lusha + Claude) ───────────────────────
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
        ? `\n\nVERIFIED DATA FROM LUSHA (mark these as confidence "confirmed"):\n${lushaContext}\n`
        : '\n\n(No Lusha data — infer from web search; mark as "inferred" or "estimated".)\n';

      const text = await callAI(
        'You are a VC research analyst. Use Lusha-verified people as "confirmed". Fill gaps via web search, mark as "inferred" or "estimated". Always respond with valid JSON only.',
        `Build the org chart for "${company}".${lushaSection}
Build a complete org tree (C-Suite + VP/Director level) with correct reporting hierarchy.
Return ONLY:
{
  "company":"${company}","lastUpdated":"${today}","totalEmployees":"${employeeCount}",
  "orgTree":{
    "id":"ceo","name":"string","title":"CEO","tenure":"string","previousCompany":"string",
    "confidence":"confirmed","department":"Executive","linkedinUrl":null,
    "children":[{
      "id":"cto","name":"string","title":"CTO","tenure":"string","previousCompany":"string",
      "confidence":"confirmed","department":"Engineering","teamSize":0,"linkedinUrl":null,"children":[]
    }]
  },
  "recentChanges":[{"type":"join","name":"string","title":"string","date":"string"}],
  "openRoles":["string"]
}`,
        settings,
      );
      orgCharts[company] = extractJSON(text);
    } catch {
      orgCharts[company] = {
        company, lastUpdated: today, totalEmployees: 'Unknown',
        orgTree: { id: 'ceo', name: 'Unknown', title: 'CEO', confidence: 'estimated', department: 'Executive', children: [] },
        recentChanges: [], openRoles: [],
      };
    }
  }

  await updateAnalysis(analysisId, { org_charts: orgCharts }, 3);
}

// ── Step 4: Talent Intelligence ───────────────────────────────
export async function runTalentStep(analysisId: string, companyName: string): Promise<void> {
  const settings = await getSettings();
  const analysis = await queryOne<DbAnalysis>('SELECT competitors FROM analyses WHERE id = $1', [analysisId]);
  const competitors = ((analysis?.competitors as Record<string, unknown>)?.competitors as Array<{ name: string }>) ?? [];
  const competitorList = competitors.map(c => c.name).join(', ');

  const text = await callAI(
    'You are a VC talent intelligence analyst. Always respond with valid JSON only.',
    `Analyse talent intelligence for "${companyName}" vs competitors: ${competitorList}.
Return ONLY:
{
  "talentGaps":[{"role":"string","company":"string","severity":"critical|moderate|minor"}],
  "keyManRisk":[{"name":"string","title":"string","company":"string","riskLevel":"high|medium|low","reason":"string"}],
  "hiringVelocity":[{"company":"string","trend":"growing|stable|shrinking","growthRate":"string"}],
  "leadershipQuality":[{"company":"string","score":0,"tier1Percentage":0}],
  "poachingRisk":[{"name":"string","title":"string","company":"string","reason":"string"}],
  "hiringRecommendations":[{"role":"string","urgency":"immediate|near-term|strategic","rationale":"string"}]
}`,
    settings,
  );
  await updateAnalysis(analysisId, { talent_insights: extractJSON(text) }, 4);
}

// ── Step 5: Investment Signals ────────────────────────────────
export async function runSignalsStep(analysisId: string, companyName: string): Promise<void> {
  const settings = await getSettings();
  const investmentFocus = (settings['investment_focus'] as string) ?? 'India-focused VC';
  const analysis = await queryOne<DbAnalysis>('SELECT competitors FROM analyses WHERE id = $1', [analysisId]);
  const competitors = ((analysis?.competitors as Record<string, unknown>)?.competitors as Array<{ name: string }>) ?? [];
  const competitorList = competitors.map(c => c.name).join(', ');

  const text = await callAI(
    `You are a senior VC analyst (${investmentFocus}). Always respond with valid JSON only.`,
    `Analyse "${companyName}" against competitors: ${competitorList}. Provide GO/HOLD/PASS signal.
Return ONLY:
{
  "signal":"GO|HOLD|PASS","confidence":0,
  "bullCase":[{"point":"string","detail":"string"}],
  "bearCase":[{"point":"string","detail":"string"}],
  "moat":{"rating":"Strong|Moderate|Weak","reasoning":"string"},
  "teamScore":0,"teamScoreJustification":"string",
  "talentTrajectory":"Improving|Stable|Declining",
  "dueDiligence":[{"item":"string"}],
  "comparableExits":[{"company":"string","exitType":"string","exitValue":"string","year":"string"}]
}`,
    settings,
  );
  await updateAnalysis(analysisId, { investment_signals: extractJSON(text) }, 5);

  // Mark complete
  await query(
    `UPDATE analyses SET status = 'complete', pipeline_step = 5 WHERE id = $1`,
    [analysisId]
  );
}

// ── Run a single named step ───────────────────────────────────
export async function runStep(action: PipelineAction, analysisId: string, companyName: string): Promise<void> {
  // Mark as processing
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
