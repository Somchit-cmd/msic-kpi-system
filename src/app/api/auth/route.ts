import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

const SESSION_COOKIE = 'kpi_session';
const COOKIE_MAX_AGE = 86400; // 24 hours (default)
const COOKIE_MAX_AGE_REMEMBER = 2592000; // 30 days (remember me)

export async function POST(req: NextRequest) {
  const { username, password, rememberMe } = await req.json();

  const user = await db.user.findUnique({ where: { username } });
  if (!user) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  // Support both hashed and plain text passwords during migration period
  let passwordValid = false;
  if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
    // Password is already hashed with bcrypt
    passwordValid = await bcrypt.compare(password, user.password);
  } else {
    // Legacy plain text password — verify and auto-upgrade to hash
    passwordValid = user.password === password;
    if (passwordValid) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.user.update({ where: { id: user.id }, data: { password: hashedPassword } });
    }
  }

  if (!passwordValid) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  // Set session cookie with user ID (exclude password from response)
  const { password: _, ...userWithoutPassword } = user;
  const response = NextResponse.json(userWithoutPassword);
  response.cookies.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    path: '/',
    maxAge: rememberMe ? COOKIE_MAX_AGE_REMEMBER : COOKIE_MAX_AGE,
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
  // Exclude password from response
  const { password: _, ...userWithoutPassword } = user;
  return NextResponse.json(userWithoutPassword);
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
