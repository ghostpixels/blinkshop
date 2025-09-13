'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthConfirm() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Confirming authentication...');

  useEffect(() => {
    async function handleAuthConfirm() {
      try {
        // Get the hash fragments from the URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          // Set the session in Supabase
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) throw error;

          // Record authentication in our authenticated_users table
          if (data.user?.email) {
            const response = await fetch('/api/record-auth', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify({ email: data.user.email })
            });

            if (!response.ok) {
              console.error('Failed to record authentication');
            }
          }

          setStatus('success');
          setMessage('Authentication successful! Your iOS Shortcut is now ready to use.');
          
          // Auto-close after 4 seconds
          setTimeout(() => {
            window.close();
          }, 4000);

        } else {
          throw new Error('Invalid authentication link');
        }
      } catch (error) {
        console.error('Auth confirm error:', error);
        setStatus('error');
        setMessage('Authentication failed. Please try again.');
      }
    }

    handleAuthConfirm();
  }, []);

  return (
    <div style={{
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#ffffff',
      color: '#111111',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '400px',
        padding: '2rem',
        backgroundColor: '#f9f9f9',
        borderRadius: '12px',
        border: '1px solid #dddddd'
      }}>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          marginBottom: '1rem'
        }}>
          {status === 'loading' && 'Authenticating...'}
          {status === 'success' && 'Success!'}
          {status === 'error' && 'Error'}
        </h1>
        
        <p style={{
          fontSize: '1rem',
          color: '#666666',
          lineHeight: '1.4',
          marginBottom: '1.5rem'
        }}>
          {message}
        </p>

        {status === 'success' && (
          <div style={{
            fontSize: '0.875rem',
            color: '#666666',
            fontStyle: 'italic'
          }}>
            This window will close automatically...
          </div>
        )}

        {status === 'error' && (
          <button 
            onClick={() => window.close()}
            style={{
              backgroundColor: '#222222',
              color: '#ffffff',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}