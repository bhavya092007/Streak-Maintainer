'use client';

import { useState } from 'react';
import Link from 'next/link';
import { resetPassword } from '@/lib/actions/auth';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError('');
    setSuccess('');
    const result = await resetPassword(formData);
    if (result?.error) {
      setError(result.error);
    } else if (result?.success) {
      setSuccess(result.success);
    }
    setLoading(false);
  }

  return (
    <Card padding="lg" className="animate-fade-in">
      <div className="text-center mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Reset password</h1>
        <p className="text-sm text-text-secondary mt-1">We&apos;ll send you a reset link</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-accent-red/10 border border-accent-red/20 text-sm text-accent-red">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 rounded-lg bg-accent-green/10 border border-accent-green/20 text-sm text-accent-green">
          {success}
        </div>
      )}

      <form action={handleSubmit} className="space-y-4">
        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
        <Button type="submit" loading={loading} className="w-full">
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        <Link href="/login" className="text-accent-green hover:underline font-medium">
          Back to sign in
        </Link>
      </p>
    </Card>
  );
}
