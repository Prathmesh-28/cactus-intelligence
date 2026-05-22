import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Link2, Globe, Plus, Trash2, ChevronRight, Loader2, Building2, AlertCircle } from 'lucide-react';
import { CactusLogo } from '../components/CactusLogo';
import { OrgChartTab } from '../components/tabs/OrgChartTab';
import { orgFromLinkedin, type OrgCompanyInput } from '../lib/api';
import type { OrgChart } from '../types';

interface CompanyRow extends OrgCompanyInput {
  id: number;
}

let _id = 1;
const newRow = (name = '', linkedinUrl = '', website = ''): CompanyRow =>
  ({ id: _id++, name, linkedinUrl, website });

export function OrgChartBuilder() {
  const [target, setTarget] = useState<CompanyRow>(newRow());
  const [competitors, setCompetitors] = useState<CompanyRow[]>([newRow()]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgCharts, setOrgCharts] = useState<Record<string, OrgChart> | null>(null);
  const [companyNames, setCompanyNames] = useState<string[]>([]);
  const [activeCompany, setActiveCompany] = useState<string | null>(null);

  const updateTarget = (field: keyof OrgCompanyInput, value: string) =>
    setTarget(prev => ({ ...prev, [field]: value }));

  const updateCompetitor = (id: number, field: keyof OrgCompanyInput, value: string) =>
    setCompetitors(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));

  const addCompetitor = () => {
    if (competitors.length < 5) setCompetitors(prev => [...prev, newRow()]);
  };

  const removeCompetitor = (id: number) =>
    setCompetitors(prev => prev.filter(c => c.id !== id));

  const handleBuild = async () => {
    if (!target.linkedinUrl.trim()) {
      setError('Target company LinkedIn URL is required.');
      return;
    }
    setError(null);
    setLoading(true);
    setOrgCharts(null);
    try {
      const validCompetitors = competitors.filter(c => c.linkedinUrl.trim());
      const res = await orgFromLinkedin.build(
        { name: target.name, linkedinUrl: target.linkedinUrl, website: target.website },
        validCompetitors.map(c => ({ name: c.name, linkedinUrl: c.linkedinUrl, website: c.website }))
      );
      setOrgCharts(res.orgCharts as Record<string, OrgChart>);
      setCompanyNames(res.companyNames);
      setActiveCompany(res.companyNames[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to build org charts');
    } finally {
      setLoading(false);
    }
  };

  const inp = 'w-full px-3 py-2 text-sm border border-[#E8EDE9] rounded-lg bg-white text-[#0F1A14] placeholder-[#9BB0A1] focus:outline-none focus:border-[#2E6B4F] focus:ring-1 focus:ring-[#2E6B4F]/20 transition-colors';

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#1C3B2E] border-b border-[#2E6B4F]/40">
        <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/"><CactusLogo size="sm" inverted /></Link>
            <ChevronRight size={14} className="text-[#4A7C5F] shrink-0" />
            <span className="text-[#A8C4B0] text-sm font-medium">LinkedIn Org Chart Builder</span>
          </div>
          <Link to="/" className="text-xs text-[#A8C4B0] hover:text-white transition-colors">← Back</Link>
        </div>
      </nav>

      <div className="flex flex-1 max-w-screen-2xl w-full mx-auto">

        {/* Left panel — input form */}
        <aside className="w-full md:w-96 shrink-0 border-r border-[#E8EDE9] bg-white p-5 overflow-y-auto md:h-[calc(100vh-56px)] md:sticky md:top-14">
          <h2 className="text-base font-semibold text-[#1C3B2E] mb-1">Build Org Charts from LinkedIn</h2>
          <p className="text-xs text-[#4A5E52] mb-5">Paste LinkedIn company page URLs. AI + Lusha will extract the leadership structure.</p>

          {/* Target company */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-[#3D9970]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#1C3B2E]">Target Company</span>
            </div>
            <CompanyInputBlock
              row={target}
              onUpdate={(f, v) => updateTarget(f, v)}
              inp={inp}
              placeholder="e.g. Kapture CX"
            />
          </div>

          <div className="border-t border-[#E8EDE9] mb-5" />

          {/* Competitors */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#1C3B2E]">
                  Competitors <span className="font-normal text-[#9BB0A1]">({competitors.length}/5)</span>
                </span>
              </div>
              {competitors.length < 5 && (
                <button
                  onClick={addCompetitor}
                  className="flex items-center gap-1 text-xs text-[#2E6B4F] hover:text-[#1C3B2E] font-medium transition-colors"
                >
                  <Plus size={12} /> Add
                </button>
              )}
            </div>
            <div className="space-y-4">
              {competitors.map((c, i) => (
                <div key={c.id} className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[#9BB0A1]">Competitor {i + 1}</span>
                    {competitors.length > 1 && (
                      <button
                        onClick={() => removeCompetitor(c.id)}
                        className="text-[#9BB0A1] hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <CompanyInputBlock
                    row={c}
                    onUpdate={(f, v) => updateCompetitor(c.id, f, v)}
                    inp={inp}
                    placeholder={`e.g. Zendesk`}
                    linkedinRequired={false}
                  />
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <AlertCircle size={13} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <button
            onClick={handleBuild}
            disabled={loading || !target.linkedinUrl.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#1C3B2E] text-white text-sm font-semibold rounded-xl hover:bg-[#2E6B4F] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <><Loader2 size={15} className="animate-spin" /> Building org charts…</>
            ) : (
              <><Building2 size={15} /> Build Org Charts</>
            )}
          </button>
          {loading && (
            <p className="mt-2 text-center text-xs text-[#9BB0A1]">
              Researching leadership via LinkedIn + Lusha. This takes 1–3 min.
            </p>
          )}
        </aside>

        {/* Right panel — results */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          {!orgCharts && !loading && (
            <div className="flex flex-col items-center justify-center h-full py-24 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-[#1C3B2E]/6 flex items-center justify-center mb-4">
                <Building2 size={28} className="text-[#2E6B4F]" />
              </div>
              <h3 className="text-lg font-semibold text-[#1C3B2E] mb-2">Ready to build</h3>
              <p className="text-sm text-[#4A5E52] max-w-sm">
                Enter the LinkedIn company page URL for your target and competitors, then click Build Org Charts.
              </p>
              <div className="mt-6 space-y-2 text-left max-w-xs">
                {[
                  'linkedin.com/company/kapture-crm',
                  'linkedin.com/company/freshworks',
                  'linkedin.com/company/zendesk',
                ].map(ex => (
                  <div key={ex} className="flex items-center gap-2 text-xs text-[#9BB0A1]">
                    <Link2 size={11} className="text-[#3D9970]" />
                    {ex}
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center h-full py-24">
              <Loader2 size={32} className="animate-spin text-[#2E6B4F] mb-4" />
              <p className="text-sm font-medium text-[#1C3B2E]">Analysing leadership structures…</p>
              <p className="text-xs text-[#9BB0A1] mt-1">Searching LinkedIn, enriching via Lusha</p>
            </div>
          )}

          {orgCharts && companyNames.length > 0 && (
            <div className="flex flex-col h-full">
              {/* Company tab bar */}
              <div className="sticky top-0 bg-white border-b border-[#E8EDE9] px-4 flex gap-1 overflow-x-auto">
                {companyNames.map((name, i) => (
                  <button
                    key={name}
                    onClick={() => setActiveCompany(name)}
                    className={`shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeCompany === name
                        ? 'border-[#1C3B2E] text-[#1C3B2E]'
                        : 'border-transparent text-[#4A5E52] hover:text-[#1C3B2E]'
                    }`}
                  >
                    {i === 0 && <span className="mr-1.5 text-[10px] bg-[#3D9970]/15 text-[#2E6B4F] px-1.5 py-0.5 rounded-full font-semibold">TARGET</span>}
                    {name}
                  </button>
                ))}
              </div>

              {/* Active org chart */}
              <div className="flex-1 overflow-y-auto">
                {activeCompany && orgCharts[activeCompany] ? (
                  <OrgChartTab orgChart={orgCharts[activeCompany]} />
                ) : (
                  <div className="flex items-center justify-center py-20 text-sm text-[#4A5E52]">
                    No org chart data for this company.
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ── Reusable company input block ──────────────────────────────
function CompanyInputBlock({
  row, onUpdate, inp, placeholder, linkedinRequired = true,
}: {
  row: OrgCompanyInput;
  onUpdate: (field: keyof OrgCompanyInput, value: string) => void;
  inp: string;
  placeholder: string;
  linkedinRequired?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs text-[#4A5E52] mb-1">Company Name <span className="text-[#9BB0A1]">(optional — auto-detected)</span></label>
        <input
          className={inp}
          value={row.name}
          onChange={e => onUpdate('name', e.target.value)}
          placeholder={placeholder}
        />
      </div>
      <div>
        <label className="block text-xs text-[#4A5E52] mb-1 flex items-center gap-1">
          <Link2 size={10} className="text-[#3D9970]" />
          LinkedIn Company Page URL {linkedinRequired && <span className="text-red-400">*</span>}
        </label>
        <input
          className={inp}
          value={row.linkedinUrl}
          onChange={e => onUpdate('linkedinUrl', e.target.value)}
          placeholder="https://linkedin.com/company/..."
          type="url"
        />
      </div>
      <div>
        <label className="block text-xs text-[#4A5E52] mb-1 flex items-center gap-1">
          <Globe size={10} className="text-[#9BB0A1]" />
          Website <span className="text-[#9BB0A1]">(optional, improves Lusha match)</span>
        </label>
        <input
          className={inp}
          value={row.website}
          onChange={e => onUpdate('website', e.target.value)}
          placeholder="https://company.com"
          type="url"
        />
      </div>
    </div>
  );
}
