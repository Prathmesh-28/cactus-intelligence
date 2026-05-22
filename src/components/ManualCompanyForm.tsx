import { useState } from 'react';
import { Building2, Globe, Link2, Users, TrendingUp, DollarSign, MapPin, User, ChevronRight } from 'lucide-react';

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
const EMPLOYEE_RANGES = ['1-10', '10-50', '50-200', '200-500', '500-1000', '1000-5000', '5000+'];

export function ManualCompanyForm({ companyName, onSubmit, loading }: ManualCompanyFormProps) {
  const [form, setForm] = useState({
    name: companyName,
    website: '',
    linkedinUrl: '',
    sector: '',
    subSector: '',
    hq: '',
    founded: '',
    employeeCount: '50-200',
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
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const csv = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);

    const data: ManualCompanyData = {
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
      keyCustomers: [],
      geographicPresence: csv(form.markets),
      techStack: [],
      founderBackground: form.founderBackground,
      boardAndInvestors: csv(form.boardAndInvestors),
      competitiveAdvantage: form.competitiveAdvantage,
      recentNews: [],
    };

    onSubmit(data);
  };

  const inputCls = 'w-full px-3 py-2 text-sm border border-[#E8EDE9] rounded-lg bg-white text-[#0F1A14] placeholder-[#9BB0A1] focus:outline-none focus:border-[#2E6B4F] focus:ring-1 focus:ring-[#2E6B4F]/20 transition-colors';
  const labelCls = 'block text-xs font-medium text-[#4A5E52] mb-1.5';

  return (
    <div className="bg-white border border-[#E8EDE9] rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-[#1C3B2E] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center">
            <Building2 size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Manual Company Setup</h3>
            <p className="text-[#A8C4B0] text-xs mt-0.5">
              Step 1 couldn't auto-identify the company. Enter key details and the analysis will continue from Step 2.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Identity */}
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[#9BB0A1] mb-4 flex items-center gap-2">
            <Building2 size={12} /> Company Identity
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Company Name *</label>
              <input className={inputCls} value={form.name} onChange={set('name')} required placeholder="e.g. Kapture CX" />
            </div>
            <div>
              <label className={labelCls}>Sector *</label>
              <input className={inputCls} value={form.sector} onChange={set('sector')} required placeholder="e.g. Customer Experience SaaS" />
            </div>
            <div>
              <label className={labelCls}>Sub-sector</label>
              <input className={inputCls} value={form.subSector} onChange={set('subSector')} placeholder="e.g. CRM & Helpdesk" />
            </div>
            <div>
              <label className={labelCls}>HQ Location</label>
              <div className="relative">
                <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9BB0A1]" />
                <input className={inputCls + ' pl-8'} value={form.hq} onChange={set('hq')} placeholder="e.g. Bangalore, India" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Founded Year</label>
              <input className={inputCls} value={form.founded} onChange={set('founded')} placeholder="e.g. 2014" type="number" min="1900" max="2030" />
            </div>
            <div>
              <label className={labelCls}>CEO / Founder</label>
              <div className="relative">
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9BB0A1]" />
                <input className={inputCls + ' pl-8'} value={form.ceo} onChange={set('ceo')} placeholder="e.g. Sheshgiri Kamath" />
              </div>
            </div>
          </div>
        </section>

        {/* Links */}
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[#9BB0A1] mb-4 flex items-center gap-2">
            <Globe size={12} /> Online Presence
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Website URL</label>
              <div className="relative">
                <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9BB0A1]" />
                <input className={inputCls + ' pl-8'} value={form.website} onChange={set('website')} placeholder="https://kapturecrm.com" type="url" />
              </div>
            </div>
            <div>
              <label className={labelCls}>LinkedIn Company URL</label>
              <div className="relative">
                <Link2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9BB0A1]" />
                <input className={inputCls + ' pl-8'} value={form.linkedinUrl} onChange={set('linkedinUrl')} placeholder="https://linkedin.com/company/kapture-crm" type="url" />
              </div>
            </div>
          </div>
        </section>

        {/* Scale */}
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[#9BB0A1] mb-4 flex items-center gap-2">
            <TrendingUp size={12} /> Scale & Funding
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Employee Count</label>
              <div className="relative">
                <Users size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9BB0A1] pointer-events-none" />
                <select className={inputCls + ' pl-8 appearance-none'} value={form.employeeCount} onChange={set('employeeCount')}>
                  {EMPLOYEE_RANGES.map(r => <option key={r} value={r}>{r} employees</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Funding Stage</label>
              <select className={inputCls} value={form.fundingStage} onChange={set('fundingStage')}>
                {FUNDING_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Total Raised</label>
              <div className="relative">
                <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9BB0A1]" />
                <input className={inputCls + ' pl-8'} value={form.totalRaised} onChange={set('totalRaised')} placeholder="e.g. $70M" />
              </div>
            </div>
          </div>
        </section>

        {/* Description */}
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[#9BB0A1] mb-4">Description</h4>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Company Description *</label>
              <textarea
                className={inputCls + ' resize-none'}
                rows={3}
                value={form.description}
                onChange={set('description')}
                required
                placeholder="2–3 sentences: what they do, who they serve, and their key differentiation."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Key Products <span className="font-normal text-[#9BB0A1]">(comma-separated)</span></label>
                <input className={inputCls} value={form.keyProducts} onChange={set('keyProducts')} placeholder="e.g. CRM, Helpdesk, Chatbot" />
              </div>
              <div>
                <label className={labelCls}>Markets <span className="font-normal text-[#9BB0A1]">(comma-separated)</span></label>
                <input className={inputCls} value={form.markets} onChange={set('markets')} placeholder="e.g. India, Southeast Asia, Middle East" />
              </div>
              <div>
                <label className={labelCls}>Business Model</label>
                <input className={inputCls} value={form.businessModel} onChange={set('businessModel')} placeholder="e.g. B2B SaaS" />
              </div>
              <div>
                <label className={labelCls}>Investors / Board <span className="font-normal text-[#9BB0A1]">(comma-separated)</span></label>
                <input className={inputCls} value={form.boardAndInvestors} onChange={set('boardAndInvestors')} placeholder="e.g. Sequoia, Tiger Global" />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Competitive Advantage</label>
                <input className={inputCls} value={form.competitiveAdvantage} onChange={set('competitiveAdvantage')} placeholder="e.g. Deep SMB penetration with 1,000+ enterprise clients across India" />
              </div>
            </div>
          </div>
        </section>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2 border-t border-[#E8EDE9]">
          <p className="text-xs text-[#9BB0A1]">
            Only <span className="font-medium text-[#4A5E52]">Company Name, Sector,</span> and <span className="font-medium text-[#4A5E52]">Description</span> are required. More data = better analysis.
          </p>
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
