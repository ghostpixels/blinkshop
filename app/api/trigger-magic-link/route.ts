import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email required' }, 
        { status: 400 }
      );
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: { 
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth-confirm` 
      }
    });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to send magic link' }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Magic link sent! Check your email, then retry your shortcut.'
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Server error' }, 
      { status: 500 }
    );
  }
}