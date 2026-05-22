const LUSHA_API_KEY = process.env.LUSHA_API_KEY!;
const LUSHA_BASE = 'https://api.lusha.com';

interface LushaPersonData {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  jobTitle?: { title?: string; departments?: string[]; seniority?: string };
  emailAddresses?: Array<{ email: string; emailType: string; emailConfidence: string }>;
  phoneNumbers?: Array<{ number: string; phoneType: string }>;
  socialLinks?: { linkedin?: string; xUrl?: string };
  location?: { city?: string; country?: string; state?: string };
  jobStartDate?: string;
  company?: {
    name?: string;
    companySize?: [number, number];
    revenueRange?: [number, number];
    description?: string;
    funding?: { rounds?: Array<{ roundType: string; roundAmount: number; roundDate: string; currency: string }> };
    specialities?: string[];
    mainIndustry?: string;
  };
}

interface LushaCompanyData {
  id?: number;
  name?: string;
  description?: string;
  homepageUrl?: string;
  location?: { city?: string; country?: string; state?: string };
  companySize?: [number, number];
  revenueRange?: [number, number];
  social?: { linkedin?: string; crunchbase?: string };
  funding?: { rounds?: Array<{ roundType: string; roundAmount: number; roundDate: string; currency: string }> };
  mainIndustry?: string;
  subIndustry?: string;
  specialities?: string[];
}

export interface EnrichedPerson {
  fullName: string;
  firstName: string;
  lastName: string;
  title: string;
  department: string;
  linkedinUrl: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  tenureStart: string | null;
  confidence: 'confirmed' | 'inferred' | 'estimated';
}

async function lushaGet<T>(path: string, params: Record<string, string>): Promise<T | null> {
  const url = new URL(`${LUSHA_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const res = await fetch(url.toString(), {
      headers: { 'api_key': LUSHA_API_KEY, 'Accept': 'application/json' },
    });
    if (!res.ok) return null;
    const json = await res.json() as Record<string, unknown>;
    return (json.data ?? json) as T;
  } catch {
    return null;
  }
}

// ── Enrich a single person by name + company domain ──────────────────────────
export async function enrichPerson(
  firstName: string,
  lastName: string,
  companyDomain: string
): Promise<EnrichedPerson | null> {
  if (!firstName || !lastName || !companyDomain) return null;

  const result = await lushaGet<{ contact?: { data?: LushaPersonData }; isCreditCharged?: boolean }>(
    '/v2/person',
    { firstName, lastName, companyDomain }
  );

  // The API wraps the response: { contact: { data: {...} } }
  const raw = (result as Record<string, unknown>)?.contact as { data?: LushaPersonData } | undefined;
  const p = raw?.data ?? (result as LushaPersonData);
  if (!p) return null;

  const name = p.fullName ?? `${p.firstName ?? firstName} ${p.lastName ?? lastName}`.trim();
  const titleObj = p.jobTitle;
  const title = (typeof titleObj === 'string' ? titleObj : titleObj?.title) ?? '';
  const dept = (typeof titleObj === 'object' ? titleObj?.departments?.[0] : undefined) ?? '';

  return {
    fullName: name,
    firstName: p.firstName ?? firstName,
    lastName: p.lastName ?? lastName,
    title,
    department: dept,
    linkedinUrl: p.socialLinks?.linkedin ?? null,
    email: p.emailAddresses?.[0]?.email ?? null,
    phone: p.phoneNumbers?.[0]?.number ?? null,
    location: p.location ? `${p.location.city ?? ''}, ${p.location.country ?? ''}`.replace(/^,\s*|,\s*$/, '') : null,
    tenureStart: p.jobStartDate ?? null,
    confidence: 'confirmed',
  };
}

// ── Enrich a person by LinkedIn URL ──────────────────────────────────────────
export async function enrichByLinkedIn(linkedInUrl: string): Promise<EnrichedPerson | null> {
  if (!linkedInUrl) return null;

  const result = await lushaGet<Record<string, unknown>>('/v2/person', { linkedInUrl });
  const raw = result?.contact as { data?: LushaPersonData } | undefined;
  const p = raw?.data ?? (result as LushaPersonData);
  if (!p || !p.fullName) return null;

  const titleObj = p.jobTitle;
  const title = (typeof titleObj === 'string' ? titleObj : titleObj?.title) ?? '';
  const dept = (typeof titleObj === 'object' ? titleObj?.departments?.[0] : undefined) ?? '';

  return {
    fullName: p.fullName ?? '',
    firstName: p.firstName ?? '',
    lastName: p.lastName ?? '',
    title,
    department: dept,
    linkedinUrl: p.socialLinks?.linkedin ?? linkedInUrl,
    email: p.emailAddresses?.[0]?.email ?? null,
    phone: p.phoneNumbers?.[0]?.number ?? null,
    location: p.location ? `${p.location.city ?? ''}, ${p.location.country ?? ''}`.replace(/^,\s*|,\s*$/, '') : null,
    tenureStart: p.jobStartDate ?? null,
    confidence: 'confirmed',
  };
}

// ── Get company data by domain ────────────────────────────────────────────────
export async function getCompanyByDomain(domain: string): Promise<LushaCompanyData | null> {
  const result = await lushaGet<{ data?: LushaCompanyData } | LushaCompanyData>('/v2/company', { domain });
  return ((result as Record<string, unknown>)?.data as LushaCompanyData) ?? (result as LushaCompanyData) ?? null;
}

// ── Derive domain from company name or website URL ───────────────────────────
export function extractDomain(websiteOrName: string): string {
  if (!websiteOrName) return '';
  try {
    // If it looks like a URL
    const cleaned = websiteOrName.startsWith('http') ? websiteOrName : `https://${websiteOrName}`;
    const url = new URL(cleaned);
    return url.hostname.replace(/^www\./, '');
  } catch {
    // Convert "Company Name" → "companyname.com" as best guess (not reliable)
    return '';
  }
}

// ── Batch enrich a list of people identified by AI ───────────────────────────
// Takes an array of {firstName, lastName} + company domain, enriches up to maxPeople
export async function batchEnrich(
  people: Array<{ firstName: string; lastName: string }>,
  companyDomain: string,
  maxPeople = 15
): Promise<Map<string, EnrichedPerson>> {
  const results = new Map<string, EnrichedPerson>();
  const limited = people.slice(0, maxPeople);

  await Promise.allSettled(
    limited.map(async p => {
      const enriched = await enrichPerson(p.firstName, p.lastName, companyDomain);
      if (enriched) results.set(`${p.firstName} ${p.lastName}`.toLowerCase(), enriched);
    })
  );

  return results;
}

// ── Legacy compat: fetch org data for pipeline step 3 ────────────────────────
export async function fetchOrgData(
  companyName: string,
  _seniorityLevels = ['c_level', 'vp', 'director']
): Promise<{ people: EnrichedPerson[]; company: LushaCompanyData | null }> {
  // Without a domain we can't batch-search. Return empty — AI will fill via web search.
  // If profile data has a website, pipeline.ts can call getCompanyByDomain directly.
  return { people: [], company: null };
}

export function formatLushaContext(people: EnrichedPerson[], company: LushaCompanyData | null): string {
  if (!people.length) return '';
  const header = company
    ? `Company (Lusha verified): ${company.companySize ? `${company.companySize[0]}–${company.companySize[1]} employees` : '?'}, ${company.mainIndustry ?? '?'}\n`
    : '';
  const lines = people.map(p => {
    const parts = [`  • ${p.fullName} | ${p.title}`];
    if (p.department) parts.push(p.department);
    if (p.linkedinUrl) parts.push(p.linkedinUrl);
    if (p.email) parts.push(`email: ${p.email}`);
    if (p.tenureStart) parts.push(`since: ${p.tenureStart.slice(0, 7)}`);
    return parts.join(' | ');
  });
  return `${header}Lusha-verified contacts (${people.length}):\n${lines.join('\n')}`;
}
