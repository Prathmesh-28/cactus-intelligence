import { createClient } from 'jsr:@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LUSHA_API_KEY = Deno.env.get('LUSHA_API_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Lusha types ─────────────────────────────────────────────────────────────

interface LushaPerson {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  title?: string;
  jobTitle?: string;
  seniority?: string;
  department?: string;
  companyName?: string;
  linkedInUrl?: string;
  linkedinUrl?: string;
}

interface LushaCompany {
  name?: string;
  employeeCount?: string | number;
  employeeRange?: string;
  industry?: string;
  domain?: string;
}

// ─── Lusha helpers ───────────────────────────────────────────────────────────

/**
 * Search for employees at a company by seniority level.
 * Tries both /v2/person/search (paginated) and /v2/persons (alternate endpoint).
 */
async function lushaSearchPeople(
  companyName: string,
  seniority: string,
  limit = 20
): Promise<LushaPerson[]> {
  // Try primary endpoint
  const url = new URL('https://api.lusha.com/v2/person/search');
  url.searchParams.set('company_name', companyName);
  url.searchParams.set('seniority', seniority);
  url.searchParams.set('limit', String(limit));

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'api_key': LUSHA_API_KEY,
        'Accept': 'application/json',
      },
    });
    if (res.ok) {
      const body = await res.json();
      // Handle multiple response shapes Lusha may return
      const contacts: LushaPerson[] =
        body?.data?.contacts ??
        body?.data?.results ??
        body?.contacts ??
        body?.results ??
        (Array.isArray(body?.data) ? body.data : []);
      return contacts;
    }
  } catch {
    // fall through to alternate endpoint
  }

  // Alternate endpoint
  try {
    const url2 = new URL('https://api.lusha.com/api/person/search');
    url2.searchParams.set('company', companyName);
    url2.searchParams.set('seniority', seniority);
    url2.searchParams.set('pageSize', String(limit));
    const res2 = await fetch(url2.toString(), {
      headers: { 'api_key': LUSHA_API_KEY, 'Accept': 'application/json' },
    });
    if (res2.ok) {
      const body2 = await res2.json();
      return body2?.contacts ?? body2?.data?.contacts ?? body2?.results ?? [];
    }
  } catch {
    // ignore
  }

  return [];
}

/**
 * Fetch company-level data (employee count, industry) from Lusha.
 */
async function lushaGetCompany(companyName: string): Promise<LushaCompany | null> {
  try {
    const url = new URL('https://api.lusha.com/v2/company');
    url.searchParams.set('name', companyName);
    const res = await fetch(url.toString(), {
      headers: { 'api_key': LUSHA_API_KEY, 'Accept': 'application/json' },
    });
    if (res.ok) {
      const body = await res.json();
      return body?.data ?? body ?? null;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Pull all C-suite, VP, and Director-level people from Lusha for a company.
 * Returns a deduplicated list sorted by seniority.
 */
async function fetchLushaOrgData(companyName: string): Promise<{
  people: LushaPerson[];
  company: LushaCompany | null;
}> {
  const [cSuite, vps, directors, company] = await Promise.all([
    lushaSearchPeople(companyName, 'c_level', 20),
    lushaSearchPeople(companyName, 'vp', 20),
    lushaSearchPeople(companyName, 'director', 20),
    lushaGetCompany(companyName),
  ]);

  // Deduplicate by full name
  const seen = new Set<string>();
  const people: LushaPerson[] = [];
  for (const p of [...cSuite, ...vps, ...directors]) {
    const name = (p.fullName ?? `${p.firstName ?? ''} ${p.lastName ?? ''}`).trim();
    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      people.push(p);
    }
  }

  return { people, company };
}

/**
 * Format Lusha people into a concise string for the Claude prompt.
 */
function formatLushaContext(people: LushaPerson[], company: LushaCompany | null): string {
  if (people.length === 0) return '';

  const lines = people.map(p => {
    const name = p.fullName ?? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
    const title = p.title ?? p.jobTitle ?? 'Unknown Title';
    const dept = p.department ? ` [${p.department}]` : '';
    const linkedin = p.linkedInUrl ?? p.linkedinUrl ? ` — LinkedIn: ${p.linkedInUrl ?? p.linkedinUrl}` : '';
    return `  - ${name} · ${title}${dept}${linkedin}`;
  });

  const companyLine = company
    ? `Company data from Lusha: employees ≈ ${company.employeeCount ?? company.employeeRange ?? 'unknown'}, industry: ${company.industry ?? 'unknown'}\n`
    : '';

  return `${companyLine}Verified employees from Lusha (${people.length} found):\n${lines.join('\n')}`;
}

// ─── Anthropic helper ────────────────────────────────────────────────────────

async function callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'web-search-2025-03-05',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const textBlocks = data.content?.filter((b: { type: string }) => b.type === 'text') ?? [];
  return textBlocks.map((b: { text: string }) => b.text).join('\n');
}

function extractJSON(text: string): unknown {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch {}
  }
  const objMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (objMatch) {
    try { return JSON.parse(objMatch[1]); } catch {}
  }
  throw new Error('Could not extract JSON from Claude response');
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: {
      analysisId: string;
      action: 'profile' | 'competitors' | 'orgcharts' | 'talent' | 'signals';
      companyName: string;
    } = await req.json();
    const { analysisId, action, companyName } = body;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: analysis } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .single();

    let updatePayload: Record<string, unknown> = {};

    // ── Step 1: Company profile ──────────────────────────────────────────────
    if (action === 'profile') {
      const text = await callClaude(
        'You are a VC research analyst. Always respond with valid JSON only — no explanation, no markdown outside code fences.',
        `Research the company "${companyName}". Find: full legal name, headquarters, founding year, industry/sector, estimated employee count, funding stage and total raised, key products/services, primary markets, current CEO name and background, and recent major news (up to 5 items). Return ONLY:
{
  "name": "string",
  "legalName": "string",
  "hq": "string",
  "founded": number,
  "sector": "string",
  "subSector": "string",
  "employeeCount": "string",
  "fundingStage": "string",
  "totalRaised": "string",
  "ceo": "string",
  "description": "string",
  "keyProducts": ["string"],
  "markets": ["string"],
  "recentNews": [{"headline": "string", "date": "string", "url": "string"}]
}`
      );
      updatePayload = { company_profile: extractJSON(text) };

    // ── Step 2: Competitors ──────────────────────────────────────────────────
    } else if (action === 'competitors') {
      const sector = analysis?.company_profile?.sector ?? 'technology';
      const text = await callClaude(
        'You are a VC research analyst. Always respond with valid JSON only.',
        `Identify the top 5 direct competitors of "${companyName}" in the "${sector}" space. For each, find: name, HQ, founding year, estimated employees, funding stage, total raised, CEO, key differentiator, market position, and threatLevel ("high"|"medium"|"low"). Return ONLY:
{"competitors":[{"rank":1,"name":"string","hq":"string","founded":0,"employees":"string","fundingStage":"string","totalRaised":"string","ceo":"string","differentiator":"string","marketPosition":"string","threatLevel":"high"}]}`
      );
      updatePayload = { competitors: extractJSON(text) };

    // ── Step 3: Org charts (Lusha + Claude) ──────────────────────────────────
    } else if (action === 'orgcharts') {
      const competitors = (analysis?.competitors?.competitors ?? []) as Array<{ name: string }>;
      const allCompanies = [companyName, ...competitors.map((c) => c.name)];
      const orgCharts: Record<string, unknown> = {};
      const today = new Date().toISOString().split('T')[0];

      for (const company of allCompanies) {
        try {
          // 1. Pull verified employee data from Lusha
          const { people, company: companyData } = await fetchLushaOrgData(company);
          const lushaContext = formatLushaContext(people, companyData);

          // 2. Ask Claude to structure real data + fill gaps via web search
          const lushaSection = lushaContext
            ? `\n\nVERIFIED DATA FROM LUSHA (treat these names/titles as confirmed):\n${lushaContext}\n`
            : '\n\n(No Lusha data available — infer from web search.)\n';

          const text = await callClaude(
            'You are a VC research analyst building a verified org chart. Always respond with valid JSON only. When Lusha data is provided, use those exact names and titles. Mark their confidence as "confirmed". For positions not covered by Lusha, search the web and mark as "inferred" or "estimated".',
            `Build the org chart for "${company}".${lushaSection}
Using the verified Lusha employees above plus web research, build a complete org tree covering C-Suite and VP/Director level. Infer the reporting hierarchy logically (e.g. CTO, CFO, COO, CMO, CPO report to CEO; Engineering VPs report to CTO, etc.). For each person, add tenure (years at company if findable), previous company, and LinkedIn URL if known.

Return ONLY this JSON (no extra text):
{
  "company": "${company}",
  "lastUpdated": "${today}",
  "totalEmployees": "${companyData?.employeeCount ?? companyData?.employeeRange ?? 'Unknown'}",
  "orgTree": {
    "id": "ceo",
    "name": "string",
    "title": "CEO",
    "tenure": "string",
    "previousCompany": "string",
    "confidence": "confirmed",
    "department": "Executive",
    "linkedinUrl": "string or null",
    "children": [
      {
        "id": "cto",
        "name": "string",
        "title": "CTO",
        "tenure": "string",
        "previousCompany": "string",
        "confidence": "confirmed",
        "department": "Engineering",
        "teamSize": 0,
        "linkedinUrl": "string or null",
        "children": []
      }
    ]
  },
  "recentChanges": [{"type": "join", "name": "string", "title": "string", "date": "string"}],
  "openRoles": ["string"]
}`
          );

          const json = extractJSON(text) as Record<string, unknown>;
          // Attach raw Lusha count for reference
          if (companyData?.employeeCount) {
            (json as Record<string, unknown>).lushaEmployeeCount = companyData.employeeCount;
          }
          orgCharts[company] = json;

        } catch (_err) {
          // Graceful fallback — partial data is better than no data
          orgCharts[company] = {
            company,
            lastUpdated: today,
            totalEmployees: 'Unknown',
            orgTree: {
              id: 'ceo', name: 'Unknown', title: 'CEO',
              confidence: 'estimated', department: 'Executive', children: [],
            },
            recentChanges: [],
            openRoles: [],
          };
        }
      }
      updatePayload = { org_charts: orgCharts };

    // ── Step 4: Talent intelligence ──────────────────────────────────────────
    } else if (action === 'talent') {
      const competitors = (analysis?.competitors?.competitors ?? []) as Array<{ name: string }>;
      const competitorList = competitors.map((c) => c.name).join(', ');

      const text = await callClaude(
        'You are a VC talent intelligence analyst. Always respond with valid JSON only.',
        `Analyse talent intelligence for "${companyName}" vs competitors: ${competitorList}. Return ONLY:
{
  "talentGaps": [{"role":"string","company":"string","severity":"critical|moderate|minor"}],
  "keyManRisk": [{"name":"string","title":"string","company":"string","riskLevel":"high|medium|low","reason":"string"}],
  "hiringVelocity": [{"company":"string","trend":"growing|stable|shrinking","growthRate":"string"}],
  "leadershipQuality": [{"company":"string","score":0,"tier1Percentage":0}],
  "poachingRisk": [{"name":"string","title":"string","company":"string","reason":"string"}],
  "hiringRecommendations": [{"role":"string","urgency":"immediate|near-term|strategic","rationale":"string"}]
}`
      );
      updatePayload = { talent_insights: extractJSON(text) };

    // ── Step 5: Investment signals ───────────────────────────────────────────
    } else if (action === 'signals') {
      const competitors = (analysis?.competitors?.competitors ?? []) as Array<{ name: string }>;
      const competitorList = competitors.map((c) => c.name).join(', ');

      const text = await callClaude(
        'You are a senior VC analyst at Cactus Partners, an India-focused VC backing advanced manufacturing, technology, and consumer companies. Always respond with valid JSON only.',
        `Analyse "${companyName}" against competitors: ${competitorList}. Return ONLY:
{
  "signal": "GO|HOLD|PASS",
  "confidence": 0,
  "bullCase": [{"point":"string","detail":"string"}],
  "bearCase": [{"point":"string","detail":"string"}],
  "moat": {"rating":"Strong|Moderate|Weak","reasoning":"string"},
  "teamScore": 0,
  "teamScoreJustification": "string",
  "talentTrajectory": "Improving|Stable|Declining",
  "dueDiligence": [{"item":"string"}],
  "comparableExits": [{"company":"string","exitType":"string","exitValue":"string","year":"string"}]
}`
      );
      updatePayload = { investment_signals: extractJSON(text) };
    }

    const { error: updateErr } = await supabase
      .from('analyses')
      .update(updatePayload)
      .eq('id', analysisId);

    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ success: true, action }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });

  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } }
    );
  }
});
