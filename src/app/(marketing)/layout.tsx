import Link from 'next/link';
import { Flame } from 'lucide-react';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 border-b border-border bg-bg-primary/80 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Flame className="h-6 w-6 text-accent-green" />
            <span className="text-lg font-bold text-text-primary tracking-tight">StreakForge</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center px-4 py-2 bg-accent-green text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {children}
    </div>
  );
}
