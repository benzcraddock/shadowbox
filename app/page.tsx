import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 bg-bg-primary">
      <div className="max-w-2xl text-center">
        <h1 className="text-7xl font-semibold tracking-tight text-text-primary mb-6">
          ShadowBox
        </h1>
        <p className="text-2xl text-text-secondary text-breathe mb-12 max-w-xl mx-auto">
          AI-powered boxing coach that tracks your form in real-time
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/signup"
            className="px-8 py-4 bg-text-primary text-bg-primary font-medium rounded-[8px] hover:bg-text-secondary transition-all"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="px-8 py-4 bg-bg-surface border border-border-subtle text-text-primary font-medium rounded-[8px] hover:bg-bg-elevated transition-all"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
