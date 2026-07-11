'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Clock, Plus } from 'lucide-react';
import { SPORT_LABELS, SportType, type Court } from '@fitora/shared';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { getAccessToken } from '@/lib/auth';
import { getMyCourts } from '@/lib/courts';
import { SPORT_EMOJI, SPORT_GRADIENTS } from '@/lib/constants';

export default function OwnerSlotsPage() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    getMyCourts(token)
      .then(setCourts)
      .catch(() => setCourts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <OwnerPageHeader
        title="Manage Slots"
        description="Generate and manage booking slots for each court"
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
            <div key={i} className="h-32 rounded-2xl skeleton" />
          ))}
        </div>
      )}

      {!loading && courts.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-16 text-center">
          <Clock className="h-10 w-10 mx-auto text-muted opacity-50" />
          <p className="text-lg font-semibold mt-4">No courts yet</p>
          <Link href="/owner/courts/new" className="btn-primary inline-flex mt-4">
            Add your first court
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courts.map((court) => {
          const sport: SportType = (court.sportType as SportType | null) ?? SportType.OTHER;
          return (
          <Link
            key={court.id}
            href={`/owner/courts/${court.id}/slots`}
            className="card-hover rounded-2xl border border-border bg-card shadow-sm overflow-hidden block"
          >
            <div className={`h-16 bg-gradient-to-r ${SPORT_GRADIENTS[sport]} flex items-center px-5 gap-3`}>
              <span className="text-2xl">{SPORT_EMOJI[sport]}</span>
              <div className="text-white min-w-0">
                <p className="font-bold truncate">{court.name}</p>
                <p className="text-white/80 text-xs">{SPORT_LABELS[sport]}</p>
              </div>
            </div>
            <div className="p-5">
              <p className="text-sm text-muted">{court.city}</p>
              <p className="text-sm font-semibold text-primary mt-2 flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Manage slots →
              </p>
            </div>
          </Link>
        );
        })}
      </div>
    </div>
  );
}
