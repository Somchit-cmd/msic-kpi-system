import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// PUT /api/notifications/[id] — mark as read or update
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const notification = await db.notification.update({
    where: { id },
    data: body,
  });
  return NextResponse.json(notification);
}

// DELETE /api/notifications/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.notification.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
