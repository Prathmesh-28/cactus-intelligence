const LUSHA_API_KEY = process.env.LUSHA_API_KEY!;
const LUSHA_BASE = 'https://api.lusha.com';

interface LushaPerson {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  title?: string;
  jobTitle?: string;
  seniority?: string;
  department?: string;
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

async function lushaGet(path: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(`${LUSHA_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { 'api_key': LUSHA_API_KEY, 'Accept': 'application/json' },
  });

  if (!res.ok) return null;
  return res.json();
}

async function searchPeopleBySeniority(companyName: string, seniority: string): Promise<LushaPerson[]> {
  // Try v2 endpoint first
  const body = await lushaGet('/v2/person/search', {
    company_name: companyName,
    seniority,
    limit: '25',
  }) as Record<string, unknown> | null;

  if (body) {
    const contacts = (body?.data as Record<string, unknown>)?.contacts
      ?? body?.contacts
      ?? body?.results
      ?? (Array.isArray(body?.data) ? body?.data : []);
    if (Array.isArray(contacts) && contacts.length > 0) return contacts as LushaPerson[];
  }

  // Fallback: alternate path
  const body2 = await lushaGet('/api/person/search', {
    company: companyName,
    seniority,
    pageSize: '25',
  }) as Record<string, unknown> | null;

  const contacts2 = (body2 as Record<string, unknown>)?.contacts ?? (body2 as Record<string, unknown>)?.results ?? [];
  return Array.isArray(contacts2) ? (contacts2 as LushaPerson[]) : [];
}

export async function fetchOrgData(
  companyName: string,
  seniorityLevels = ['c_level', 'vp', 'director']
): Promise<{ people: LushaPerson[]; company: LushaCompany | null }> {
  const [companyBody, ...peopleBySeniority] = await Promise.all([
    lushaGet('/v2/company', { name: companyName }),
    ...seniorityLevels.map(s => searchPeopleBySeniority(companyName, s)),
  ]);

  // Deduplicate by lowercased full name
  const seen = new Set<string>();
  const people: LushaPerson[] = [];
  for (const group of peopleBySeniority as LushaPerson[][]) {
    for (const p of group) {
      const name = (p.fullName ?? `${p.firstName ?? ''} ${p.lastName ?? ''}`).trim().toLowerCase();
      if (name && !seen.has(name)) { seen.add(name); people.push(p); }
    }
  }

  const company = ((companyBody as Record<string, unknown>)?.data ?? companyBody) as LushaCompany | null;
  return { people, company };
}

export function formatLushaContext(people: LushaPerson[], company: LushaCompany | null): string {
  if (!people.length) return '';
  const header = company
    ? `Company (Lusha): ~${company.employeeCount ?? company.employeeRange ?? '?'} employees, industry: ${company.industry ?? '?'}\n`
    : '';
  const lines = people.map(p => {
    const name = p.fullName ?? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
    const li = p.linkedInUrl ?? p.linkedinUrl ?? '';
    return `  • ${name} | ${p.title ?? p.jobTitle ?? '?'}${p.department ? ` | ${p.department}` : ''}${li ? ` | ${li}` : ''}`;
  });
  return `${header}Verified employees from Lusha (${people.length}):\n${lines.join('\n')}`;
}
