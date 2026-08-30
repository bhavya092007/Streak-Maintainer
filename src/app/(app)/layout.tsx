import { Sidebar } from '@/components/ui/sidebar';
import { BottomNav } from '@/components/ui/bottom-nav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
