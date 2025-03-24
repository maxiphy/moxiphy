import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// The PIN should be a 6-digit number or string
// This is only used server-side and is not exposed to the client
const CORRECT_PIN = process.env.NEXT_PUBLIC_ACCESS_PIN || "maxiphy2025";

// Generate a random token when the server starts
// This will reset on server restart, logging users out
const SESSION_SECRET = crypto.randomBytes(32).toString('hex');

// Simple in-memory token store
// In a production app, you would use a database or Redis
const validTokens = new Set<string>();

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();
    
    if (!pin) {
      return NextResponse.json(
        { error: 'PIN is required' },
        { status: 400 }
      );
    }
    
    // Verify the PIN
    if (pin !== CORRECT_PIN) {
      console.log('Invalid PIN attempt');
      return NextResponse.json(
        { error: 'Invalid PIN' },
        { status: 401 }
      );
    }
    
    // Generate a secure session token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Store the token
    validTokens.add(token);
    console.log(`Auth: New token created. Valid tokens count: ${validTokens.size}`);
    
    // Set a cookie with the token for API authentication
    const response = NextResponse.json({ token });
    response.cookies.set('auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });
    
    return response;
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { token } = await req.json();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }
    
    // Remove the token
    validTokens.delete(token);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}

// Helper function to verify a token
// This can be used by other API routes to verify authentication
export function verifyToken(token: string): boolean {
  console.log('Verifying token:', { 
    token: token.substring(0, 5) + '...',
    validTokensCount: validTokens.size,
    isValid: validTokens.has(token)
  });
  return validTokens.has(token);
}
