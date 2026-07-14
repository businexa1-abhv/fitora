'use client';

import React from 'react';

import { useEffect, useState } from 'react';
import type { TrainerProfileView } from '@fitora/shared';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { getAccessToken } from '@/lib/auth';
import { getTrainerProfile, updateTrainerProfile } from '@/lib/trainer';

export default function TrainerProfilePage(): React.JSX.Element {
  const [profile, setProfile] = useState<TrainerProfileView | null>(null);
  const [bio, setBio] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [specializations, setSpecializations] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    getTrainerProfile(token)
      .then((p) => {
        setProfile(p);
        setBio(p.bio ?? '');
        setYearsExperience(p.yearsExperience != null ? String(p.yearsExperience) : '');
        setSpecializations(p.specializations.join(', '));
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) return;
    setSaving(true);
    setMessage('');
    try {
      const updated = await updateTrainerProfile(token, {
        bio,
        yearsExperience: yearsExperience ? Number(yearsExperience) : undefined,
        specializations: specializations
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setProfile(updated);
      setMessage('Profile updated');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <OwnerPageHeader title="Profile" description="Your trainer profile visible to court owners" />

      {loading && <div className="h-48 rounded-2xl skeleton" />}

      {profile && (
        <form onSubmit={handleSave} className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm max-w-2xl">
          <div className="rounded-xl bg-primary-light/40 p-4">
            <p className="font-bold">
              {profile.user?.firstName} {profile.user?.lastName}
            </p>
            <p className="text-sm text-muted">{profile.user?.email}</p>
            {profile.isVerified && (
              <span className="inline-block mt-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                Verified trainer
              </span>
            )}
          </div>

          <label className="block text-sm">
            <span className="font-medium">Bio</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium">Years of experience</span>
            <input
              type="number"
              min={0}
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
              className="mt-1 w-32 rounded-xl border border-border bg-card px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium">Specializations</span>
            <input
              type="text"
              placeholder="Badminton, Kids training"
              value={specializations}
              onChange={(e) => setSpecializations(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
            />
            <span className="text-xs text-muted">Comma-separated</span>
          </label>

          {message && <p className="text-sm text-primary font-medium">{message}</p>}

          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      )}
    </div>
  );
}
