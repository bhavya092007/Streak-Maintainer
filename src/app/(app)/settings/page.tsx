'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { useTheme } from '@/components/ui/theme-provider';
import { useToast } from '@/components/ui/toast';
import { PageLoader } from '@/components/ui/loading';
import { updateProfile, exportData, deleteAccount } from '@/lib/actions/settings';
import { signOut } from '@/lib/actions/auth';
import type { Profile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Sun, Moon, Monitor, Download, Trash2, LogOut, User, Palette, Bell, Shield, Database } from 'lucide-react';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { addToast } = useToast();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setProfile(data as Profile);
        setName(data.name || '');
      }
      setLoading(false);
    }
    fetchProfile();
  }, []);

  async function handleSaveName() {
    setSaving(true);
    const result = await updateProfile({ name });
    if (result.success) {
      addToast('Profile updated', 'success');
    } else {
      addToast(result.error || 'Failed', 'error');
    }
    setSaving(false);
  }

  async function handleExport(format: 'json' | 'csv') {
    setExporting(true);
    const result = await exportData(format);
    if (result.success && result.data) {
      const blob = new Blob([result.data], { type: format === 'json' ? 'application/json' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `streakforge-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      addToast(`Exported as ${format.toUpperCase()}`, 'success');
    } else {
      addToast(result.error || 'Export failed', 'error');
    }
    setExporting(false);
  }

  async function handleDeleteAccount() {
    const result = await deleteAccount();
    if (result.success) {
      router.push('/');
    } else {
      addToast(result.error || 'Failed', 'error');
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <h1 className="text-2xl font-bold text-text-primary">Settings</h1>

      {/* Profile */}
      <Card padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <User size={18} className="text-text-muted" />
          <h2 className="text-sm font-semibold text-text-secondary">Profile</h2>
        </div>
        <div className="space-y-4">
          <Input id="name" label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
            <p className="text-sm text-text-muted">{profile?.email}</p>
          </div>
          <Button onClick={handleSaveName} loading={saving} size="sm">Save</Button>
        </div>
      </Card>

      {/* Appearance */}
      <Card padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <Palette size={18} className="text-text-muted" />
          <h2 className="text-sm font-semibold text-text-secondary">Appearance</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'light' as const, icon: Sun, label: 'Light' },
            { value: 'dark' as const, icon: Moon, label: 'Dark' },
            { value: 'system' as const, icon: Monitor, label: 'System' },
          ].map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                theme === value
                  ? 'border-accent-green bg-accent-green/10 text-accent-green'
                  : 'border-border text-text-secondary hover:border-border-focus'
              )}
            >
              <Icon size={20} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Data */}
      <Card padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <Database size={18} className="text-text-muted" />
          <h2 className="text-sm font-semibold text-text-secondary">Data</h2>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-text-muted">Export your habits and completion data.</p>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" onClick={() => handleExport('json')} loading={exporting}>
              <Download size={14} /> Export JSON
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleExport('csv')} loading={exporting}>
              <Download size={14} /> Export CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card padding="lg" className="border-accent-red/20">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} className="text-accent-red" />
          <h2 className="text-sm font-semibold text-accent-red">Danger Zone</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">Sign out</p>
              <p className="text-xs text-text-muted">Sign out of your account</p>
            </div>
            <form action={signOut}>
              <Button variant="secondary" size="sm" type="submit">
                <LogOut size={14} /> Sign out
              </Button>
            </form>
          </div>
          <hr className="border-border" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">Delete account</p>
              <p className="text-xs text-text-muted">Permanently delete your account and all data</p>
            </div>
            <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 size={14} /> Delete
            </Button>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation */}
      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Account?"
        description="This will permanently delete your account and all associated data. This action cannot be undone."
      >
        <div className="flex gap-3 mt-4">
          <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={handleDeleteAccount} className="flex-1">Delete Forever</Button>
        </div>
      </Dialog>
    </div>
  );
}
