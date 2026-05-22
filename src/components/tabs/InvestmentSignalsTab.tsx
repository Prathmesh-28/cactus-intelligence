import { useEffect, useState } from 'react';
import { TrendingUp, Minus, CheckSquare, Square, AlertTriangle, Shield, ChevronUp, ChevronDown, Download, Activity, Target, Users, Map } from 'lucide-react';
import type { ApiAnalysis, ApiCheck } from '../../lib/api';
import { analyses } from '../../lib/api';
import type { InvestmentSignals } from '../../types';
import { EditableField } from '../EditableField';
import { exportPDF } from '../../lib/exportPdf';
import { useAuth } from '../../context/AuthContext';

interface InvestmentSignalsTabProps {
  analysis: ApiAnalysis;
  onUpdate: (analysis: ApiAnalysis) => void;
}

const SIGNAL_CONFIG = {
  GO: { bg: 'bg-[#27AE60]', sub: 'Favourable for Investment' },
  HOLD: { bg: 'bg-[#E67E22]', sub: 'Requires Further Diligence' },
  PASS: { bg: 'bg-[#C0392B]', sub: 'Not Recommended at This Time' },
};

const MOAT_POSITIONS = { Weak: 16, Moderate: 50, Strong: 84 };

export function InvestmentSignalsTab({ analysis, onUpdate }: InvestmentSignalsTabProps) {
  const signals = analysis.investment_signals as unknown as InvestmentSignals | null;
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'analyst';
  const [checkMap, setCheckMap] = useState<Record<string, ApiCheck>>({});
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    analyses.get(analysis.id).then(({ checks }) => {
      const map: Record<string, ApiCheck> = {};
      checks.forEach(c => { map[c.item_text] = c; });
      setCheckMap(map);
    }).catch(() => {});
  }, [analysis.id]);

  const save = async (updated: InvestmentSignals) => {
    await analyses.patchSignals(analysis.id, updated);
    onUpdate({ ...analysis, investment_signals: updated as unknown as Record<string, unknown> });
  };

  const saveField = async (field: keyof InvestmentSignals, value: unknown) => {
    await save({ ...signals!, [field]: value });
  };

  const saveBull = async (idx: number, field: 'point' | 'detail', value: string) => {
    const bullCase = signals!.bullCase.map((b, i) => i === idx ? { ...b, [field]: value } : b);
    await save({ ...signals!, bullCase });
  };

  const saveBear = async (idx: number, field: 'point' | 'detail', value: string) => {
    const bearCase = signals!.bearCase.map((b, i) => i === idx ? { ...b, [field]: value } : b);
    await save({ ...signals!, bearCase });
  };

  const saveMoat = async (field: 'rating' | 'reasoning', value: string) => {
    await save({ ...signals!, moat: { ...signals!.moat, [field]: value } });
  };

  const saveExit = async (idx: number, field: string, value: string) => {
    const comparableExits = signals!.comparableExits.map((e, i) => i === idx ? { ...e, [field]: value } : e);
    await save({ ...signals!, comparableExits });
  };

  const toggleCheck = async (itemText: string) => {
    const existing = checkMap[itemText];
    if (existing) {
      const newCompleted = !existing.completed;
      await analyses.toggleCheck(analysis.id, existing.id, newCompleted);
      setCheckMap(prev => ({ ...prev, [itemText]: { ...existing, completed: newCompleted } }));
    } else {
      await analyses.addCheck(analysis.id, itemText);
      const { checks } = await analyses.get(analysis.id);
      const map: Record<string, ApiCheck> = {};
      checks.forEach(c => { map[c.item_text] = c; });
      const newCheck = map[itemText];
      if (newCheck) {
        await analyses.toggleCheck(analysis.id, newCheck.id, true);
        map[itemText] = { ...newCheck, completed: true };
      }
      setCheckMap(map);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try { await exportPDF(analysis); } finally { setExporting(false); }
  };

  if (!signals) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-[#4A5E52]">Investment signals data is not yet available.</p>
      </div>
    );
  }

  const signalKey = (signals.signal ?? 'HOLD') as keyof typeof SIGNAL_CONFIG;
  const signalCfg = SIGNAL_CONFIG[signalKey] ?? SIGNAL_CONFIG.HOLD;
  const moatPos = MOAT_POSITIONS[signals.moat?.rating ?? 'Moderate'] ?? 50;
  const trajectoryIcon = signals.talentTrajectory === 'Improving'
    ? <ChevronUp size={18} className="text-[#27AE60]" />
    : signals.talentTrajectory === 'Declining'
    ? <ChevronDown size={18} className="text-[#C0392B]" />
    : <Minus size={18} className="text-[#4A5E52]" />;

  return (
    <div className="space-y-6" id="investment-signals-content">
      {/* GO/HOLD/PASS banner */}
      <div className={`rounded-2xl p-6 ${signalCfg.bg} flex flex-col md:flex-row items-center md:items-start justify-between gap-4`}>
        <div>
          <p className="text-sm font-medium text-white opacity-80 mb-1">Investment Signal</p>
          {canEdit ? (
            <select
              value={signals.signal ?? 'HOLD'}
              onChange={e => saveField('signal', e.target.value as InvestmentSignals['signal'])}
              className="text-5xl font-bold text-white bg-transparent border-b border-white/40 outline-none cursor-pointer"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              <option value="GO">GO</option>
              <option value="HOLD">HOLD</option>
              <option value="PASS">PASS</option>
            </select>
          ) : (
            <h2 className="text-5xl font-bold text-white" style={{ fontFamily: '"Playfair Display", serif' }}>
              {signals.signal}
            </h2>
          )}
          <p className="mt-1 text-sm text-white opacity-90">{signalCfg.sub}</p>
        </div>
        <div className="text-right">
          <div className="text-5xl font-bold text-white" style={{ fontFamily: '"Playfair Display", serif' }}>
            <EditableField
              value={String(signals.confidence ?? '')}
              onSave={v => saveField('confidence', Number(v))}
              canEdit={canEdit}
              label="Confidence"
              className="text-5xl font-bold text-white"
            />
          </div>
          <p className="text-sm text-white opacity-80 mt-1">% Confidence Level</p>
        </div>
      </div>

      {/* Bull / Bear / Moat */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bull case */}
        <div className="bg-white border border-[#E8EDE9] rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-[#E8EDE9] bg-[#27AE60]/5 flex items-center gap-2">
            <TrendingUp size={14} className="text-[#27AE60]" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#27AE60]">Bull Case</h3>
          </div>
          <div className="p-4 space-y-3">
            {signals.bullCase?.map((b, i) => (
              <div key={i} className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-[#27AE60]/10 text-[#27AE60] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <EditableField
                    value={b.point}
                    onSave={v => saveBull(i, 'point', v)}
                    canEdit={canEdit}
                    className="text-sm font-medium text-[#0F1A14] block w-full"
                  />
                  <EditableField
                    value={b.detail}
                    onSave={v => saveBull(i, 'detail', v)}
                    canEdit={canEdit}
                    multiline
                    className="text-xs text-[#4A5E52] mt-0.5 block w-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bear case */}
        <div className="bg-white border border-[#E8EDE9] rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-[#E8EDE9] bg-[#C0392B]/5 flex items-center gap-2">
            <AlertTriangle size={14} className="text-[#C0392B]" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#C0392B]">Red Flags</h3>
          </div>
          <div className="p-4 space-y-3">
            {signals.bearCase?.map((b, i) => (
              <div key={i} className="flex gap-2">
                <AlertTriangle size={14} className="text-[#C0392B] shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <EditableField
                    value={b.point}
                    onSave={v => saveBear(i, 'point', v)}
                    canEdit={canEdit}
                    className="text-sm font-medium text-[#0F1A14] block w-full"
                  />
                  <EditableField
                    value={b.detail}
                    onSave={v => saveBear(i, 'detail', v)}
                    canEdit={canEdit}
                    multiline
                    className="text-xs text-[#4A5E52] mt-0.5 block w-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Moat */}
        <div className="bg-white border border-[#E8EDE9] rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-[#E8EDE9] bg-[#2E6B4F]/5 flex items-center gap-2">
            <Shield size={14} className="text-[#2E6B4F]" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#2E6B4F]">Competitive Moat</h3>
          </div>
          <div className="p-5">
            {canEdit ? (
              <select
                value={signals.moat?.rating ?? 'Moderate'}
                onChange={e => saveMoat('rating', e.target.value)}
                className="text-2xl font-bold text-[#1C3B2E] bg-transparent outline-none cursor-pointer border-b border-[#E8EDE9] mb-1"
                style={{ fontFamily: '"Playfair Display", serif' }}
              >
                <option value="Strong">Strong</option>
                <option value="Moderate">Moderate</option>
                <option value="Weak">Weak</option>
              </select>
            ) : (
              <p className="text-2xl font-bold text-[#1C3B2E] mb-1" style={{ fontFamily: '"Playfair Display", serif' }}>
                {signals.moat?.rating}
              </p>
            )}
            <div className="relative h-2 bg-[#E8EDE9] rounded-full my-3">
              <div
                className="absolute h-4 w-4 rounded-full bg-[#1C3B2E] top-1/2 -translate-y-1/2 border-2 border-white shadow"
                style={{ left: `calc(${moatPos}% - 8px)` }}
              />
              <div className="h-full rounded-full" style={{ width: `${moatPos}%`, background: moatPos > 60 ? '#27AE60' : moatPos > 35 ? '#E67E22' : '#C0392B' }} />
            </div>
            <div className="flex justify-between text-xs text-[#9BB0A1] mb-3">
              <span>Weak</span><span>Moderate</span><span>Strong</span>
            </div>
            <EditableField
              value={signals.moat?.reasoning ?? ''}
              onSave={v => saveMoat('reasoning', v)}
              canEdit={canEdit}
              multiline
              className="text-xs text-[#4A5E52] leading-relaxed block w-full"
            />
          </div>
        </div>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Team score */}
        <div className="bg-white border border-[#E8EDE9] rounded-xl p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-[#4A5E52] mb-2">Team Score</p>
          <div className="flex items-end gap-2 mb-3">
            <EditableField
              value={String(signals.teamScore ?? '')}
              onSave={v => saveField('teamScore', Number(v))}
              canEdit={canEdit}
              label="Team Score"
              className="text-4xl font-bold text-[#1C3B2E]"
            />
            <span className="text-lg text-[#9BB0A1] mb-1">/10</span>
          </div>
          <div className="h-1.5 bg-[#E8EDE9] rounded-full">
            <div className="h-full rounded-full bg-[#1C3B2E]" style={{ width: `${((signals.teamScore ?? 0) / 10) * 100}%` }} />
          </div>
          <EditableField
            value={signals.teamScoreJustification ?? ''}
            onSave={v => saveField('teamScoreJustification', v)}
            canEdit={canEdit}
            multiline
            className="text-xs text-[#4A5E52] mt-3 block w-full"
          />
        </div>

        {/* Talent trajectory */}
        <div className="bg-white border border-[#E8EDE9] rounded-xl p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-[#4A5E52] mb-2">Talent Trajectory</p>
          <div className="flex items-center gap-2 mb-2">
            {trajectoryIcon}
            {canEdit ? (
              <select
                value={signals.talentTrajectory ?? 'Stable'}
                onChange={e => saveField('talentTrajectory', e.target.value as InvestmentSignals['talentTrajectory'])}
                className={`text-2xl font-bold bg-transparent outline-none cursor-pointer ${signals.talentTrajectory === 'Improving' ? 'text-[#27AE60]' : signals.talentTrajectory === 'Declining' ? 'text-[#C0392B]' : 'text-[#4A5E52]'}`}
                style={{ fontFamily: '"Playfair Display", serif' }}
              >
                <option value="Improving">Improving</option>
                <option value="Stable">Stable</option>
                <option value="Declining">Declining</option>
              </select>
            ) : (
              <span className={`text-2xl font-bold ${signals.talentTrajectory === 'Improving' ? 'text-[#27AE60]' : signals.talentTrajectory === 'Declining' ? 'text-[#C0392B]' : 'text-[#4A5E52]'}`} style={{ fontFamily: '"Playfair Display", serif' }}>
                {signals.talentTrajectory}
              </span>
            )}
          </div>
        </div>

        {/* Comparable exits count */}
        <div className="bg-white border border-[#E8EDE9] rounded-xl p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-[#4A5E52] mb-2">Comparable Exits</p>
          <p className="text-4xl font-bold text-[#1C3B2E]" style={{ fontFamily: '"Playfair Display", serif' }}>
            {signals.comparableExits?.length ?? 0}
          </p>
          <p className="text-xs text-[#4A5E52] mt-2">precedent transactions identified</p>
        </div>
      </div>

      {/* Due diligence checklist */}
      {signals.dueDiligence?.length > 0 && (
        <div className="bg-white border border-[#E8EDE9] rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-[#E8EDE9] bg-[#FAFCFA]">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#4A5E52]">Due Diligence Priorities</h3>
          </div>
          <div className="p-5 space-y-2">
            {signals.dueDiligence.map((dd, i) => {
              const completed = checkMap[dd.item]?.completed ?? false;
              return (
                <button
                  key={i}
                  onClick={() => toggleCheck(dd.item)}
                  className="w-full flex items-start gap-3 p-3 rounded-lg border border-[#E8EDE9] hover:bg-[#F8F6F1] transition-colors text-left"
                >
                  {completed
                    ? <CheckSquare size={16} className="text-[#27AE60] shrink-0 mt-0.5" />
                    : <Square size={16} className="text-[#9BB0A1] shrink-0 mt-0.5" />
                  }
                  <span className={`text-sm ${completed ? 'line-through text-[#9BB0A1]' : 'text-[#0F1A14]'}`}>{dd.item}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Comparable exits */}
      {signals.comparableExits?.length > 0 && (
        <div className="bg-white border border-[#E8EDE9] rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-[#E8EDE9] bg-[#FAFCFA]">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#4A5E52]">Comparable Exits</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E8EDE9]">
            {signals.comparableExits.map((exit, i) => (
              <div key={i} className="p-5">
                <EditableField
                  value={exit.company ?? ''}
                  onSave={v => saveExit(i, 'company', v)}
                  canEdit={canEdit}
                  className="font-semibold text-[#0F1A14] mb-1 block"
                />
                <div className="flex items-center gap-1 text-xs text-[#4A5E52] mb-2">
                  <EditableField
                    value={exit.exitType ?? ''}
                    onSave={v => saveExit(i, 'exitType', v)}
                    canEdit={canEdit}
                    className="text-xs text-[#4A5E52]"
                  />
                  <span>·</span>
                  <EditableField
                    value={exit.year ?? ''}
                    onSave={v => saveExit(i, 'year', v)}
                    canEdit={canEdit}
                    className="text-xs text-[#4A5E52]"
                  />
                </div>
                <EditableField
                  value={exit.exitValue ?? ''}
                  onSave={v => saveExit(i, 'exitValue', v)}
                  canEdit={canEdit}
                  className="text-lg font-bold text-[#2E6B4F]"
                  label="Exit Value"
                />
              </div>
            ))}
          </div>
        </div>
      )}


      {/* ── Scaling Readiness Scorecard ─────────────────────── */}
      {signals.scalingReadinessScore != null && (
        <div className="bg-white border border-[#E8EDE9] rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-[#E8EDE9] bg-[#FAFCFA] flex items-center gap-2">
            <Target size={14} className="text-[#2E6B4F]" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#4A5E52]">Scaling Readiness Scorecard</h3>
          </div>
          <div className="p-5">
            <div className="flex items-end gap-4 mb-4">
              <div>
                <p className="text-6xl font-bold text-[#1C3B2E]" style={{ fontFamily: '"Playfair Display", serif' }}>
                  {signals.scalingReadinessScore}
                </p>
                <p className="text-xs text-[#9BB0A1]">/ 100</p>
              </div>
              <div>
                <p className="text-base font-semibold text-[#0F1A14]">{signals.scalingReadinessClassification}</p>
                <div className="h-2 w-48 bg-[#E8EDE9] rounded-full mt-2">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${signals.scalingReadinessScore}%`,
                      background: signals.scalingReadinessScore >= 70 ? '#27AE60' : signals.scalingReadinessScore >= 45 ? '#E67E22' : '#C0392B'
                    }}
                  />
                </div>
              </div>
            </div>
            {signals.scalingReadinessBreakdown && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(signals.scalingReadinessBreakdown).map(([key, score]) => (
                  <div key={key} className="bg-[#F8F6F1] rounded-lg p-3 border border-[#E8EDE9]">
                    <p className="text-xs text-[#4A5E52] capitalize mb-1.5">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[#E8EDE9] rounded-full">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${score}%`,
                            background: score >= 70 ? '#27AE60' : score >= 45 ? '#E67E22' : '#C0392B'
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-[#0F1A14] w-6 text-right">{score}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Risk Score Matrix ───────────────────────────────── */}
      {signals.riskScores && (
        <div className="bg-white border border-[#E8EDE9] rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-[#E8EDE9] bg-[#FAFCFA] flex items-center gap-2">
            <Activity size={14} className="text-[#C0392B]" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#4A5E52]">Structural Risk Analysis</h3>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(signals.riskScores).map(([key, rs]) => {
              if (!rs) return null;
              const color = rs.score >= 70 ? '#C0392B' : rs.score >= 45 ? '#E67E22' : '#27AE60';
              return (
                <div key={key} className="border border-[#E8EDE9] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-[#0F1A14] capitalize">{key.replace(/([A-Z])/g, ' $1').trim()} Risk</p>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: color + '15', color }}>
                      {rs.label} · {rs.score}/100
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#E8EDE9] rounded-full mb-2">
                    <div className="h-full rounded-full" style={{ width: `${rs.score}%`, background: color }} />
                  </div>
                  <p className="text-xs text-[#4A5E52]">{rs.primaryDriver}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Future-State Org Blueprint ──────────────────────── */}
      {signals.futureStateOrg && (
        <div className="bg-white border border-[#E8EDE9] rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-[#E8EDE9] bg-[#1C3B2E]/4 flex items-center gap-2">
            <Map size={14} className="text-[#1C3B2E]" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#1C3B2E]">Future-State Org Blueprint</h3>
          </div>
          <div className="p-5 space-y-5">
            <div className="bg-[#F8F6F1] rounded-lg p-4 border border-[#E8EDE9]">
              <p className="text-xs font-semibold text-[#4A5E52] uppercase tracking-wide mb-1">Vision</p>
              <p className="text-sm text-[#0F1A14]">{signals.futureStateOrg.vision}</p>
              <p className="text-xs text-[#4A5E52] mt-2"><span className="font-semibold">CEO scope:</span> {signals.futureStateOrg.ceoScope}</p>
            </div>

            {/* ASCII Org Chart */}
            {signals.futureStateOrg.orgAsciiChart && (
              <div className="bg-[#0F1A14] rounded-xl p-5">
                <p className="text-xs font-semibold text-[#3D9970] uppercase tracking-wide mb-3">Target Org Structure</p>
                <pre className="text-xs text-[#9BB0A1] font-mono leading-relaxed whitespace-pre-wrap">
                  {signals.futureStateOrg.orgAsciiChart.replace(/\\n/g, '\n')}
                </pre>
              </div>
            )}

            {/* Executive hires needed */}
            {signals.futureStateOrg.executiveLayer?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#4A5E52] uppercase tracking-wide mb-3">Priority Executive Hires</p>
                <div className="space-y-3">
                  {signals.futureStateOrg.executiveLayer.map((exec, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 border border-[#E8EDE9] rounded-xl bg-[#FAFCFA]">
                      <div className="w-7 h-7 rounded-full bg-[#1C3B2E] text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {exec.priority}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-[#0F1A14]">{exec.role}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#E67E22]/10 text-[#E67E22]">{exec.hiringTimeline}</span>
                        </div>
                        <p className="text-xs text-[#4A5E52] mb-1">Reports to: {exec.reportingTo} · Scope: {exec.scope}</p>
                        <p className="text-xs text-[#2E6B4F]">{exec.rationale}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Functional pods */}
            {signals.futureStateOrg.functionalPods?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#4A5E52] uppercase tracking-wide mb-3">Functional Pod Design</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {signals.futureStateOrg.functionalPods.map((pod, i) => (
                    <div key={i} className="border border-[#E8EDE9] rounded-xl p-4 bg-[#FAFCFA]">
                      <p className="font-semibold text-sm text-[#0F1A14] mb-0.5">{pod.pod}</p>
                      <p className="text-xs text-[#2E6B4F] mb-2">Led by {pod.leader}</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {pod.functions.map((fn, j) => (
                          <span key={j} className="text-xs px-1.5 py-0.5 bg-[#F0F7F2] border border-[#D4E0D7] rounded text-[#1C3B2E]">{fn}</span>
                        ))}
                      </div>
                      <p className="text-xs text-[#C0392B]">Gap: {pod.currentGap}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 12-Month Hiring Plan ────────────────────────────── */}
      {signals.hiringPlan12Month && signals.hiringPlan12Month.length > 0 && (
        <div className="bg-white border border-[#E8EDE9] rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-[#E8EDE9] bg-[#FAFCFA] flex items-center gap-2">
            <Users size={14} className="text-[#2E6B4F]" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#4A5E52]">12-Month Hiring Plan</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F8F6F1] border-b border-[#E8EDE9]">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#4A5E52] uppercase tracking-wide">Quarter</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#4A5E52] uppercase tracking-wide">Role</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#4A5E52] uppercase tracking-wide">Priority</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#4A5E52] uppercase tracking-wide">Est. Cost</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#4A5E52] uppercase tracking-wide">Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EDE9]">
                {signals.hiringPlan12Month.map((h, i) => {
                  const pColor = h.priority === 'critical' ? '#C0392B' : h.priority === 'high' ? '#E67E22' : '#2E6B4F';
                  return (
                    <tr key={i} className="hover:bg-[#FAFCFA] transition-colors">
                      <td className="px-5 py-3 font-medium text-[#1C3B2E]">{h.quarter}</td>
                      <td className="px-5 py-3 font-semibold text-[#0F1A14]">{h.role}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={{ background: pColor + '15', color: pColor }}>
                          {h.priority}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-[#4A5E52] font-mono">{h.estimatedCost}</td>
                      <td className="px-5 py-3 text-xs text-[#4A5E52]">{h.rationale}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Org Migration Roadmap ───────────────────────────── */}
      {signals.orgMigrationRoadmap && signals.orgMigrationRoadmap.length > 0 && (
        <div className="bg-white border border-[#E8EDE9] rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-[#E8EDE9] bg-[#FAFCFA]">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#4A5E52]">Org Migration Roadmap</h3>
          </div>
          <div className="p-5 space-y-4">
            {signals.orgMigrationRoadmap.map((phase, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-[#1C3B2E] text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</div>
                  {i < (signals.orgMigrationRoadmap?.length ?? 0) - 1 && <div className="w-px flex-1 bg-[#E8EDE9] mt-2" />}
                </div>
                <div className="flex-1 pb-4">
                  <p className="font-semibold text-sm text-[#0F1A14] mb-2">{phase.phase}</p>
                  <ul className="space-y-1 mb-3">
                    {phase.actions.map((a, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs text-[#4A5E52]">
                        <span className="text-[#2E6B4F] mt-0.5">→</span>{a}
                      </li>
                    ))}
                  </ul>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F0F7F2] border border-[#D4E0D7] rounded-lg">
                    <span className="text-xs text-[#2E6B4F]">✓ Success:</span>
                    <span className="text-xs text-[#1C3B2E] font-medium">{phase.successMetrics}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export */}
      <div className="flex justify-end">
        <button
          onClick={handleExportPDF}
          disabled={exporting}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1C3B2E] hover:bg-[#152C22] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
        >
          <Download size={16} />
          {exporting ? 'Generating PDF...' : 'Export Full Report (PDF)'}
        </button>
      </div>
    </div>
  );
}
