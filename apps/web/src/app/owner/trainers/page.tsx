'use client';

import React from 'react';

import { useEffect, useState } from 'react';
import { UserCog, Mail } from 'lucide-react';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { getTrainers } from '@/lib/courts';

interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const ASSIGNED_BATCHES: Record<string, string[]> = {
  // Populated when API supports trainer-batch assignments
};

export default function OwnerTrainersPage(): React.JSX.Element {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTrainers()
      .then(setTrainers)
      .catch(() => setTrainers([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <OwnerPageHeader
        title="Assign Trainers"
        description="Available coaches on the platform — assign them to training batches"
      />

      <div className="rounded-xl bg-primary-light/50 border border-primary/20 px-4 py-3 text-sm text-primary mb-6">
        To assign a trainer, create a training batch and select a coach from the dropdown on the court training page.
      </div>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-2xl skeleton" />
          ))}
        </div>
      )}

      {!loading && trainers.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-16 text-center">
          <UserCog className="h-10 w-10 mx-auto text-muted opacity-50" />
          <p className="text-lg font-semibold mt-4">No trainers registered</p>
          <p className="text-sm text-muted mt-1">Trainers sign up on the platform with the Trainer role</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {trainers.map((trainer) => (
          <div key={trainer.id} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary font-bold">
                {trainer.firstName[0]}{trainer.lastName[0]}
              </div>
              <div>
                <p className="font-bold">{trainer.firstName} {trainer.lastName}</p>
                <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                  <Mail className="h-3 w-3" />
                  {trainer.email}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted">
                {ASSIGNED_BATCHES[trainer.id]?.length
                  ? `${ASSIGNED_BATCHES[trainer.id].length} batch(es) assigned`
                  : 'Not assigned to any batch yet'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
