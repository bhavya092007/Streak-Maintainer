'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, ListChecks, Calendar, Trophy, Settings, LogOut, Flame, ChevronLeft, ChevronRight } from 'lucide-react';
import { signOut } from '@/lib/actions/auth';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/habits', label: 'Habits', icon: ListChecks },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/records', label: 'Records', icon: Trophy },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col h-screen sticky top-0 bg-bg-secondary border-r border-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-2.5 px-4 h-16 border-b border-border', collapsed && 'justify-center')}>
        <Flame className="h-6 w-6 text-accent-green shrink-0" />
        {!collapsed && <span className="text-lg font-bold text-text-primary tracking-tight">StreakForge</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-accent-green/10 text-accent-green'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-card-hover',
                collapsed && 'justify-center px-0'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={20} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="py-3 px-2 border-t border-border space-y-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-card-hover transition-colors',
            collapsed && 'justify-center px-0'
          )}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          {!collapsed && <span>Collapse</span>}
        </button>
        <form action={signOut}>
          <button
            type="submit"
            className={cn(
              'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-accent-red hover:bg-accent-red/10 transition-colors',
              collapsed && 'justify-center px-0'
            )}
            title={collapsed ? 'Sign out' : undefined}
          >
            <LogOut size={20} className="shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}
