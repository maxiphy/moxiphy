import { NextRequest, NextResponse } from 'next/server';

// Define routes that should be protected
const PROTECTED_API_ROUTES = [
  '/api/generate-mock-data',
  '/api/complete-data',
  '/api/fetch-images',
];

// Define routes that should be public (no auth required)
const PUBLIC_API_ROUTES = [
  '/api/auth',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for non-API routes and public API routes
  if (!pathname.startsWith('/api/') || PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  // Check if the route should be protected
  if (PROTECTED_API_ROUTES.some(route => pathname.startsWith(route))) {
    // Get the auth token from the request headers
    const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    // If no token is provided, return 401 Unauthorized
    if (!authToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Here we would normally verify the token against our database
    // For now, we'll just check if it exists in the request
    // In a production app, you would validate the token properly
    
    // Continue to the API route with the token
    return NextResponse.next();
  }
  
  // For any other API routes, allow access
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
