import { Flame } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-bg-primary">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent-green/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md space-y-8">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2.5">
          <Flame className="h-8 w-8 text-accent-green" />
          <span className="text-2xl font-bold text-text-primary tracking-tight">StreakForge</span>
        </Link>

        {children}
      </div>
    </div>
  );
}
