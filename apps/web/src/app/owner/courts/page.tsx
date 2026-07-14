'use client';

import React from 'react';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { SPORT_LABELS, SportType, type Court } from '@fitora/shared';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { getAccessToken } from '@/lib/auth';
import { getMyCourts } from '@/lib/courts';
import { SPORT_EMOJI, SPORT_GRADIENTS } from '@/lib/constants';

export default function OwnerCourtsPage(): React.JSX.Element {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    getMyCourts(token)
      .then((res) => setCourts(res.items))
      .catch(() => setCourts([]))
      .finally(() => setLoading(false));
  }, []);

  const approvedCount = courts.filter((c) => c.isApproved).length;

  return (
    <div>
      <OwnerPageHeader
        title="Manage Courts"
        description={
          courts.length > 0
            ? `${approvedCount} live · ${courts.length - approvedCount} pending approval`
            : 'List and manage your sports venues'
        }
        actions={
          <Link href="/owner/courts/new" className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add court
          </Link>
        }
      />

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 rounded-2xl skeleton" />
          ))}
        </div>
      )}

      {!loading && courts.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-16 text-center">
          <span className="text-4xl">🏟️</span>
          <p className="text-lg font-semibold mt-4">No courts yet</p>
          <p className="text-muted text-sm mt-1 mb-6">
            List your venue and start accepting bookings
          </p>
          <Link href="/owner/courts/new" className="btn-primary">
            Add your first court
          </Link>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {courts.map((court) => {
          const sport: SportType = (court.sportType as SportType | null) ?? SportType.OTHER;
          return (
            <div
              key={court.id}
              className="card-hover rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
            >
              <div
                className={`h-20 bg-gradient-to-r ${SPORT_GRADIENTS[sport]} flex items-center px-5 gap-3`}
              >
                <span className="text-3xl">{SPORT_EMOJI[sport]}</span>
                <div className="text-white min-w-0 flex-1">
                  <h2 className="font-bold truncate">{court.name}</h2>
                  <p className="text-white/80 text-xs">
                    {SPORT_LABELS[sport]} · {court.city}
                  </p>
                </div>
                {!court.isApproved && (
                  <span className="shrink-0 rounded-full bg-amber-400/90 text-amber-950 px-2.5 py-0.5 text-xs font-bold">
                    Pending
                  </span>
                )}
              </div>

              <div className="p-5">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { href: `/owner/courts/${court.id}/slots`, label: 'Slots' },
                    { href: `/owner/courts/${court.id}/plans`, label: 'Plans' },
                    { href: `/owner/courts/${court.id}/training`, label: 'Training' },
                    { href: `/owner/bookings`, label: 'Bookings' },
                  ].map((link) => (
                    <Link
                      key={link.href + link.label}
                      href={link.href}
                      className="rounded-xl border border-border bg-background py-2.5 text-center text-xs font-semibold hover:border-primary hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
