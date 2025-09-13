import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Authentication expires after 30 days of inactivity
const AUTH_EXPIRY_DAYS = 30;

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email required' }, 
        { status: 400 }
      );
    }

    // Check if user has valid authentication
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - AUTH_EXPIRY_DAYS);

    const { data: authUser, error } = await supabase
      .from('authenticated_users')
      .select('email, authenticated_at, last_used_at')
      .eq('email', email)
      .gte('authenticated_at', cutoffDate.toISOString())
      .single();

    if (error || !authUser) {
      return NextResponse.json({
        authenticated: false,
        message: 'Authentication required'
      });
    }

    // Update last_used_at timestamp
    await supabase
      .from('authenticated_users')
      .update({ last_used_at: new Date().toISOString() })
      .eq('email', email);

    return NextResponse.json({
      authenticated: true,
      message: 'User is authenticated',
      last_used: authUser.last_used_at
    });

  } catch (error) {
    console.error('Check auth error:', error);
    return NextResponse.json(
      { error: 'Server error' }, 
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Check authentication endpoint',
    method: 'POST',
    required_fields: ['email']
  });
}