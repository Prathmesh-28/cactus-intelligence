import { Router } from 'express';
import { verifyToken } from '../middleware/auth';
import type { AuthRequest } from '../types';
import { callAI, extractJSON } from '../services/aiProvider';
import { getCompanyByDomain, enrichPerson, batchEnrich, formatLushaContext, extractDomain } from '../services/lusha';
import { query } from '../db/client';

export const orgFromLinkedinRouter = Router();

interface CompanyInput {
  name: string;
  linkedinUrl: string;
  website?: string;
}

// Extract slug from a LinkedIn company URL
function linkedinSlug(url: string): string {
  const m = url.match(/linkedin\.com\/company\/([^/?#]+)/i);
  return m ? m[1] : '';
}

// Slug → display name: "kapture-cx" → "Kapture CX"
function slugToName(slug: string): string {
  return slug.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

async function buildOrgChart(
  company: CompanyInput,
  settings: Record<string, unknown>,
  lushaEnabled: boolean
): Promise<Record<string, unknown>> {
  const today = new Date().toISOString().split('T')[0];
  let employeeCount = 'Unknown';
  let lushaContext = '';

  const domain = company.website ? extractDomain(company.website) : '';

  if (lushaEnabled && domain) {
    try {
      const companyData = await getCompanyByDomain(domain);
      if (companyData?.companySize) {
        employeeCount = `${companyData.companySize[0]}–${companyData.companySize[1]}`;
      }

      // Phase 2: mini-prompt to get CEO name → then Lusha-enrich
      const miniPrompt = await callAI(
        'You are a research assistant. Return ONLY a JSON array of objects.',
        `What are the known CEO/founder and top 2-3 C-suite names at "${company.name}"?
LinkedIn page: ${company.linkedinUrl}
Return ONLY: [{"firstName":"X","lastName":"Y"},...]  — max 4 people.`,
        settings
      );
      const names = extractJSON(miniPrompt) as Array<{ firstName: string; lastName: string }> | null;
      if (Array.isArray(names) && names.length > 0 && domain) {
        const enriched = await batchEnrich(names, domain, 4);
        if (enriched.size > 0 || companyData) {
          lushaContext = formatLushaContext([...enriched.values()], companyData ?? null);
        }
      }
    } catch {
      // Lusha enrichment optional — continue without it
    }
  }

  const lushaSection = lushaContext
    ? `\n\nVERIFIED LUSHA DATA — mark these people as confidence "confirmed":\n${lushaContext}\n`
    : '\n\n(No Lusha data — infer executives from the LinkedIn company page, company website, and press releases. Mark as "inferred" or "estimated".)\n';

  const text = await callAI(
    `You are a VC Operating Partner building institutional-grade org intelligence.
RULES:
1. Use the LinkedIn company page URL as your PRIMARY source.
2. Do NOT hallucinate people. Every name must be verifiable.
3. Unknown people: use title only with name "Unknown", confidence "estimated".
4. IDs must be unique slugs: "ceo", "cto", "vp-eng", etc.
5. Max depth 4 levels. Every node MUST have "children": [].
6. Respond with valid JSON ONLY.`,

    `Build the org chart for "${company.name}".
LinkedIn company page: ${company.linkedinUrl}
${company.website ? `Website: ${company.website}` : ''}
${lushaSection}

Use LinkedIn People search on that company page, leadership/team pages, job postings, and press releases.

Return ONLY this JSON:
{
  "company": "${company.name}",
  "linkedinUrl": "${company.linkedinUrl}",
  "lastUpdated": "${today}",
  "totalEmployees": "${employeeCount}",
  "orgMaturityScore": 58,
  "orgMaturityClassification": "Scaling",
  "functionScores": {
    "product": 55, "engineering": 65, "aiMl": 40,
    "operations": 50, "sales": 60, "customerSuccess": 45,
    "marketing": 35, "finance": 50, "hr": 30, "compliance": 25
  },
  "orgTree": {
    "id": "ceo",
    "name": "Name or Unknown",
    "title": "CEO",
    "tenure": "X years",
    "previousCompany": null,
    "confidence": "confirmed",
    "department": "Executive",
    "teamSize": 0,
    "linkedinUrl": "https://linkedin.com/in/... or null",
    "children": []
  },
  "structuralFlags": {
    "founderDependencies": [],
    "reportingConflicts": [],
    "titleInflation": []
  },
  "recentChanges": [],
  "openRoles": []
}`,
    settings
  );

  return (extractJSON(text) ?? {
    company: company.name,
    linkedinUrl: company.linkedinUrl,
    lastUpdated: today,
    totalEmployees: employeeCount,
    orgMaturityScore: 0,
    orgMaturityClassification: 'Unknown',
    functionScores: {} as Record<string, unknown>,
    orgTree: { id: 'ceo', name: 'Unknown', title: 'CEO', confidence: 'estimated', department: 'Executive', children: [] as unknown[] },
    structuralFlags: {} as Record<string, unknown>,
    recentChanges: [] as unknown[],
    openRoles: [] as string[],
  }) as Record<string, unknown>;
}

// ── POST /api/org-from-linkedin ───────────────────────────────
orgFromLinkedinRouter.post('/', verifyToken, async (req: AuthRequest, res) => {
  const { target, competitors = [] } = req.body as {
    target: CompanyInput;
    competitors: CompanyInput[];
  };

  if (!target?.linkedinUrl) {
    res.status(400).json({ error: 'target.linkedinUrl is required' });
    return;
  }

  // Fill in name from LinkedIn slug if not provided
  if (!target.name) {
    target.name = slugToName(linkedinSlug(target.linkedinUrl)) || 'Target Company';
  }
  const allCompanies: CompanyInput[] = [target, ...competitors.slice(0, 5).map(c => ({
    ...c,
    name: c.name || slugToName(linkedinSlug(c.linkedinUrl)) || 'Competitor',
  }))];

  try {
    const settingsRows = await query<{ key: string; value: unknown }>('SELECT key, value FROM settings');
    const settings = Object.fromEntries(settingsRows.map(r => [r.key, r.value]));
    const lushaEnabled = settings['lusha_enabled'] !== false;

    // Build org charts in parallel (max 6 companies)
    const results = await Promise.allSettled(
      allCompanies.map(c => buildOrgChart(c, settings, lushaEnabled))
    );

    const orgCharts: Record<string, unknown> = {};
    results.forEach((r, i) => {
      orgCharts[allCompanies[i].name] = r.status === 'fulfilled'
        ? (r.value as unknown as Record<string, unknown>)
        : ({ company: allCompanies[i].name, error: 'Failed to build org chart', orgTree: null } as Record<string, unknown>);
    });

    res.json({ orgCharts, companyNames: allCompanies.map(c => c.name) });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to build org charts' });
  }
});
