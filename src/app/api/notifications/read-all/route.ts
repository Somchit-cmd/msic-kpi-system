import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// PUT /api/notifications/read-all?recipientId=xxx — mark all as read for a user
export async function PUT(req: NextRequest) {
  const recipientId = req.nextUrl.searchParams.get('recipientId');
  if (!recipientId) {
    return NextResponse.json({ error: 'recipientId is required' }, { status: 400 });
  }
  const result = await db.notification.updateMany({
    where: { recipientId, read: false },
    data: { read: true },
  });
  return NextResponse.json({ updated: result.count });
}
