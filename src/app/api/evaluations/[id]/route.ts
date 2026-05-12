import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

function parseEval(e: any) {
  return {
    ...e,
    objectives: JSON.parse(e.objectives || '[]'),
    behaviors: JSON.parse(e.behaviors || '[]'),
    adjustingFactor: JSON.parse(e.adjustingFactor || '{"selfScore":0,"managerScore":0,"notes":""}'),
    auditLog: JSON.parse(e.auditLog || '[]'),
  };
}

function stringifyEval(data: any) {
  return {
    ...data,
    objectives: JSON.stringify(data.objectives || []),
    behaviors: JSON.stringify(data.behaviors || []),
    adjustingFactor: JSON.stringify(data.adjustingFactor || { selfScore: 0, managerScore: 0, notes: '' }),
    auditLog: JSON.stringify(data.auditLog || []),
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const evaluation = await db.evaluation.findUnique({ where: { id } });
  if (!evaluation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(parseEval(evaluation));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data = stringifyEval(body);
  const evaluation = await db.evaluation.update({ where: { id }, data });
  return NextResponse.json(parseEval(evaluation));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.evaluation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
