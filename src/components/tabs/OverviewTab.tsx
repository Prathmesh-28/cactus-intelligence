import { ExternalLink, Minus } from 'lucide-react';
import type { ApiAnalysis } from '../../lib/api';
import { analyses } from '../../lib/api';
import { EditableField, EditableList } from '../EditableField';
import { useAuth } from '../../context/AuthContext';

const THREAT_COLORS = {
  high: { bg: 'bg-[#C0392B]/10', text: 'text-[#C0392B]', border: 'border-[#C0392B]/20', label: 'High Threat' },
  medium: { bg: 'bg-[#E67E22]/10', text: 'text-[#E67E22]', border: 'border-[#E67E22]/20', label: 'Medium' },
  low: { bg: 'bg-[#27AE60]/10', text: 'text-[#27AE60]', border: 'border-[#27AE60]/20', label: 'Low' },
};

interface OverviewTabProps {
  analysis: ApiAnalysis;
  onUpdate: (analysis: ApiAnalysis) => void;
}

export function OverviewTab({ analysis, onUpdate }: OverviewTabProps) {
  const profile = analysis.company_profile as Record<string, unknown> | null;
  const competitors = (analysis.competitors?.competitors ?? []) as Record<string, unknown>[];
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'analyst';

  const saveProfileField = async (field: string, value: unknown) => {
    const updated = { ...(profile ?? {}), [field]: value };
    await analyses.patchProfile(analysis.id, updated);
    onUpdate({ ...analysis, company_profile: updated });
  };

  const saveCompetitorField = async (idx: number, field: string, value: unknown) => {
    const updatedList = competitors.map((c, i) => i === idx ? { ...c, [field]: value } : c);
    await analyses.patchCompetitors(analysis.id, { competitors: updatedList });
    onUpdate({ ...analysis, competitors: { competitors: updatedList } });
  };

  if (!profile) return <EmptyState />;

  return (
    <div className="space-y-8">
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Employees', field: 'employeeCount', value: profile.employeeCount },
          { label: 'Funding Stage', field: 'fundingStage', value: profile.fundingStage },
          { label: 'Total Raised', field: 'totalRaised', value: profile.totalRaised },
          { label: 'Founded', field: 'founded', value: profile.founded },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[#E8EDE9] rounded-xl p-5 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-[#4A5E52] mb-1">{s.label}</p>
            <EditableField
              value={String(s.value ?? '')}
              onSave={v => saveProfileField(s.field, s.field === 'founded' ? Number(v) : v)}
              canEdit={canEdit}
              label={s.label}
              className="text-xl font-semibold text-[#0F1A14]"
            />
          </div>
        ))}
      </div>

      {/* Description */}
      <div className="bg-white border border-[#E8EDE9] rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-[#0F1A14] mb-3 uppercase tracking-wide">Company Overview</h3>
        <EditableField
          value={String(profile.description ?? '')}
          onSave={v => saveProfileField('description', v)}
          canEdit={canEdit}
          multiline
          label="description"
          className="text-sm text-[#4A5E52] leading-relaxed block w-full mb-4"
        />
        <div>
          <p className="text-xs text-[#9BB0A1] mb-2 uppercase tracking-wide">Key Products</p>
          <EditableList
            items={(profile.keyProducts as string[]) ?? []}
            onSave={v => saveProfileField('keyProducts', v)}
            canEdit={canEdit}
            itemClassName="px-2.5 py-1 bg-[#F0F7F2] border border-[#D4E0D7] rounded-full text-xs text-[#2E6B4F]"
          />
        </div>
      </div>

      {/* CEO */}
      <div className="bg-white border border-[#E8EDE9] rounded-xl p-5 shadow-sm">
        <p className="text-xs uppercase tracking-widest text-[#4A5E52] mb-1">CEO</p>
        <EditableField
          value={String(profile.ceo ?? '')}
          onSave={v => saveProfileField('ceo', v)}
          canEdit={canEdit}
          label="CEO"
          className="text-lg font-semibold text-[#0F1A14]"
        />
      </div>

      {/* Competitive landscape */}
      {competitors.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[#0F1A14] mb-4 uppercase tracking-wide">Competitive Landscape</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {competitors.map((c, idx) => {
              const threat = THREAT_COLORS[(c.threatLevel as keyof typeof THREAT_COLORS) ?? 'medium'];
              return (
                <div key={idx} className="bg-white border border-[#E8EDE9] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <EditableField
                        value={String(c.name ?? '')}
                        onSave={v => saveCompetitorField(idx, 'name', v)}
                        canEdit={canEdit}
                        className="font-semibold text-[#0F1A14] text-sm"
                      />
                      <EditableField
                        value={String(c.hq ?? '')}
                        onSave={v => saveCompetitorField(idx, 'hq', v)}
                        canEdit={canEdit}
                        className="text-xs text-[#4A5E52]"
                      />
                    </div>
                    <select
                      value={String(c.threatLevel ?? 'medium')}
                      onChange={e => saveCompetitorField(idx, 'threatLevel', e.target.value)}
                      disabled={!canEdit}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium border cursor-pointer outline-none ${threat.bg} ${threat.text} ${threat.border}`}
                    >
                      <option value="high">High Threat</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 text-xs text-[#4A5E52]">
                    {[
                      { label: 'Funding', field: 'totalRaised' },
                      { label: 'Stage', field: 'fundingStage' },
                      { label: 'Employees', field: 'employees' },
                      { label: 'CEO', field: 'ceo' },
                    ].map(row => (
                      <div key={row.field} className="flex justify-between items-center">
                        <span>{row.label}</span>
                        <EditableField
                          value={String(c[row.field] ?? '')}
                          onSave={v => saveCompetitorField(idx, row.field, v)}
                          canEdit={canEdit}
                          className="font-medium text-[#0F1A14] text-right"
                        />
                      </div>
                    ))}
                  </div>
                  {Boolean(c.differentiator) && (
                    <div className="mt-3 pt-3 border-t border-[#E8EDE9]">
                      <EditableField
                        value={String(c.differentiator)}
                        onSave={v => saveCompetitorField(idx, 'differentiator', v)}
                        canEdit={canEdit}
                        multiline
                        className="text-xs text-[#4A5E52] italic"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent intelligence */}
      {(profile.recentNews as unknown[])?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[#0F1A14] mb-4 uppercase tracking-wide">Recent Intelligence</h3>
          <div className="bg-white border border-[#E8EDE9] rounded-xl overflow-hidden shadow-sm">
            {(profile.recentNews as Array<{ headline: string; date: string; url: string }>).map((n, i, arr) => (
              <div key={i} className={`flex items-start gap-4 px-5 py-4 ${i < arr.length - 1 ? 'border-b border-[#E8EDE9]' : ''}`}>
                <div className="w-1.5 h-1.5 rounded-full bg-[#2E6B4F] mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#0F1A14] leading-snug">{n.headline}</p>
                  <p className="text-xs text-[#9BB0A1] mt-1">{n.date}</p>
                </div>
                {n.url && n.url !== '#' && (
                  <a href={n.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[#2E6B4F] hover:text-[#1C3B2E]">
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-full bg-[#E8EDE9] flex items-center justify-center mb-4">
        <Minus size={20} className="text-[#4A5E52]" />
      </div>
      <h3 className="text-base font-semibold text-[#0F1A14] mb-2">Limited public data available</h3>
      <p className="text-sm text-[#4A5E52] max-w-sm">We couldn't find enough public information for this company.</p>
    </div>
  );
}
