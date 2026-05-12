import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'kpi_session';
const COOKIE_MAX_AGE = 86400; // 24 hours

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  const user = await db.user.findUnique({ where: { username } });
  if (!user || user.password !== password) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  // Set session cookie with user ID
  const response = NextResponse.json(user);
  response.cookies.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'lax',
  });
  return response;
}

// GET — check current session
export async function GET(req: NextRequest) {
  const userId = req.cookies.get(SESSION_COOKIE)?.value;
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    const response = NextResponse.json({ error: 'User not found' }, { status: 401 });
    response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
    return response;
  }
  return NextResponse.json(user);
}

// DELETE — logout (clear session cookie)
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
  });
  return response;
}
