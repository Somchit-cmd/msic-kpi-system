import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/notifications?recipientId=xxx — list notifications for a user
export async function GET(req: NextRequest) {
  const recipientId = req.nextUrl.searchParams.get('recipientId');
  if (!recipientId) {
    return NextResponse.json({ error: 'recipientId is required' }, { status: 400 });
  }
  const notifications = await db.notification.findMany({
    where: { recipientId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return NextResponse.json(notifications);
}

// POST /api/notifications — create a notification
export async function POST(req: NextRequest) {
  const body = await req.json();
  const notification = await db.notification.create({
    data: {
      id: body.id || crypto.randomUUID(),
      recipientId: body.recipientId,
      type: body.type,
      title: body.title,
      message: body.message,
      entityType: body.entityType,
      entityId: body.entityId,
      read: false,
    },
  });
  return NextResponse.json(notification);
}
