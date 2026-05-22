import { AlertTriangle, TrendingUp, TrendingDown, Minus, User, Briefcase, ShieldAlert, BarChart2, Search } from 'lucide-react';
import type { ApiAnalysis } from '../../lib/api';
import { analyses } from '../../lib/api';
import type { TalentInsights } from '../../types';
import { EditableField } from '../EditableField';
import { useAuth } from '../../context/AuthContext';

const RISK_COLORS = {
  high: { bg: 'bg-[#C0392B]/10', text: 'text-[#C0392B]', border: 'border-[#C0392B]/20' },
  medium: { bg: 'bg-[#E67E22]/10', text: 'text-[#E67E22]', border: 'border-[#E67E22]/20' },
  low: { bg: 'bg-[#27AE60]/10', text: 'text-[#27AE60]', border: 'border-[#27AE60]/20' },
};

const URGENCY_COLORS = {
  immediate: { bg: 'bg-[#C0392B]/10', text: 'text-[#C0392B]' },
  'near-term': { bg: 'bg-[#E67E22]/10', text: 'text-[#E67E22]' },
  strategic: { bg: 'bg-[#2E6B4F]/10', text: 'text-[#2E6B4F]' },
};

interface TalentInsightsTabProps {
  analysis: ApiAnalysis;
  onUpdate: (analysis: ApiAnalysis) => void;
}

export function TalentInsightsTab({ analysis, onUpdate }: TalentInsightsTabProps) {
  const insights = analysis.talent_insights as unknown as TalentInsights | null;
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'analyst';

  const save = async (updated: TalentInsights) => {
    await analyses.patchTalent(analysis.id, updated);
    onUpdate({ ...analysis, talent_insights: updated as unknown as Record<string, unknown> });
  };

  const saveGap = async (idx: number, field: string, value: string) => {
    const gaps = insights!.talentGaps.map((g, i) => i === idx ? { ...g, [field]: value } : g);
    await save({ ...insights!, talentGaps: gaps });
  };

  const saveRisk = async (idx: number, field: string, value: string) => {
    const risks = insights!.keyManRisk.map((r, i) => i === idx ? { ...r, [field]: value } : r);
    await save({ ...insights!, keyManRisk: risks });
  };

  const saveRec = async (idx: number, field: string, value: string) => {
    const recs = insights!.hiringRecommendations.map((r, i) => i === idx ? { ...r, [field]: value } : r);
    await save({ ...insights!, hiringRecommendations: recs });
  };

  const saveVelocity = async (idx: number, field: string, value: string) => {
    const vels = insights!.hiringVelocity.map((v, i) => i === idx ? { ...v, [field]: value } : v);
    await save({ ...insights!, hiringVelocity: vels });
  };

  const saveLeadership = async (idx: number, field: string, value: string) => {
    const lqs = insights!.leadershipQuality.map((lq, i) => i === idx ? { ...lq, [field]: Number(value) } : lq);
    await save({ ...insights!, leadershipQuality: lqs });
  };

  const savePoaching = async (idx: number, field: string, value: string) => {
    const risks = insights!.poachingRisk.map((p, i) => i === idx ? { ...p, [field]: value } : p);
    await save({ ...insights!, poachingRisk: risks });
  };

  if (!insights) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-[#4A5E52]">Talent insights data is not yet available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Left column */}
      <div className="space-y-6">
        {/* Talent gap analysis */}
        {insights.talentGaps?.length > 0 && (
          <div className="bg-white border border-[#E8EDE9] rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-[#E8EDE9] bg-[#FAFCFA]">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[#4A5E52]">Talent Gap Analysis</h3>
            </div>
            <div className="divide-y divide-[#E8EDE9]">
              {insights.talentGaps.map((gap, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${gap.severity === 'critical' ? 'bg-[#C0392B]' : gap.severity === 'moderate' ? 'bg-[#E67E22]' : 'bg-[#27AE60]'}`} />
                  <div className="flex-1 min-w-0">
                    <EditableField
                      value={gap.role}
                      onSave={v => saveGap(i, 'role', v)}
                      canEdit={canEdit}
                      className="text-sm font-medium text-[#0F1A14]"
                    />
                    <p className="text-xs text-[#4A5E52]">{gap.company}</p>
                  </div>
                  {canEdit ? (
                    <select
                      value={gap.severity}
                      onChange={e => saveGap(i, 'severity', e.target.value)}
                      className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium outline-none cursor-pointer ${gap.severity === 'critical' ? 'bg-[#C0392B]/10 text-[#C0392B]' : gap.severity === 'moderate' ? 'bg-[#E67E22]/10 text-[#E67E22]' : 'bg-[#27AE60]/10 text-[#27AE60]'}`}
                    >
                      <option value="critical">critical</option>
                      <option value="moderate">moderate</option>
                      <option value="minor">minor</option>
                    </select>
                  ) : (
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${gap.severity === 'critical' ? 'bg-[#C0392B]/10 text-[#C0392B]' : gap.severity === 'moderate' ? 'bg-[#E67E22]/10 text-[#E67E22]' : 'bg-[#27AE60]/10 text-[#27AE60]'}`}>
                      {gap.severity}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key-man risk */}
        {insights.keyManRisk?.length > 0 && (
          <div className="bg-white border border-[#E8EDE9] rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-[#E8EDE9] bg-[#FAFCFA] flex items-center gap-2">
              <AlertTriangle size={14} className="text-[#E67E22]" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[#4A5E52]">Key-Man Risk</h3>
            </div>
            <div className="divide-y divide-[#E8EDE9]">
              {insights.keyManRisk.map((r, i) => {
                const c = RISK_COLORS[r.riskLevel ?? 'medium'];
                return (
                  <div key={i} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className="text-sm font-medium text-[#0F1A14]">{r.name}</span>
                        <span className="text-xs text-[#4A5E52] ml-2">· {r.title}</span>
                      </div>
                      {canEdit ? (
                        <select
                          value={r.riskLevel ?? 'medium'}
                          onChange={e => saveRisk(i, 'riskLevel', e.target.value)}
                          className={`text-xs px-2 py-0.5 rounded-full font-medium border outline-none cursor-pointer ${c.bg} ${c.text} ${c.border}`}
                        >
                          <option value="high">high risk</option>
                          <option value="medium">medium risk</option>
                          <option value="low">low risk</option>
                        </select>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${c.bg} ${c.text} ${c.border}`}>
                          {r.riskLevel} risk
                        </span>
                      )}
                    </div>
                    <EditableField
                      value={r.reason}
                      onSave={v => saveRisk(i, 'reason', v)}
                      canEdit={canEdit}
                      multiline
                      className="text-xs text-[#4A5E52]"
                    />
                    <p className="text-xs text-[#9BB0A1] mt-0.5">{r.company}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Hiring recommendations */}
        {insights.hiringRecommendations?.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#4A5E52]">Top Hiring Recommendations</h3>
            {insights.hiringRecommendations.map((rec, i) => {
              const u = URGENCY_COLORS[rec.urgency ?? 'strategic'];
              return (
                <div key={i} className="bg-white border border-[#E8EDE9] rounded-xl p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Briefcase size={14} className="text-[#2E6B4F]" />
                      <EditableField
                        value={rec.role}
                        onSave={v => saveRec(i, 'role', v)}
                        canEdit={canEdit}
                        className="text-sm font-semibold text-[#0F1A14]"
                      />
                    </div>
                    {canEdit ? (
                      <select
                        value={rec.urgency ?? 'strategic'}
                        onChange={e => saveRec(i, 'urgency', e.target.value)}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize outline-none cursor-pointer ${u.bg} ${u.text}`}
                      >
                        <option value="immediate">immediate</option>
                        <option value="near-term">near-term</option>
                        <option value="strategic">strategic</option>
                      </select>
                    ) : (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${u.bg} ${u.text}`}>{rec.urgency}</span>
                    )}
                  </div>
                  <EditableField
                    value={rec.rationale}
                    onSave={v => saveRec(i, 'rationale', v)}
                    canEdit={canEdit}
                    multiline
                    className="text-xs text-[#4A5E52] leading-relaxed"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right column */}
      <div className="space-y-6">
        {/* Hiring velocity */}
        {insights.hiringVelocity?.length > 0 && (
          <div className="bg-white border border-[#E8EDE9] rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-[#E8EDE9] bg-[#FAFCFA]">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[#4A5E52]">Hiring Velocity</h3>
            </div>
            <div className="divide-y divide-[#E8EDE9]">
              {insights.hiringVelocity.map((v, i) => {
                const icon = v.trend === 'growing'
                  ? <TrendingUp size={16} className="text-[#27AE60]" />
                  : v.trend === 'shrinking'
                  ? <TrendingDown size={16} className="text-[#C0392B]" />
                  : <Minus size={16} className="text-[#4A5E52]" />;
                return (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    {icon}
                    <span className="flex-1 text-sm text-[#0F1A14]">{v.company}</span>
                    <EditableField
                      value={v.growthRate}
                      onSave={val => saveVelocity(i, 'growthRate', val)}
                      canEdit={canEdit}
                      className={`text-xs font-medium ${v.trend === 'growing' ? 'text-[#27AE60]' : v.trend === 'shrinking' ? 'text-[#C0392B]' : 'text-[#4A5E52]'}`}
                    />
                    {canEdit ? (
                      <select
                        value={v.trend}
                        onChange={e => saveVelocity(i, 'trend', e.target.value)}
                        className={`text-xs px-2 py-0.5 rounded-full capitalize ml-2 outline-none cursor-pointer ${v.trend === 'growing' ? 'bg-[#27AE60]/10 text-[#27AE60]' : v.trend === 'shrinking' ? 'bg-[#C0392B]/10 text-[#C0392B]' : 'bg-[#E8EDE9] text-[#4A5E52]'}`}
                      >
                        <option value="growing">growing</option>
                        <option value="stable">stable</option>
                        <option value="shrinking">shrinking</option>
                      </select>
                    ) : (
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ml-2 ${v.trend === 'growing' ? 'bg-[#27AE60]/10 text-[#27AE60]' : v.trend === 'shrinking' ? 'bg-[#C0392B]/10 text-[#C0392B]' : 'bg-[#E8EDE9] text-[#4A5E52]'}`}>
                        {v.trend}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Leadership quality */}
        {insights.leadershipQuality?.length > 0 && (
          <div className="bg-white border border-[#E8EDE9] rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-[#E8EDE9] bg-[#FAFCFA]">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[#4A5E52]">Leadership Pedigree</h3>
            </div>
            <div className="px-5 py-4 space-y-4">
              {insights.leadershipQuality.map((lq, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-[#0F1A14]">{lq.company}</span>
                    <div className="flex items-center gap-1 text-xs text-[#4A5E52]">
                      <EditableField
                        value={String(lq.tier1Percentage)}
                        onSave={v => saveLeadership(i, 'tier1Percentage', v)}
                        canEdit={canEdit}
                        className="text-xs text-[#4A5E52]"
                      />
                      <span>% Tier-1</span>
                    </div>
                  </div>
                  <div className="h-2 bg-[#E8EDE9] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${lq.tier1Percentage}%`,
                        background: lq.tier1Percentage > 60 ? '#27AE60' : lq.tier1Percentage > 30 ? '#E67E22' : '#C0392B',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Poaching risk */}
        {insights.poachingRisk?.length > 0 && (
          <div className="bg-white border border-[#E8EDE9] rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-[#E8EDE9] bg-[#FAFCFA] flex items-center gap-2">
              <User size={14} className="text-[#E67E22]" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[#4A5E52]">Talent Poaching Risk</h3>
            </div>
            <div className="divide-y divide-[#E8EDE9]">
              {insights.poachingRisk.map((p, i) => (
                <div key={i} className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#0F1A14]">{p.name}</p>
                    <span className="text-xs text-[#4A5E52]">· {p.title}</span>
                  </div>
                  <EditableField
                    value={p.reason}
                    onSave={v => savePoaching(i, 'reason', v)}
                    canEdit={canEdit}
                    multiline
                    className="text-xs text-[#4A5E52] mt-0.5"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* ── Full-width sections below the 2-col grid ─────────── */}

    {/* Governance Risks */}
    {(insights.governanceRisks?.length ?? 0) > 0 && (
      <div className="bg-white border border-[#E8EDE9] rounded-xl overflow-hidden shadow-sm mt-6">
        <div className="px-5 py-3 border-b border-[#E8EDE9] bg-[#C0392B]/5 flex items-center gap-2">
          <ShieldAlert size={14} className="text-[#C0392B]" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#C0392B]">Governance Risks</h3>
        </div>
        <div className="divide-y divide-[#E8EDE9]">
          {insights.governanceRisks!.map((r, i) => {
            const sev = r.severity === 'critical' ? '#C0392B' : r.severity === 'high' ? '#E67E22' : '#4A5E52';
            return (
              <div key={i} className="p-5">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-mono font-bold text-[#9BB0A1] mt-0.5">{r.riskId}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm text-[#0F1A14]">{r.risk}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={{ background: sev + '18', color: sev }}>{r.severity}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8EDE9] text-[#4A5E52]">{r.urgency}</span>
                    </div>
                    <p className="text-xs text-[#4A5E52] mb-1">{r.description}</p>
                    <p className="text-xs text-[#C0392B] mb-1"><span className="font-semibold">Board impact:</span> {r.boardImpact}</p>
                    <p className="text-xs text-[#2E6B4F]"><span className="font-semibold">Mitigation:</span> {r.mitigation}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )}

    {/* Structural Gap Analysis — all gap categories */}
    {(['executiveGaps', 'operationalGaps', 'technicalGaps', 'revenueGaps'] as const).map(gapKey => {
      const gaps = insights[gapKey];
      if (!gaps?.length) return null;
      const labels: Record<string, { label: string; color: string }> = {
        executiveGaps:   { label: 'Executive Gaps', color: '#1C3B2E' },
        operationalGaps: { label: 'Operational Gaps', color: '#E67E22' },
        technicalGaps:   { label: 'Technical Gaps', color: '#2980B9' },
        revenueGaps:     { label: 'Revenue Gaps', color: '#8E44AD' },
      };
      const { label, color } = labels[gapKey];
      return (
        <div key={gapKey} className="bg-white border border-[#E8EDE9] rounded-xl overflow-hidden shadow-sm mt-4">
          <div className="px-5 py-3 border-b border-[#E8EDE9] bg-[#FAFCFA]">
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>{label}</h3>
          </div>
          <div className="divide-y divide-[#E8EDE9]">
            {(gaps as Record<string, unknown>[]).map((g, i) => {
              const sev = String(g.severity ?? '');
              const sevColor = sev === 'critical' ? '#C0392B' : sev === 'high' ? '#E67E22' : sev === 'medium' ? '#2980B9' : '#4A5E52';
              const id = String(g.gapId ?? `GAP-${i + 1}`);
              const title = String(g.missingRole ?? g.missingFunction ?? '');
              const observation = String(g.observation ?? '');
              const recommendation = String(g.recommendation ?? '');
              const extra = String(g.risk ?? g.riskToRevenue ?? g.scalingRisk ?? g.pipelineImpact ?? g.competitorBenchmark ?? '');
              return (
                <div key={i} className="p-5">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-mono font-bold text-[#9BB0A1] mt-0.5 shrink-0">{id}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm text-[#0F1A14]">{title}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={{ background: sevColor + '18', color: sevColor }}>{sev}</span>
                      </div>
                      <p className="text-xs text-[#4A5E52] mb-1">{observation}</p>
                      {extra && <p className="text-xs text-[#C0392B] mb-1">{extra}</p>}
                      <p className="text-xs text-[#2E6B4F]"><span className="font-semibold">Recommendation:</span> {recommendation}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    })}

    {/* Competitor Benchmark Matrix */}
    {insights.benchmarkMatrix && (
      <div className="bg-white border border-[#E8EDE9] rounded-xl overflow-hidden shadow-sm mt-4">
        <div className="px-5 py-3 border-b border-[#E8EDE9] bg-[#FAFCFA] flex items-center gap-2">
          <BarChart2 size={14} className="text-[#2E6B4F]" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#4A5E52]">Org Maturity Benchmark Matrix</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#F8F6F1] border-b border-[#E8EDE9]">
                <th className="text-left px-5 py-3 font-semibold text-[#4A5E52] uppercase tracking-wide">Company</th>
                {insights.benchmarkMatrix.functions.map(fn => (
                  <th key={fn} className="text-center px-3 py-3 font-semibold text-[#4A5E52] uppercase tracking-wide whitespace-nowrap">{fn}</th>
                ))}
                <th className="text-center px-5 py-3 font-semibold text-[#4A5E52] uppercase tracking-wide">Overall</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EDE9]">
              {insights.benchmarkMatrix.companies.map((co, i) => (
                <tr key={i} className={i === 0 ? 'bg-[#F0F7F2]' : 'hover:bg-[#FAFCFA]'}>
                  <td className="px-5 py-3 font-semibold text-[#0F1A14] whitespace-nowrap">
                    {co.company}
                    {i === 0 && <span className="ml-2 text-xs text-[#2E6B4F]">← Target</span>}
                  </td>
                  {co.scores.map((s, j) => (
                    <td key={j} className="px-3 py-3 text-center">
                      <div className="inline-flex flex-col items-center gap-1">
                        <span className="font-bold" style={{ color: s >= 70 ? '#27AE60' : s >= 45 ? '#E67E22' : '#C0392B' }}>{s}</span>
                        <div className="h-1 w-10 bg-[#E8EDE9] rounded-full">
                          <div className="h-full rounded-full" style={{ width: `${s}%`, background: s >= 70 ? '#27AE60' : s >= 45 ? '#E67E22' : '#C0392B' }} />
                        </div>
                      </div>
                    </td>
                  ))}
                  <td className="px-5 py-3 text-center">
                    <span className="text-sm font-bold" style={{ color: co.overallScore >= 70 ? '#27AE60' : co.overallScore >= 45 ? '#E67E22' : '#C0392B' }}>
                      {co.overallScore}
                    </span>
                    <p className="text-[10px] text-[#9BB0A1] mt-0.5">{co.classification}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}

    {/* Talent Prospects */}
    {(insights.talentProspects?.length ?? 0) > 0 && (
      <div className="bg-white border border-[#E8EDE9] rounded-xl overflow-hidden shadow-sm mt-4">
        <div className="px-5 py-3 border-b border-[#E8EDE9] bg-[#FAFCFA] flex items-center gap-2">
          <Search size={14} className="text-[#2E6B4F]" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#4A5E52]">Talent Prospects — Competitor Pipeline</h3>
        </div>
        <div className="divide-y divide-[#E8EDE9]">
          {insights.talentProspects!.map((p, i) => (
            <div key={i} className="flex items-start gap-4 px-5 py-4">
              <div className="w-8 h-8 rounded-full bg-[#1C3B2E]/10 flex items-center justify-center text-xs font-bold text-[#1C3B2E] shrink-0">
                {p.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-sm text-[#0F1A14]">{p.name}</p>
                  <span className="text-xs text-[#4A5E52]">· {p.title}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8EDE9] text-[#4A5E52]">{p.currentCompany}</span>
                </div>
                <p className="text-xs text-[#4A5E52] mb-1">{p.reasonForFit}</p>
                {p.linkedinUrl && (
                  <a href={p.linkedinUrl} target="_blank" rel="noopener noreferrer"
                     className="text-xs text-[#0A66C2] hover:underline">LinkedIn Profile</a>
                )}
              </div>
              {p.emailConfidence && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8EDE9] text-[#4A5E52] shrink-0">{p.emailConfidence} confidence</span>
              )}
            </div>
          ))}
        </div>
      </div>
    )}
    </div>
  );
}
