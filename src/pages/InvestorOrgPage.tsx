import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Search, Loader2, AlertCircle, CheckCircle2, AlertTriangle,
  XCircle, ChevronRight, TrendingUp, Users, Building2, Target, BarChart3,
  Shield, Zap, RefreshCw,
} from 'lucide-react';
import * as d3 from 'd3';
import { CactusLogo } from '../components/CactusLogo';
import { orgFromLinkedin } from '../lib/api';
import { investorOrg, type InvestorAnalysisResult } from '../lib/api';
import type { OrgChart } from '../types';

// ── Types ──────────────────────────────────────────────────────
interface OrgNode {
  name: string;
  title: string;
  department?: string;
  linkedin?: string;
  children?: OrgNode[];
}

// ── D3 Org Tree ────────────────────────────────────────────────
function OrgTree({ data, highlight }: { data: OrgNode; highlight?: string[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const el = svgRef.current;
    d3.select(el).selectAll('*').remove();

    const root = d3.hierarchy(data);
    const nodeCount = root.descendants().length;
    const nodeH = 70;
    const nodeW = 180;
    const treeLayout = d3.tree<OrgNode>()
      .nodeSize([nodeH, nodeW + 40]);

    treeLayout(root);

    let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
    root.descendants().forEach(d => {
      const x = (d as d3.HierarchyPointNode<OrgNode>).x;
      const y = (d as d3.HierarchyPointNode<OrgNode>).y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });

    const pad = 20;
    const svgW = maxY - minY + nodeW + pad * 2;
    const svgH = maxX - minX + nodeH + pad * 2;

    const svg = d3.select(el)
      .attr('width', svgW)
      .attr('height', svgH)
      .append('g')
      .attr('transform', `translate(${-minY + pad},${-minX + nodeH / 2 + pad})`);

    // Links
    svg.selectAll('path.link')
      .data(root.links())
      .join('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', '#334155')
      .attr('stroke-width', 1.5)
      .attr('d', d3.linkHorizontal<d3.HierarchyPointLink<OrgNode>, d3.HierarchyPointNode<OrgNode>>()
        .x(n => n.y)
        .y(n => n.x) as unknown as (d: d3.HierarchyLink<OrgNode>) => string
      );

    const levelColors = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

    const node = svg.selectAll('g.node')
      .data(root.descendants())
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${(d as d3.HierarchyPointNode<OrgNode>).y},${(d as d3.HierarchyPointNode<OrgNode>).x})`);

    const isHighlighted = (d: d3.HierarchyNode<OrgNode>) =>
      highlight?.some(name => d.data.name?.toLowerCase().includes(name.toLowerCase()) ||
        d.data.title?.toLowerCase().includes(name.toLowerCase())) ?? false;

    node.append('rect')
      .attr('x', 4)
      .attr('y', -24)
      .attr('width', nodeW - 8)
      .attr('height', 48)
      .attr('rx', 6)
      .attr('fill', d => isHighlighted(d) ? '#fef3c7' : '#1e293b')
      .attr('stroke', d => isHighlighted(d) ? '#f59e0b' : levelColors[Math.min(d.depth, levelColors.length - 1)])
      .attr('stroke-width', d => isHighlighted(d) ? 2 : 1);

    node.append('text')
      .attr('x', nodeW / 2)
      .attr('y', -7)
      .attr('text-anchor', 'middle')
      .attr('fill', '#f8fafc')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text(d => d.data.name ? (d.data.name.length > 18 ? d.data.name.slice(0, 16) + '…' : d.data.name) : '');

    node.append('text')
      .attr('x', nodeW / 2)
      .attr('y', 9)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', '9px')
      .text(d => d.data.title ? (d.data.title.length > 22 ? d.data.title.slice(0, 20) + '…' : d.data.title) : '');

    // Depth badge
    node.append('circle')
      .attr('cx', 4)
      .attr('cy', -24)
      .attr('r', 8)
      .attr('fill', d => levelColors[Math.min(d.depth, levelColors.length - 1)]);

    node.append('text')
      .attr('x', 4)
      .attr('y', -21)
      .attr('text-anchor', 'middle')
      .attr('fill', '#0f172a')
      .attr('font-size', '8px')
      .attr('font-weight', '700')
      .text(d => String(d.depth));

    void nodeCount; // suppress unused
  }, [data, highlight]);

  return (
    <div className="overflow-auto bg-slate-900 rounded-xl p-4 min-h-64">
      <svg ref={svgRef} style={{ display: 'block' }} />
    </div>
  );
}

// ── Score Ring ─────────────────────────────────────────────────
function ScoreRing({ value, label, color }: { value: number; label: string; color: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const fill = circ - (value / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={fill}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '44px 44px', transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x="44" y="48" textAnchor="middle" fill="white" fontSize="18" fontWeight="700">{value}</text>
      </svg>
      <span className="text-xs text-slate-400 text-center leading-tight">{label}</span>
    </div>
  );
}

// ── Signal Badge ───────────────────────────────────────────────
function SignalBadge({ type }: { type: 'positive' | 'warning' | 'critical' }) {
  if (type === 'positive') return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />;
  if (type === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />;
  return <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />;
}

// ── Industry options ───────────────────────────────────────────
const INDUSTRIES = [
  { value: 'saas', label: 'SaaS / Software' },
  { value: 'fintech', label: 'Fintech' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'healthtech', label: 'Healthtech' },
  { value: 'deeptech', label: 'Deep Tech' },
  { value: 'logistics', label: 'Logistics' },
];

// ── Main Page ──────────────────────────────────────────────────
export function InvestorOrgPage() {
  const [companyName, setCompanyName] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [domain, setDomain] = useState('');
  const [industry, setIndustry] = useState('saas');

  const [phase, setPhase] = useState<'idle' | 'fetching-org' | 'analysing' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const [orgData, setOrgData] = useState<OrgNode | null>(null);
  const [result, setResult] = useState<InvestorAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'gaps' | 'ideal' | 'people'>('overview');
  const [highlightNames, setHighlightNames] = useState<string[]>([]);

  const handleRun = useCallback(async () => {
    if (!linkedinUrl.trim() && !domain.trim()) {
      setError('Enter a LinkedIn URL or domain to fetch the org.');
      return;
    }
    setError(null);
    setOrgData(null);
    setResult(null);
    setHighlightNames([]);

    // Step 1: fetch org tree from Lusha via backend
    setPhase('fetching-org');
    let tree: OrgNode;
    try {
      const res = await orgFromLinkedin.build(
        { name: companyName || 'Target Company', linkedinUrl: linkedinUrl, website: domain },
        []
      );
      const charts = res.orgCharts as Record<string, OrgChart>;
      const firstKey = res.companyNames[0];
      const chart = firstKey ? charts[firstKey] : null;
      if (!chart) throw new Error('No org data returned from Lusha');
      tree = (chart.orgTree ?? chart) as unknown as OrgNode;
      setOrgData(tree);
    } catch (err) {
      setPhase('error');
      setError(err instanceof Error ? err.message : 'Failed to fetch org chart');
      return;
    }

    // Step 2: run investor analysis
    setPhase('analysing');
    try {
      const analysis = await investorOrg.analyse(
        tree as unknown as Record<string, unknown>,
        industry,
        companyName || 'Target Company',
        domain || undefined
      );
      setResult(analysis);
      setPhase('done');
    } catch (err) {
      setPhase('error');
      setError(err instanceof Error ? err.message : 'Analysis failed');
    }
  }, [companyName, linkedinUrl, domain, industry]);

  const verdictColor = result?.analysis.verdict === 'pass'
    ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
    : result?.analysis.verdict === 'watchlist'
    ? 'text-amber-400 border-amber-500/40 bg-amber-500/10'
    : 'text-red-400 border-red-500/40 bg-red-500/10';

  const verdictIcon = result?.analysis.verdict === 'pass'
    ? <CheckCircle2 className="w-5 h-5" />
    : result?.analysis.verdict === 'watchlist'
    ? <AlertTriangle className="w-5 h-5" />
    : <XCircle className="w-5 h-5" />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <CactusLogo size="sm" />
          <div>
            <h1 className="text-lg font-bold text-white">Investor Org Intelligence</h1>
            <p className="text-xs text-slate-400">Org structure analysis & investment signals</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Input Card */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-5">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Target className="w-4 h-4" /> Company Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Company Name</label>
              <input
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="e.g. Razorpay"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">LinkedIn URL</label>
              <input
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="linkedin.com/company/..."
                value={linkedinUrl}
                onChange={e => setLinkedinUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Domain (optional)</label>
              <input
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="razorpay.com"
                value={domain}
                onChange={e => setDomain(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Industry / Sector</label>
              <select
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                value={industry}
                onChange={e => setIndustry(e.target.value)}
              >
                {INDUSTRIES.map(i => (
                  <option key={i.value} value={i.value}>{i.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRun}
              disabled={phase === 'fetching-org' || phase === 'analysing'}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
            >
              {(phase === 'fetching-org' || phase === 'analysing')
                ? <><Loader2 className="w-4 h-4 animate-spin" /> {phase === 'fetching-org' ? 'Fetching org…' : 'Analysing…'}</>
                : <><Search className="w-4 h-4" /> Run Analysis</>
              }
            </button>
            {result && (
              <button
                onClick={handleRun}
                className="flex items-center gap-2 border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white px-4 py-2.5 rounded-lg text-sm transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> Re-run
              </button>
            )}
          </div>
          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
            </div>
          )}
        </div>

        {/* Phase indicators */}
        {(phase === 'fetching-org' || phase === 'analysing') && (
          <div className="bg-slate-900 rounded-2xl border border-amber-500/20 p-6">
            <div className="flex items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              <div>
                <p className="text-white font-semibold">
                  {phase === 'fetching-org' ? 'Fetching org chart from Lusha…' : 'Running investor analysis with AI…'}
                </p>
                <p className="text-slate-400 text-sm mt-0.5">
                  {phase === 'fetching-org'
                    ? 'Pulling leadership data for the company'
                    : 'Benchmarking against ideal ' + INDUSTRIES.find(i => i.value === industry)?.label + ' org'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Org tree */}
        {orgData && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4" /> Org Structure
            </h2>
            <OrgTree data={orgData} highlight={highlightNames} />
          </div>
        )}

        {/* Analysis results */}
        {result && (
          <div className="space-y-6">
            {/* Verdict + Scores */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Verdict */}
              <div className={`bg-slate-900 rounded-2xl border p-6 flex flex-col gap-3 ${verdictColor}`}>
                <div className="flex items-center gap-2 font-bold text-lg uppercase">
                  {verdictIcon}
                  {result.analysis.verdict}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{result.analysis.verdict_reason}</p>
                <p className="text-sm text-slate-400 leading-relaxed mt-1">{result.analysis.executive_summary}</p>
              </div>

              {/* Score rings */}
              <div className="lg:col-span-2 bg-slate-900 rounded-2xl border border-slate-800 p-6">
                <h3 className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Org Health Scores
                </h3>
                <div className="flex flex-wrap gap-6 justify-around">
                  <ScoreRing value={result.scores.overallScore} label="Overall Health" color="#f59e0b" />
                  <ScoreRing value={result.scores.completeness} label="Role Completeness" color="#10b981" />
                  <ScoreRing value={result.scores.spanScore} label="Span of Control" color="#3b82f6" />
                  <ScoreRing value={Math.round(Math.min(result.scores.depts, 8) / 8 * 100)} label="Dept Coverage" color="#8b5cf6" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div className="bg-slate-800 rounded-lg p-2">
                    <div className="text-xl font-bold text-white">{result.scores.levels}</div>
                    <div className="text-xs text-slate-400">Hierarchy Levels</div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-2">
                    <div className="text-xl font-bold text-white">{result.scores.depts}</div>
                    <div className="text-xs text-slate-400">Departments</div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-2">
                    <div className="text-xl font-bold text-white">{result.scores.ceoDirectReports}</div>
                    <div className="text-xs text-slate-400">CEO Direct Reports</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="flex border-b border-slate-800">
                {([
                  { key: 'overview', label: 'Investment Signals', icon: <TrendingUp className="w-4 h-4" /> },
                  { key: 'gaps', label: 'Org Gaps', icon: <AlertTriangle className="w-4 h-4" /> },
                  { key: 'ideal', label: 'Ideal Benchmark', icon: <Shield className="w-4 h-4" /> },
                  { key: 'people', label: 'People Analysis', icon: <Users className="w-4 h-4" /> },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 ${
                      activeTab === tab.key
                        ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-3">
                    {result.analysis.investment_signals.map((sig, i) => (
                      <div key={i} className={`flex gap-3 p-4 rounded-xl border ${
                        sig.type === 'positive' ? 'bg-emerald-500/5 border-emerald-500/20' :
                        sig.type === 'warning'  ? 'bg-amber-500/5 border-amber-500/20' :
                                                   'bg-red-500/5 border-red-500/20'
                      }`}>
                        <SignalBadge type={sig.type} />
                        <div>
                          <div className="text-sm font-semibold text-white">{sig.title}</div>
                          <div className="text-sm text-slate-400 mt-0.5">{sig.detail}</div>
                        </div>
                      </div>
                    ))}
                    {result.analysis.top_actions.length > 0 && (
                      <div className="mt-6 bg-slate-800 rounded-xl p-4">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5" /> Top Recommended Actions
                        </h4>
                        <ol className="space-y-2">
                          {result.analysis.top_actions.map((action, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                              <span className="text-amber-400 font-bold shrink-0">{i + 1}.</span>
                              {action}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}

                {/* Gaps Tab */}
                {activeTab === 'gaps' && (
                  <div className="space-y-6">
                    {result.missingRoles.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                          <XCircle className="w-4 h-4" /> Missing Critical Roles ({result.missingRoles.length})
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {result.missingRoles.map(role => (
                            <span key={role} className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs px-3 py-1 rounded-full">
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> Level-by-Level Analysis
                      </h3>
                      <div className="space-y-4">
                        {result.analysis.level_analysis.map(lv => (
                          <div key={lv.level} className="bg-slate-800 rounded-xl p-4 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded font-mono">L{lv.level}</span>
                              <span className="text-white font-semibold text-sm">{lv.label}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-emerald-400 text-xs font-medium">Strength: </span>
                                <span className="text-slate-300">{lv.strength}</span>
                              </div>
                              <div>
                                <span className="text-amber-400 text-xs font-medium">Gap: </span>
                                <span className="text-slate-300">{lv.gap}</span>
                              </div>
                            </div>
                            {lv.missing_kpis.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {lv.missing_kpis.map(kpi => (
                                  <span key={kpi} className="bg-slate-700 text-slate-400 text-xs px-2 py-0.5 rounded">
                                    {kpi}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Ideal Benchmark Tab */}
                {activeTab === 'ideal' && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {result.matchedRoles.map(mr => (
                        <div key={mr.role} className={`flex items-center gap-3 p-3 rounded-lg border ${
                          mr.present ? 'bg-emerald-500/5 border-emerald-500/20' :
                          mr.partial  ? 'bg-amber-500/5 border-amber-500/20' :
                                        'bg-red-500/5 border-red-500/20'
                        }`}>
                          {mr.present
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            : mr.partial
                            ? <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                            : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                          <span className="text-sm text-slate-300 flex-1">{mr.role}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            mr.present ? 'text-emerald-400 bg-emerald-500/10' :
                            mr.partial  ? 'text-amber-400 bg-amber-500/10' :
                                          'text-red-400 bg-red-500/10'
                          }`}>
                            {mr.present ? 'Present' : mr.partial ? 'Partial' : 'Missing'}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                        <Building2 className="w-4 h-4" /> Expected KPIs by Level
                      </h3>
                      <div className="space-y-3">
                        {Object.entries(result.levelKpis).map(([level, kpis]) => (
                          <div key={level} className="bg-slate-800 rounded-xl p-4">
                            <div className="text-xs font-semibold text-slate-400 mb-2">
                              Level {level} — {['C-Suite', 'VP/Director', 'Manager/Lead', 'Individual Contributor'][+level] ?? `Level ${level}`}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {kpis.map(kpi => (
                                <span key={kpi} className="bg-slate-700 text-slate-300 text-xs px-2.5 py-1 rounded-full">{kpi}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* People Tab */}
                {activeTab === 'people' && (
                  <div className="space-y-3">
                    {result.analysis.person_analysis.length === 0 && (
                      <p className="text-slate-400 text-sm">No person-level analysis available.</p>
                    )}
                    {result.analysis.person_analysis.map((p, i) => (
                      <div
                        key={i}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          p.risk === 'high'   ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40' :
                          p.risk === 'medium' ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40' :
                                                'bg-slate-800 border-slate-700 hover:border-slate-600'
                        }`}
                        onClick={() => {
                          setHighlightNames(prev =>
                            prev.includes(p.name) ? prev.filter(n => n !== p.name) : [...prev, p.name]
                          );
                          setActiveTab('people');
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-white text-sm">{p.name}</span>
                              <span className="text-slate-400 text-xs">{p.title}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                p.risk === 'high'   ? 'bg-red-500/20 text-red-300' :
                                p.risk === 'medium' ? 'bg-amber-500/20 text-amber-300' :
                                                      'bg-emerald-500/20 text-emerald-300'
                              }`}>
                                {p.risk} risk
                              </span>
                            </div>
                            <p className="text-slate-400 text-xs mt-1">{p.note}</p>
                            {p.responsibility_gap && (
                              <p className="text-amber-300 text-xs mt-1">
                                <span className="font-medium">Gap: </span>{p.responsibility_gap}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 mt-1" />
                        </div>
                        {p.missing_kpis.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {p.missing_kpis.map(kpi => (
                              <span key={kpi} className="bg-slate-700/60 text-slate-400 text-xs px-2 py-0.5 rounded">
                                {kpi}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {highlightNames.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-amber-400 mt-2">
                        <span>Highlighting in org tree: {highlightNames.join(', ')}</span>
                        <button onClick={() => setHighlightNames([])} className="underline">Clear</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
