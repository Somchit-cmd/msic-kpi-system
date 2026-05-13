import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Evaluation, calcPartI, calcPartII, calcPartIII, calcFinalScore, getGrade, STATUS_LABELS } from '@/types/evaluation';

export function generatePDF(eval_: Evaluation) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header
  doc.setFillColor(30, 45, 80);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('KPI Performance Evaluation', 14, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Status: ${STATUS_LABELS[eval_.status]}`, 14, 28);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 34);

  y = 50;
  doc.setTextColor(0, 0, 0);

  // Employee Info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Information', 14, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const info = [
    ['Name', eval_.employeeName],
    ['Title', eval_.employeeTitle],
    ['Department', eval_.department],
    ['Evaluator', eval_.managerName],
    ['Period', eval_.period],
  ];
  info.forEach(([label, value]) => {
    doc.text(`${label}: ${value}`, 14, y);
    y += 5;
  });

  y += 5;

  // Part I
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Part I — Personal Objectives (45%)', 14, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    head: [['#', 'Objective', 'Category', 'Weight', 'Self', 'Evaluator']],
    body: eval_.objectives.map((o, i) => [
      String(i + 1),
      o.description,
      o.category,
      `${o.weight}%`,
      String(o.selfScore),
      String(o.managerScore),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 45, 80] },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Part I Score: ${calcPartI(eval_.objectives, true).toFixed(2)}`, 14, y);
  y += 10;

  // Part II
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Part II — Core Values & Behaviors (45%)', 14, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    head: [['Behavior', 'Self Score', 'Evaluator Score']],
    body: eval_.behaviors.map(b => [b.name, String(b.selfScore), String(b.managerScore)]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 45, 80] },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Part II Score: ${calcPartII(eval_.behaviors, true).toFixed(2)}`, 14, y);
  y += 10;

  // Part III
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Part III — Adjusting Factors (10%)', 14, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    head: [['', 'Self Score', 'Evaluator Score']],
    body: [['Adjusting Factor', String(eval_.adjustingFactor.selfScore), String(eval_.adjustingFactor.managerScore)]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 45, 80] },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (eval_.adjustingFactor.notes) {
    doc.text(`Notes: ${eval_.adjustingFactor.notes}`, 14, y);
    y += 5;
  }
  doc.text(`Part III Score: ${calcPartIII(eval_.adjustingFactor, true).toFixed(2)}`, 14, y);
  y += 12;

  // Final Score
  if (y > 250) { doc.addPage(); y = 20; }
  const finalScore = calcFinalScore(eval_, true);
  doc.setFillColor(240, 240, 245);
  doc.roundedRect(14, y, pageWidth - 28, 30, 3, 3, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Final Score', 20, y + 12);
  doc.setFontSize(20);
  doc.text(finalScore.toFixed(2), 20, y + 24);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(getGrade(finalScore), 55, y + 24);

  y += 40;

  // Score breakdown
  doc.setFontSize(9);
  doc.text(`Part I: ${calcPartI(eval_.objectives, true).toFixed(2)} | Part II: ${calcPartII(eval_.behaviors, true).toFixed(2)} | Part III: ${calcPartIII(eval_.adjustingFactor, true).toFixed(2)}`, 14, y);
  y += 10;

  // HR Notes
  if (eval_.hrNotes) {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('HR Notes', 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(eval_.hrNotes, pageWidth - 28);
    doc.text(lines, 14, y);
    y += lines.length * 4 + 10;
  }

  // Workflow Audit Log
  if (eval_.auditLog && eval_.auditLog.length > 0) {
    if (y > 220) { doc.addPage(); y = 20; }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Workflow Audit Log', 14, y);
    y += 3;

    const fmt = (iso: string) => {
      const d = new Date(iso);
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };

    autoTable(doc, {
      startY: y,
      head: [['Date & Time', 'Action', 'Performed By', 'Role', 'Status Change']],
      body: eval_.auditLog.map(entry => [
        fmt(entry.timestamp),
        entry.action + (entry.notes ? `\nNote: ${entry.notes}` : ''),
        entry.actorName,
        entry.actorRole.charAt(0).toUpperCase() + entry.actorRole.slice(1),
        entry.fromStatus
          ? `${STATUS_LABELS[entry.fromStatus]} -> ${STATUS_LABELS[entry.toStatus!]}`
          : (entry.toStatus ? STATUS_LABELS[entry.toStatus] : '—'),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 45, 80] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 32 },
        1: { cellWidth: 55 },
        2: { cellWidth: 32 },
        3: { cellWidth: 22 },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Signature block
  if (y > 240) { doc.addPage(); y = 20; }
  y += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const sigWidth = (pageWidth - 42) / 3;
  ['Employee Signature', 'Evaluator Signature', 'HR Signature'].forEach((label, i) => {
    const x = 14 + i * (sigWidth + 7);
    doc.line(x, y + 15, x + sigWidth, y + 15);
    doc.text(label, x, y + 20);
    doc.text('Date: ___________', x, y + 26);
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`KPI Performance Evaluation — ${eval_.employeeName} — Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
  }

  doc.save(`KPI_Evaluation_${eval_.employeeName.replace(/\s+/g, '_')}_${eval_.period.replace(/\s+/g, '_')}.pdf`);
}
