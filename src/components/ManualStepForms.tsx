import { useState } from 'react';
import { ChevronRight, Plus, Trash2 } from 'lucide-react';

const inputCls = 'w-full px-3 py-2 text-sm border border-[#E8EDE9] rounded-lg bg-white text-[#0F1A14] placeholder-[#9BB0A1] focus:outline-none focus:border-[#2E6B4F] focus:ring-1 focus:ring-[#2E6B4F]/20 transition-colors';
const labelCls = 'block text-xs font-medium text-[#4A5E52] mb-1.5';
const FUNDING = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D+', 'Public', 'Unknown'];

interface StepFormProps {
  companyName: string;
  onSubmit: (data: unknown) => void;
  loading?: boolean;
}

function StepFormShell({ step, title, subtitle, children, onSubmit, loading }: {
  step: number; title: string; subtitle: string;
  children: React.ReactNode; onSubmit: (e: React.FormEvent) => void; loading?: boolean;
}) {
  return (
    <div className="bg-white border border-[#E8EDE9] rounded-2xl shadow-sm overflow-hidden">
      <div className="bg-[#1C3B2E] px-6 py-4 flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">{step}</div>
        <div>
          <h3 className="text-white font-semibold text-sm">{title}</h3>
          <p className="text-[#A8C4B0] text-xs mt-0.5">{subtitle}</p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="p-6 space-y-5">
        {children}
        <div className="flex items-center justify-between pt-2 border-t border-[#E8EDE9]">
          <p className="text-xs text-[#9BB0A1]">Enter what you know — AI will fill gaps for subsequent steps.</p>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1C3B2E] text-white text-sm font-medium rounded-xl hover:bg-[#2E6B4F] transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Save & Continue'}
            {!loading && <ChevronRight size={14} />}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── STEP 2: Competitor Discovery ─────────────────────────────────────────────
interface Competitor { name: string; hq: string; fundingStage: string; website: string; differentiator: string; }
const emptyComp = (): Competitor => ({ name: '', hq: '', fundingStage: 'Series A', website: '', differentiator: '' });

export function ManualCompetitorsForm({ companyName, onSubmit, loading }: StepFormProps) {
  const [competitors, setCompetitors] = useState<Competitor[]>([emptyComp(), emptyComp()]);
  const [summary, setSummary] = useState('');

  const update = (i: number, k: keyof Competitor, v: string) =>
    setCompetitors(prev => prev.map((c, idx) => idx === i ? { ...c, [k]: v } : c));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = competitors.filter(c => c.name.trim());
    onSubmit({
      competitors: valid.map((c, i) => ({
        rank: i + 1,
        name: c.name.trim(),
        hq: c.hq,
        fundingStage: c.fundingStage,
        website: c.website,
        differentiator: c.differentiator,
        similarityScore: 70,
        threatLevel: 'medium',
        employees: 'Unknown',
        founded: null,
        totalRaised: 'Unknown',
        ceo: 'Unknown',
        marketPosition: 'Competitor in same space',
        keyStrengths: [],
        keyWeaknesses: [],
        recentDevelopments: '',
        gtmStrategy: '',
        similarityBreakdown: { productSimilarity: 25, gtmSimilarity: 14, fundingStageProximity: 10, geographyOverlap: 8, employeeScale: 7, techSimilarity: 6 },
      })),
      competitiveSummary: summary || `${valid.length} direct competitors identified for ${companyName}. Manually entered — AI enrichment skipped for this step.`,
    });
  };

  return (
    <StepFormShell step={2} title="Enter Competitors Manually"
      subtitle="Step 2 failed to auto-discover competitors. Enter up to 5 direct competitors."
      onSubmit={handleSubmit} loading={loading}>

      <div className="space-y-4">
        {competitors.map((c, i) => (
          <div key={i} className="p-4 border border-[#E8EDE9] rounded-xl bg-[#FAFCFA] space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-[#4A5E52]">Competitor {i + 1}</span>
              {competitors.length > 1 && (
                <button type="button" onClick={() => setCompetitors(prev => prev.filter((_, idx) => idx !== i))}
                  className="text-[#9BB0A1] hover:text-[#C0392B]"><Trash2 size={13} /></button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 md:col-span-1">
                <label className={labelCls}>Company Name *</label>
                <input className={inputCls} value={c.name} onChange={e => update(i, 'name', e.target.value)} placeholder="e.g. Freshdesk" required={i === 0} />
              </div>
              <div>
                <label className={labelCls}>HQ</label>
                <input className={inputCls} value={c.hq} onChange={e => update(i, 'hq', e.target.value)} placeholder="e.g. Chennai, India" />
              </div>
              <div>
                <label className={labelCls}>Funding Stage</label>
                <select className={inputCls} value={c.fundingStage} onChange={e => update(i, 'fundingStage', e.target.value)}>
                  {FUNDING.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Website</label>
                <input className={inputCls} value={c.website} onChange={e => update(i, 'website', e.target.value)} placeholder="https://..." type="url" />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>How they differ from {companyName}</label>
                <input className={inputCls} value={c.differentiator} onChange={e => update(i, 'differentiator', e.target.value)} placeholder="e.g. Stronger enterprise brand, global presence" />
              </div>
            </div>
          </div>
        ))}

        {competitors.length < 5 && (
          <button type="button" onClick={() => setCompetitors(prev => [...prev, emptyComp()])}
            className="flex items-center gap-2 text-sm text-[#2E6B4F] hover:underline">
            <Plus size={14} /> Add another competitor
          </button>
        )}
      </div>

      <div>
        <label className={labelCls}>Competitive landscape summary (optional)</label>
        <textarea className={inputCls + ' resize-none'} rows={2} value={summary} onChange={e => setSummary(e.target.value)}
          placeholder="1–2 sentences about the overall competitive landscape..." />
      </div>
    </StepFormShell>
  );
}

// ── STEP 3: Org Chart ──────────────────────────────────────────────────────────
interface Executive { name: string; title: string; department: string; linkedinUrl: string; }
const emptyExec = (): Executive => ({ name: '', title: '', department: 'Executive', linkedinUrl: '' });
const DEPARTMENTS = ['Executive', 'Engineering', 'Product', 'Sales', 'Marketing', 'Finance', 'Operations', 'HR', 'Customer Success', 'Legal'];

export function ManualOrgChartForm({ companyName, onSubmit, loading }: StepFormProps) {
  const [execs, setExecs] = useState<Executive[]>([emptyExec(), emptyExec(), emptyExec()]);
  const [ceoName, setCeoName] = useState('');
  const [employeeCount, setEmployeeCount] = useState('');

  const update = (i: number, k: keyof Executive, v: string) =>
    setExecs(prev => prev.map((ex, idx) => idx === i ? { ...ex, [k]: v } : ex));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validExecs = execs.filter(ex => ex.title.trim());

    const children = validExecs.map((ex, i) => ({
      id: `exec-${i + 1}`,
      name: ex.name || 'Unknown',
      title: ex.title,
      department: ex.department,
      confidence: ex.name ? 'inferred' : 'estimated',
      linkedinUrl: ex.linkedinUrl || null,
      tenure: null, previousCompany: null, teamSize: null, children: [],
    }));

    const orgChart = {
      company: companyName,
      lastUpdated: new Date().toISOString().split('T')[0],
      totalEmployees: employeeCount || 'Unknown',
      orgMaturityScore: 45,
      orgMaturityClassification: 'Early Scaling',
      functionScores: {},
      structuralFlags: {},
      recentChanges: [],
      openRoles: [],
      orgTree: {
        id: 'ceo',
        name: ceoName || 'Unknown',
        title: 'CEO',
        department: 'Executive',
        confidence: ceoName ? 'inferred' : 'estimated',
        linkedinUrl: null,
        tenure: null, previousCompany: null, teamSize: validExecs.length,
        children,
      },
    };

    onSubmit({ [companyName]: orgChart });
  };

  return (
    <StepFormShell step={3} title="Enter Org Chart Manually"
      subtitle={`Step 3 failed to build the org chart for ${companyName}. Enter known executives.`}
      onSubmit={handleSubmit} loading={loading}>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>CEO / Founder Name</label>
          <input className={inputCls} value={ceoName} onChange={e => setCeoName(e.target.value)} placeholder="e.g. Sheshgiri Kamath" />
        </div>
        <div>
          <label className={labelCls}>Total Employees</label>
          <input className={inputCls} value={employeeCount} onChange={e => setEmployeeCount(e.target.value)} placeholder="e.g. 500-1000" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#4A5E52] mb-3">Key Executives (reporting to CEO)</label>
        <div className="space-y-3">
          {execs.map((ex, i) => (
            <div key={i} className="p-3 border border-[#E8EDE9] rounded-xl bg-[#FAFCFA]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#4A5E52]">Executive {i + 1}</span>
                {execs.length > 1 && (
                  <button type="button" onClick={() => setExecs(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-[#9BB0A1] hover:text-[#C0392B]"><Trash2 size={13} /></button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Name</label>
                  <input className={inputCls} value={ex.name} onChange={e => update(i, 'name', e.target.value)} placeholder="Full name (or leave blank)" />
                </div>
                <div>
                  <label className={labelCls}>Title *</label>
                  <input className={inputCls} value={ex.title} onChange={e => update(i, 'title', e.target.value)} placeholder="e.g. CTO, VP Sales" />
                </div>
                <div>
                  <label className={labelCls}>Department</label>
                  <select className={inputCls} value={ex.department} onChange={e => update(i, 'department', e.target.value)}>
                    {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>LinkedIn URL</label>
                  <input className={inputCls} value={ex.linkedinUrl} onChange={e => update(i, 'linkedinUrl', e.target.value)} placeholder="https://linkedin.com/in/..." type="url" />
                </div>
              </div>
            </div>
          ))}
          {execs.length < 8 && (
            <button type="button" onClick={() => setExecs(prev => [...prev, emptyExec()])}
              className="flex items-center gap-2 text-sm text-[#2E6B4F] hover:underline">
              <Plus size={14} /> Add executive
            </button>
          )}
        </div>
      </div>
    </StepFormShell>
  );
}

// ── STEP 4: Talent Insights ──────────────────────────────────────────────────
export function ManualTalentForm({ companyName, onSubmit, loading }: StepFormProps) {
  const [gaps, setGaps] = useState([{ role: '', severity: 'high', observation: '' }]);
  const [keyManName, setKeyManName] = useState('');
  const [keyManTitle, setKeyManTitle] = useState('CEO & Co-Founder');
  const [keyManRisk, setKeyManRisk] = useState('Single point of failure — controls product, sales, and engineering.');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validGaps = gaps.filter(g => g.role.trim());
    onSubmit({
      talentGaps: validGaps.map((g) => ({
        role: g.role,
        company: companyName,
        severity: g.severity,
        gapDescription: g.observation || `${g.role} role is missing vs competitor benchmarks.`,
        competitorBenchmark: 'Manually noted',
        revenueImpact: 'To be assessed',
      })),
      keyManRisk: keyManName || keyManRisk ? [{
        name: keyManName || 'CEO (name withheld)',
        title: keyManTitle,
        company: companyName,
        riskLevel: 'high',
        reason: keyManRisk,
        mitigationRecommendation: 'Hire COO or delegate key functions.',
      }] : [],
      hiringVelocity: [{ company: companyName, trend: 'unknown', growthRate: 'Unknown', openRolesCount: 0, hiringFocus: 'Unknown', velocitySignal: 'Insufficient data' }],
      leadershipQuality: [{ company: companyName, score: 50, tier1Percentage: 20, benchmarkVsCompetitors: 'Unknown', keyStrength: 'Founding team', keyGap: 'Commercial leadership bench' }],
      poachingRisk: [],
      hiringRecommendations: validGaps.map(g => ({ role: g.role, urgency: g.severity === 'critical' ? 'immediate' : 'within 6 months', rationale: g.observation, targetProfile: 'To be defined', estimatedHiringTimeline: '3–6 months', estimatedCompensation: 'Market rate' })),
      executiveGaps: validGaps.map((g, idx) => ({ gapId: `GAP-00${idx + 1}`, missingRole: g.role, severity: g.severity, observation: g.observation, risk: 'Competitive disadvantage', competitorBenchmark: 'Manually noted', recommendation: `Hire ${g.role} within 6 months.` })),
      operationalGaps: [],
      technicalGaps: [],
      revenueGaps: [],
      governanceRisks: [],
      benchmarkMatrix: { functions: ['Product', 'Engineering', 'Sales', 'Marketing', 'Finance', 'HR'], companies: [{ company: companyName, scores: [50, 50, 50, 50, 50, 50], overallScore: 50, classification: 'Manually entered' }] },
      talentProspects: [],
    });
  };

  return (
    <StepFormShell step={4} title="Enter Talent Insights Manually"
      subtitle={`Step 4 failed to analyse talent signals for ${companyName}. Enter known gaps.`}
      onSubmit={handleSubmit} loading={loading}>

      <div>
        <label className="block text-xs font-semibold text-[#4A5E52] mb-3">Key Missing Roles / Executive Gaps</label>
        <div className="space-y-3">
          {gaps.map((g, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 items-start p-3 border border-[#E8EDE9] rounded-xl bg-[#FAFCFA]">
              <div>
                <label className={labelCls}>Missing Role</label>
                <input className={inputCls} value={g.role} onChange={e => setGaps(prev => prev.map((x, j) => j === i ? { ...x, role: e.target.value } : x))} placeholder="e.g. CRO" />
              </div>
              <div>
                <label className={labelCls}>Severity</label>
                <select className={inputCls} value={g.severity} onChange={e => setGaps(prev => prev.map((x, j) => j === i ? { ...x, severity: e.target.value } : x))}>
                  {['critical', 'high', 'medium', 'low'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="flex items-center justify-between text-xs font-medium text-[#4A5E52] mb-1.5">
                  <span>Why it matters</span>
                  {gaps.length > 1 && <button type="button" onClick={() => setGaps(prev => prev.filter((_, j) => j !== i))} className="text-[#9BB0A1] hover:text-[#C0392B]"><Trash2 size={12} /></button>}
                </label>
                <input className={inputCls} value={g.observation} onChange={e => setGaps(prev => prev.map((x, j) => j === i ? { ...x, observation: e.target.value } : x))} placeholder="e.g. No unified revenue leadership" />
              </div>
            </div>
          ))}
          {gaps.length < 6 && (
            <button type="button" onClick={() => setGaps(prev => [...prev, { role: '', severity: 'high', observation: '' }])}
              className="flex items-center gap-2 text-sm text-[#2E6B4F] hover:underline">
              <Plus size={14} /> Add gap
            </button>
          )}
        </div>
      </div>

      <div className="p-4 border border-[#E8EDE9] rounded-xl bg-[#FAFCFA]">
        <label className="block text-xs font-semibold text-[#4A5E52] mb-3">Key Man Risk</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Name (if known)</label>
            <input className={inputCls} value={keyManName} onChange={e => setKeyManName(e.target.value)} placeholder="Founder name or leave blank" />
          </div>
          <div>
            <label className={labelCls}>Title</label>
            <input className={inputCls} value={keyManTitle} onChange={e => setKeyManTitle(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Risk description</label>
            <input className={inputCls} value={keyManRisk} onChange={e => setKeyManRisk(e.target.value)} />
          </div>
        </div>
      </div>
    </StepFormShell>
  );
}

// ── STEP 5: Investment Signals ────────────────────────────────────────────────
export function ManualSignalsForm({ companyName, onSubmit, loading }: StepFormProps) {
  const [signal, setSignal] = useState<'GO' | 'HOLD' | 'PASS'>('HOLD');
  const [confidence, setConfidence] = useState(60);
  const [rationale, setRationale] = useState('');
  const [bullPoints, setBullPoints] = useState('');
  const [bearPoints, setBearPoints] = useState('');
  const [teamScore, setTeamScore] = useState(55);

  const lines = (s: string) => s.split('\n').map(l => l.trim()).filter(Boolean);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      signal,
      confidence: Number(confidence),
      signalRationale: rationale || `${signal} signal for ${companyName} — manually assessed.`,
      bullCase: lines(bullPoints).map(point => ({ point, detail: '' })),
      bearCase: lines(bearPoints).map(point => ({ point, detail: '' })),
      moat: { rating: 'Moderate', reasoning: 'Manually assessed — detailed moat analysis not available.' },
      teamScore: Number(teamScore),
      teamScoreJustification: 'Manually assessed.',
      talentTrajectory: 'Unknown',
      dueDiligence: [],
      comparableExits: [],
      futureStateOrg: { vision: 'To be defined', ceoScope: 'To be defined', executiveLayer: [], functionalPods: [], orgAsciiChart: '' },
      riskScores: {
        structural: { score: 60, label: 'Medium', primaryDriver: 'Manually assessed' },
        governance: { score: 60, label: 'Medium', primaryDriver: 'Manually assessed' },
        revenueExecution: { score: 60, label: 'Medium', primaryDriver: 'Manually assessed' },
        scaling: { score: 60, label: 'Medium', primaryDriver: 'Manually assessed' },
        aiDeployment: { score: 60, label: 'Medium', primaryDriver: 'Manually assessed' },
        compliance: { score: 60, label: 'Medium', primaryDriver: 'Manually assessed' },
      },
      scalingReadinessScore: 50,
      scalingReadinessClassification: 'Manually assessed',
      scalingReadinessBreakdown: { revenueStructure: 50, productOrg: 50, engineeringMaturity: 50, aiMlReadiness: 50, governanceStructure: 50, internationalReadiness: 50, operationalInfrastructure: 50, talentBench: 50 },
      hiringPlan12Month: [],
      orgMigrationRoadmap: [],
    });
  };

  const signalColors: Record<string, string> = { GO: '#27AE60', HOLD: '#E67E22', PASS: '#C0392B' };

  return (
    <StepFormShell step={5} title="Enter Investment Signal Manually"
      subtitle={`Step 5 failed to generate the final report for ${companyName}. Enter your assessment.`}
      onSubmit={handleSubmit} loading={loading}>

      {/* Signal selector */}
      <div>
        <label className="block text-xs font-semibold text-[#4A5E52] mb-3">Investment Signal *</label>
        <div className="flex gap-3">
          {(['GO', 'HOLD', 'PASS'] as const).map(s => (
            <button
              key={s} type="button"
              onClick={() => setSignal(s)}
              className="flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all"
              style={{
                borderColor: signal === s ? signalColors[s] : '#E8EDE9',
                background: signal === s ? signalColors[s] + '15' : 'white',
                color: signal === s ? signalColors[s] : '#9BB0A1',
              }}
            >{s}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Confidence Score: <span className="font-bold text-[#1C3B2E]">{confidence}/100</span></label>
          <input type="range" min="0" max="100" value={confidence} onChange={e => setConfidence(Number(e.target.value))}
            className="w-full accent-[#2E6B4F]" />
        </div>
        <div>
          <label className={labelCls}>Team Score: <span className="font-bold text-[#1C3B2E]">{teamScore}/100</span></label>
          <input type="range" min="0" max="100" value={teamScore} onChange={e => setTeamScore(Number(e.target.value))}
            className="w-full accent-[#2E6B4F]" />
        </div>
      </div>

      <div>
        <label className={labelCls}>Signal Rationale *</label>
        <textarea className={inputCls + ' resize-none'} rows={3} value={rationale} onChange={e => setRationale(e.target.value)} required
          placeholder="Why this signal? Key reasoning for the GO/HOLD/PASS decision." />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Bull Case <span className="text-[#9BB0A1] font-normal">(one point per line)</span></label>
          <textarea className={inputCls + ' resize-none'} rows={4} value={bullPoints} onChange={e => setBullPoints(e.target.value)}
            placeholder={"Category-defining product\nStrong founding team\nFirst-mover advantage"} />
        </div>
        <div>
          <label className={labelCls}>Bear Case <span className="text-[#9BB0A1] font-normal">(one point per line)</span></label>
          <textarea className={inputCls + ' resize-none'} rows={4} value={bearPoints} onChange={e => setBearPoints(e.target.value)}
            placeholder={"Revenue leadership gap\nHigh founder dependency\nMarket still nascent"} />
        </div>
      </div>
    </StepFormShell>
  );
}
