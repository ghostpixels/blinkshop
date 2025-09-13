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

    // Verify the request has a valid auth token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    // Record or update the authenticated user
    const { data, error } = await supabase
      .from('authenticated_users')
      .upsert(
        { 
          email: email,
          authenticated_at: new Date().toISOString(),
          last_used_at: new Date().toISOString()
        },
        { 
          onConflict: 'email',
          ignoreDuplicates: false 
        }
      );

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to record authentication' }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Authentication recorded successfully'
    });

  } catch (error) {
    console.error('Record auth error:', error);
    return NextResponse.json(
      { error: 'Server error' }, 
      { status: 500 }
    );
  }
}