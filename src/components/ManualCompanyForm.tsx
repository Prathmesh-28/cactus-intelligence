import { useState } from 'react';
import { Building2, Globe, Link2, Users, TrendingUp, DollarSign, MapPin, User, ChevronRight, Layers, Target } from 'lucide-react';

export interface ManualCompanyData {
  name: string;
  normalizedName: string;
  legalName: string;
  hq: string;
  founded: number | null;
  sector: string;
  subSector: string;
  employeeCount: string;
  fundingStage: string;
  totalRaised: string;
  ceo: string;
  description: string;
  keyProducts: string[];
  markets: string[];
  website: string;
  linkedinMatch: {
    url: string;
    confidence: number;
    matchReasons: string[];
    linkedinEmployeeCount: string;
  };
  businessModel: string;
  revenueModel: string;
  keyCustomers: string[];
  geographicPresence: string[];
  techStack: string[];
  founderBackground: string;
  boardAndInvestors: string[];
  competitiveAdvantage: string;
  recentNews: unknown[];
}

interface ManualCompanyFormProps {
  companyName: string;
  onSubmit: (data: ManualCompanyData) => void;
  loading?: boolean;
}

const FUNDING_STAGES = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D+', 'Public', 'Unknown'];
const EMPLOYEE_RANGES = ['1–10', '10–50', '50–200', '200–500', '500–1000', '1000–5000', '5000+'];

export function ManualCompanyForm({ companyName, onSubmit, loading }: ManualCompanyFormProps) {
  const [form, setForm] = useState({
    name: companyName,
    linkedinUrl: '',
    website: '',
    sector: '',
    subSector: '',
    hq: '',
    founded: '',
    employeeCount: '50–200',
    fundingStage: 'Series A',
    totalRaised: '',
    ceo: '',
    description: '',
    keyProducts: '',
    markets: '',
    businessModel: 'B2B SaaS',
    revenueModel: 'Annual subscription',
    boardAndInvestors: '',
    competitiveAdvantage: '',
    founderBackground: '',
    targetCustomers: '',
    integrations: '',
  });

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const csv = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);

    onSubmit({
      name: form.name || companyName,
      normalizedName: form.name || companyName,
      legalName: form.name || companyName,
      hq: form.hq,
      founded: form.founded ? Number(form.founded) : null,
      sector: form.sector,
      subSector: form.subSector,
      employeeCount: form.employeeCount,
      fundingStage: form.fundingStage,
      totalRaised: form.totalRaised,
      ceo: form.ceo,
      description: form.description,
      keyProducts: csv(form.keyProducts),
      markets: csv(form.markets),
      website: form.website,
      linkedinMatch: {
        url: form.linkedinUrl,
        confidence: form.linkedinUrl ? 90 : 40,
        matchReasons: form.linkedinUrl ? ['manually provided'] : [],
        linkedinEmployeeCount: form.employeeCount,
      },
      businessModel: form.businessModel,
      revenueModel: form.revenueModel,
      keyCustomers: csv(form.targetCustomers),
      geographicPresence: csv(form.markets),
      techStack: csv(form.integrations),
      founderBackground: form.founderBackground,
      boardAndInvestors: csv(form.boardAndInvestors),
      competitiveAdvantage: form.competitiveAdvantage,
      recentNews: [],
    });
  };

  const inp = 'w-full px-3 py-2 text-sm border border-[#E8EDE9] rounded-lg bg-white text-[#0F1A14] placeholder-[#9BB0A1] focus:outline-none focus:border-[#2E6B4F] focus:ring-1 focus:ring-[#2E6B4F]/20 transition-colors';
  const lbl = 'block text-xs font-medium text-[#4A5E52] mb-1.5';

  return (
    <div className="bg-white border border-[#E8EDE9] rounded-2xl shadow-sm overflow-hidden">
      <div className="bg-[#1C3B2E] px-5 py-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center shrink-0">
          <Building2 size={16} className="text-white" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-sm">Enter Company Details</h3>
          <p className="text-[#A8C4B0] text-xs mt-0.5">Fill what you know — only Name, Sector and Description are required.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-5">

        {/* ── LinkedIn + Website — most important, first ── */}
        <section className="bg-[#F0F7F2] border border-[#2E6B4F]/15 rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[#2E6B4F] flex items-center gap-1.5">
            <Link2 size={11} /> Online Presence
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>LinkedIn Company Page URL</label>
              <div className="relative">
                <Link2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9BB0A1]" />
                <input
                  className={inp + ' pl-8'}
                  value={form.linkedinUrl}
                  onChange={set('linkedinUrl')}
                  placeholder="https://linkedin.com/company/..."
                  type="url"
                />
              </div>
            </div>
            <div>
              <label className={lbl}>Website</label>
              <div className="relative">
                <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9BB0A1]" />
                <input
                  className={inp + ' pl-8'}
                  value={form.website}
                  onChange={set('website')}
                  placeholder="https://company.com"
                  type="url"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Identity ── */}
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[#9BB0A1] mb-3 flex items-center gap-1.5">
            <Building2 size={11} /> Identity
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Company Name *</label>
              <input className={inp} value={form.name} onChange={set('name')} required placeholder="e.g. Kapture CX" />
            </div>
            <div>
              <label className={lbl}>Sector *</label>
              <input className={inp} value={form.sector} onChange={set('sector')} required placeholder="e.g. Customer Experience SaaS" />
            </div>
            <div>
              <label className={lbl}>Sub-sector</label>
              <input className={inp} value={form.subSector} onChange={set('subSector')} placeholder="e.g. CRM & Helpdesk" />
            </div>
            <div>
              <label className={lbl}>HQ Location</label>
              <div className="relative">
                <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9BB0A1]" />
                <input className={inp + ' pl-8'} value={form.hq} onChange={set('hq')} placeholder="e.g. Bangalore, India" />
              </div>
            </div>
            <div>
              <label className={lbl}>CEO / Founder</label>
              <div className="relative">
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9BB0A1]" />
                <input className={inp + ' pl-8'} value={form.ceo} onChange={set('ceo')} placeholder="Full name" />
              </div>
            </div>
            <div>
              <label className={lbl}>Founded Year</label>
              <input className={inp} value={form.founded} onChange={set('founded')} placeholder="e.g. 2014" type="number" min="1900" max="2030" />
            </div>
          </div>
        </section>

        {/* ── Scale & Funding ── */}
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[#9BB0A1] mb-3 flex items-center gap-1.5">
            <TrendingUp size={11} /> Scale & Funding
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Employees</label>
              <div className="relative">
                <Users size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9BB0A1] pointer-events-none" />
                <select className={inp + ' pl-8 appearance-none'} value={form.employeeCount} onChange={set('employeeCount')}>
                  {EMPLOYEE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={lbl}>Funding Stage</label>
              <select className={inp} value={form.fundingStage} onChange={set('fundingStage')}>
                {FUNDING_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Total Raised</label>
              <div className="relative">
                <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9BB0A1]" />
                <input className={inp + ' pl-8'} value={form.totalRaised} onChange={set('totalRaised')} placeholder="e.g. $70M" />
              </div>
            </div>
          </div>
        </section>

        {/* ── Product & Market ── */}
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[#9BB0A1] mb-3 flex items-center gap-1.5">
            <Layers size={11} /> Product & Market
          </h4>
          <div className="space-y-3">
            <div>
              <label className={lbl}>Company Description *</label>
              <textarea
                className={inp + ' resize-none'}
                rows={2}
                value={form.description}
                onChange={set('description')}
                required
                placeholder="What they do, who they serve, key differentiation."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Key Products <span className="font-normal text-[#9BB0A1]">(comma-sep)</span></label>
                <input className={inp} value={form.keyProducts} onChange={set('keyProducts')} placeholder="e.g. CRM, Helpdesk, Analytics" />
              </div>
              <div>
                <label className={lbl}>Markets <span className="font-normal text-[#9BB0A1]">(comma-sep)</span></label>
                <input className={inp} value={form.markets} onChange={set('markets')} placeholder="e.g. India, SE Asia, Middle East" />
              </div>
              <div>
                <label className={lbl}>Business Model</label>
                <input className={inp} value={form.businessModel} onChange={set('businessModel')} placeholder="e.g. B2B SaaS" />
              </div>
              <div>
                <label className={lbl}>Revenue Model</label>
                <input className={inp} value={form.revenueModel} onChange={set('revenueModel')} placeholder="e.g. Annual subscription + services" />
              </div>
            </div>
          </div>
        </section>

        {/* ── Customers & Integrations ── */}
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[#9BB0A1] mb-3 flex items-center gap-1.5">
            <Target size={11} /> Customers & Integrations
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Target Customers / Key Accounts <span className="font-normal text-[#9BB0A1]">(comma-sep)</span></label>
              <input className={inp} value={form.targetCustomers} onChange={set('targetCustomers')} placeholder="e.g. Swiggy, OYO, large enterprises" />
            </div>
            <div>
              <label className={lbl}>Integrations / Tech Stack <span className="font-normal text-[#9BB0A1]">(comma-sep)</span></label>
              <input className={inp} value={form.integrations} onChange={set('integrations')} placeholder="e.g. Salesforce, Slack, AWS, Jira" />
            </div>
            <div>
              <label className={lbl}>Investors / Board <span className="font-normal text-[#9BB0A1]">(comma-sep)</span></label>
              <input className={inp} value={form.boardAndInvestors} onChange={set('boardAndInvestors')} placeholder="e.g. Sequoia, Tiger Global" />
            </div>
            <div>
              <label className={lbl}>Competitive Advantage</label>
              <input className={inp} value={form.competitiveAdvantage} onChange={set('competitiveAdvantage')} placeholder="e.g. Deep SMB penetration, 1,000+ clients" />
            </div>
          </div>
        </section>

        {/* Submit */}
        <div className="flex items-center justify-end pt-2 border-t border-[#E8EDE9]">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1C3B2E] text-white text-sm font-medium rounded-xl hover:bg-[#2E6B4F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Running analysis…' : 'Continue Analysis'}
            {!loading && <ChevronRight size={14} />}
          </button>
        </div>
      </form>
    </div>
  );
}
