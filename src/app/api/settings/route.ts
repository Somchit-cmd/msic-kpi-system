import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const settings = await db.setting.findMany();
  // Return as a key-value map: { departments: [...], jobTitles: [...] }
  const result: Record<string, string[]> = {};
  for (const s of settings) {
    result[s.key] = JSON.parse(s.value || '[]');
  }
  return NextResponse.json(result);
}

export async function PUT(req: NextRequest) {
  const body = await req.json(); // { key: string, value: string[] | Record<string, string[]> }
  const { key, value } = body;
  if (!key || (typeof value !== 'object' || value === null)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  const existing = await db.setting.findUnique({ where: { key } });
  if (existing) {
    const updated = await db.setting.update({
      where: { key },
      data: { value: JSON.stringify(value) },
    });
    return NextResponse.json({ key: updated.key, value: JSON.parse(updated.value) });
  } else {
    const created = await db.setting.create({
      data: { id: `setting-${key}`, key, value: JSON.stringify(value) },
    });
    return NextResponse.json({ key: created.key, value: JSON.parse(created.value) });
  }
}
