import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function GET() {
  const users = await db.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      username: true,
      name: true,
      title: true,
      department: true,
      role: true,
      canEvaluate: true,
      managerId: true,
      email: true,
      telephone: true,
      createdAt: true,
    },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // Hash password before storing
  if (body.password) {
    body.password = await bcrypt.hash(body.password, 10);
  }
  const user = await db.user.create({ data: body });
  return NextResponse.json(user);
}
