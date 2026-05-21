import jsPDF from 'jspdf';
import type { ApiAnalysis } from './api';
import type { CompanyProfile, Competitor, InvestmentSignals } from '../types';

const GREEN = [28, 59, 46] as const;
const WHITE = [255, 255, 255] as const;
const LIGHT = [248, 246, 241] as const;
const MUTED = [74, 94, 82] as const;

export async function exportPDF(analysis: ApiAnalysis) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  // Cover page
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, H, 'F');

  doc.setTextColor(...WHITE);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('CACTUS PARTNERS · cactusvp.com', W / 2, 30, { align: 'center' });

  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('CACTUS INTELLIGENCE', W / 2, 70, { align: 'center' });

  doc.setFontSize(18);
  doc.setFont('helvetica', 'normal');
  doc.text(analysis.company_name, W / 2, 88, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(168, 196, 176);
  doc.text('Competitive Intelligence Report', W / 2, 100, { align: 'center' });
  doc.text(today, W / 2, 108, { align: 'center' });

  // Company stats on cover
  const profile = analysis.company_profile as CompanyProfile | null;
  if (profile) {
    doc.setFillColor(46, 107, 79);
    doc.roundedRect(20, 130, W - 40, 60, 4, 4, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(9);
    const stats = [
      ['Sector', profile.sector],
      ['Employees', profile.employeeCount],
      ['Stage', profile.fundingStage],
      ['Total Raised', profile.totalRaised],
    ].filter(s => s[1]);

    stats.forEach(([label, val], i) => {
      const x = 30 + (i % 2) * (W / 2 - 10);
      const y = 148 + Math.floor(i / 2) * 24;
      doc.setFont('helvetica', 'bold');
      doc.text(label, x, y);
      doc.setFont('helvetica', 'normal');
      doc.text(val ?? '—', x, y + 8);
    });
  }

  // Disclaimer footer on cover
  doc.setFontSize(7);
  doc.setTextColor(100, 140, 110);
  const disclaimer = 'This report is generated using AI-powered public data research. Cactus Partners recommends independent verification of all data prior to investment decisions.';
  const lines = doc.splitTextToSize(disclaimer, W - 40);
  doc.text(lines, W / 2, H - 20, { align: 'center' });

  // Page 2 — Investment signals
  const signals = analysis.investment_signals as unknown as InvestmentSignals | null;
  if (signals) {
    doc.addPage();
    doc.setFillColor(...LIGHT);
    doc.rect(0, 0, W, H, 'F');

    // Header
    doc.setFillColor(...GREEN);
    doc.rect(0, 0, W, 18, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('INVESTMENT SIGNALS', 15, 12);
    doc.setFont('helvetica', 'normal');
    doc.text(analysis.company_name, W - 15, 12, { align: 'right' });

    // Signal badge
    const sigColor = signals.signal === 'GO' ? [39, 174, 96] : signals.signal === 'PASS' ? [192, 57, 43] : [230, 126, 34];
    doc.setFillColor(...(sigColor as [number, number, number]));
    doc.roundedRect(15, 24, 50, 22, 3, 3, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(signals.signal, 40, 38, { align: 'center' });

    doc.setTextColor(...MUTED);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Confidence: ${signals.confidence}%`, 72, 32);
    doc.text(`Team Score: ${signals.teamScore}/10`, 72, 40);
    doc.text(`Talent: ${signals.talentTrajectory}`, 72, 48);

    let y = 58;

    // Bull case
    doc.setTextColor(...GREEN);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('BULL CASE', 15, y);
    y += 6;
    doc.setTextColor(15, 26, 20);
    doc.setFont('helvetica', 'normal');
    signals.bullCase?.forEach((b, i) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${i + 1}. ${b.point}`, 15, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      const wrapped = doc.splitTextToSize(b.detail, W - 30);
      doc.setTextColor(...MUTED);
      doc.text(wrapped, 20, y);
      y += wrapped.length * 4 + 3;
      doc.setTextColor(15, 26, 20);
    });

    y += 4;

    // Bear case
    doc.setTextColor(192, 57, 43);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('RED FLAGS', 15, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    signals.bearCase?.forEach((b, i) => {
      doc.setTextColor(15, 26, 20);
      doc.setFont('helvetica', 'bold');
      doc.text(`${i + 1}. ${b.point}`, 15, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      const wrapped = doc.splitTextToSize(b.detail, W - 30);
      doc.setTextColor(...MUTED);
      doc.text(wrapped, 20, y);
      y += wrapped.length * 4 + 3;
    });

    // Due diligence
    if (y < H - 50) {
      y += 6;
      doc.setTextColor(...GREEN);
      doc.setFont('helvetica', 'bold');
      doc.text('DUE DILIGENCE PRIORITIES', 15, y);
      y += 6;
      signals.dueDiligence?.forEach(dd => {
        doc.setTextColor(15, 26, 20);
        doc.setFont('helvetica', 'normal');
        const wrapped = doc.splitTextToSize(`• ${dd.item}`, W - 30);
        doc.text(wrapped, 15, y);
        y += wrapped.length * 5 + 2;
      });
    }
  }

  // Page 3 — Competitors
  const competitors = (analysis.competitors?.competitors ?? []) as unknown as Competitor[];
  if (competitors.length > 0) {
    doc.addPage();
    doc.setFillColor(...LIGHT);
    doc.rect(0, 0, W, H, 'F');

    doc.setFillColor(...GREEN);
    doc.rect(0, 0, W, 18, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPETITIVE LANDSCAPE', 15, 12);

    let y = 28;
    competitors.forEach((c, i) => {
      if (y > H - 40) { doc.addPage(); y = 20; }
      doc.setFillColor(...WHITE);
      doc.roundedRect(15, y, W - 30, 28, 2, 2, 'F');
      doc.setTextColor(15, 26, 20);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`${i + 1}. ${c.name}`, 20, y + 8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...MUTED);
      doc.text(`${c.hq} · ${c.fundingStage} · ${c.totalRaised}`, 20, y + 15);
      doc.text(c.differentiator ? doc.splitTextToSize(c.differentiator, W - 50).join(' ') : '', 20, y + 21);

      const threatColors: Record<string, [number, number, number]> = {
        high: [192, 57, 43], medium: [230, 126, 34], low: [39, 174, 96],
      };
      const tc = threatColors[c.threatLevel] ?? [74, 94, 82];
      doc.setFillColor(...tc);
      doc.roundedRect(W - 38, y + 4, 22, 8, 2, 2, 'F');
      doc.setTextColor(...WHITE);
      doc.setFontSize(7);
      doc.text(c.threatLevel?.toUpperCase() ?? '', W - 27, y + 9.5, { align: 'center' });

      y += 32;
    });
  }

  // Disclaimer on last page
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.text(`Page ${p} of ${pageCount} · Cactus Partners · cactusvp.com`, W / 2, H - 8, { align: 'center' });
  }

  doc.save(`Cactus-Intelligence-${analysis.company_slug}-${today.replace(/\s/g, '-')}.pdf`);
}
