import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

function parsePlan(p: any) {
  return {
    ...p,
    objectives: JSON.parse(p.objectives || '[]'),
    behaviors: JSON.parse(p.behaviors || '[]'),
  };
}

function stringifyPlan(data: any) {
  return {
    ...data,
    objectives: JSON.stringify(data.objectives || []),
    behaviors: JSON.stringify(data.behaviors || []),
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await db.kpiPlan.findUnique({ where: { id } });
  if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(parsePlan(plan));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data = stringifyPlan(body);
  const plan = await db.kpiPlan.update({ where: { id }, data });
  return NextResponse.json(parsePlan(plan));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.kpiPlan.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
