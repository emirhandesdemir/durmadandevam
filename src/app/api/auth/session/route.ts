// src/app/api/auth/session/route.ts
import {NextRequest, NextResponse} from 'next/server';
import {cookies} from 'next/headers';

// This API route handles setting and clearing the session cookie.
export async function POST(request: NextRequest) {
  const {idToken} = await request.json();
  const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days

  const cookieStore = cookies();
  cookieStore.set('session', idToken, {
    maxAge: expiresIn,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    sameSite: 'lax',
  });

  return NextResponse.json({status: 'success'});
}

export async function DELETE() {
  const cookieStore = cookies();
  cookieStore.delete('session');

  return NextResponse.json({status: 'success'});
}
