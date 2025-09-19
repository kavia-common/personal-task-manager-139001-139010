import { useEffect } from 'react';
import supabase from '../lib/supabaseClient';

export default function AuthCallback() {
  useEffect(() => {
    const run = async () => {
      try {
        const { data, error } = await supabase.auth.getSessionFromUrl();
        if (error) {
          // eslint-disable-next-line no-console
          console.error('Auth callback error:', error);
          // optionally redirect using your router
        }
        if (data?.session) {
          // optionally redirect using your router
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Auth callback unexpected error:', e);
      }
    };
    run();
  }, []);

  return <div>Processing authentication...</div>;
}
