'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/train');
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12 bg-bg-primary">
      <div className="w-full max-w-md">
        {/* Logo & Tagline */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-semibold tracking-tight text-text-primary mb-3">
            ShadowBox
          </h1>
          <p className="text-lg text-text-secondary text-breathe">
            AI-Powered Boxing Coach
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-bg-surface border border-border-subtle rounded-[12px] p-8">
          <h2 className="text-2xl font-semibold text-text-primary mb-6">
            Sign In
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-accent-negative-alpha/10 border border-accent-negative-alpha rounded-[8px]">
              <p className="text-sm text-accent-negative">{error}</p>
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-bg-primary border border-border-subtle rounded-[6px] text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-neutral-alpha transition-all"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-bg-primary border border-border-subtle rounded-[6px] text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-neutral-alpha transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-text-primary text-bg-primary font-medium rounded-[6px] hover:bg-text-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border-subtle"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-bg-surface text-text-secondary">
                  or
                </span>
              </div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="mt-6 w-full py-3 px-4 bg-bg-elevated border border-border-subtle text-text-primary font-medium rounded-[6px] hover:bg-bg-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue with Google
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-text-secondary">
            Don't have an account?{' '}
            <Link
              href="/signup"
              className="text-text-primary hover:text-accent-neutral transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
