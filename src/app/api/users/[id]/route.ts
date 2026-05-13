import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      name: true,
      title: true,
      department: true,
      role: true,
      canEvaluate: true,
      evaluatorId: true,
      createdAt: true,
    },
  });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  // Hash password if it's being updated
  if (body.password) {
    body.password = await bcrypt.hash(body.password, 10);
  }
  const user = await db.user.update({ where: { id }, data: body });
  return NextResponse.json(user);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
