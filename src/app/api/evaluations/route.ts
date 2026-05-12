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

export async function GET() {
  const evaluations = await db.evaluation.findMany({ orderBy: { createdAt: 'asc' } });
  return NextResponse.json(evaluations.map(parseEval));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const data = stringifyEval(body);
  const evaluation = await db.evaluation.create({ data });
  return NextResponse.json(parseEval(evaluation));
}
