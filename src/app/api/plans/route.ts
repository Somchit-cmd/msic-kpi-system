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

export async function GET() {
  const plans = await db.kpiPlan.findMany({ orderBy: { createdAt: 'asc' } });
  return NextResponse.json(plans.map(parsePlan));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const data = stringifyPlan(body);
  const plan = await db.kpiPlan.create({ data });
  return NextResponse.json(parsePlan(plan));
}
