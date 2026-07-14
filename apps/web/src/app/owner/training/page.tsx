'use client';

import React from 'react';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { GraduationCap, Plus } from 'lucide-react';
import type { Court, TrainingProgram } from '@fitora/shared';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { getAccessToken } from '@/lib/auth';
import { getMyCourts } from '@/lib/courts';
import { getTrainingPrograms } from '@/lib/training';
import { formatCurrency } from '@/lib/owner-utils';

interface ProgramRow extends TrainingProgram {
  courtName: string;
}

export default function OwnerTrainingPage(): React.JSX.Element {
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const token = getAccessToken();
      if (!token) return;

      try {
        const myCourts = await getMyCourts(token);
        setCourts(myCourts.items);

        const all: ProgramRow[] = [];
        for (const court of myCourts.items) {
          try {
            const progs = await getTrainingPrograms(court.id);
            all.push(...progs.map((p) => ({ ...p, courtName: court.name })));
          } catch {
            // skip
          }
        }
        setPrograms(all);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div>
      <OwnerPageHeader
        title="Kids Training"
        description="Training programs and batches across your venues"
        actions={
          courts.length > 0 ? (
            <Link
              href={`/owner/courts/${courts[0].id}/training`}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New program
            </Link>
          ) : undefined
        }
      />

      {loading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl skeleton" />
          ))}
        </div>
      )}

      {!loading && programs.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-16 text-center">
          <GraduationCap className="h-10 w-10 mx-auto text-muted opacity-50" />
          <p className="text-lg font-semibold mt-4">No training programs yet</p>
          <p className="text-sm text-muted mt-1 mb-6">Set up kids coaching at your courts</p>
          {courts.length > 0 ? (
            <Link href={`/owner/courts/${courts[0].id}/training`} className="btn-primary">
              Create first program
            </Link>
          ) : (
            <Link href="/owner/courts/new" className="btn-primary">
              Add a court first
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {programs.map((program) => (
          <div key={program.id} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold">{program.name}</h3>
                <p className="text-sm text-muted mt-0.5">{program.courtName}</p>
                <p className="text-xs text-muted mt-1">
                  Ages {program.minAge}–{program.maxAge}
                  {program.ageGroupLabel ? ` · ${program.ageGroupLabel}` : ''}
                </p>
              </div>
              <span className="text-sm font-bold text-primary">
                {formatCurrency(Number(program.fee))}
              </span>
            </div>
            {program.batches && program.batches.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                  Batches
                </p>
                <div className="space-y-2">
                  {program.batches.map((batch) => (
                    <div key={batch.id} className="flex justify-between text-sm">
                      <span>{batch.name}</span>
                      <span className="text-muted">{batch.schedule}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Link
              href={`/owner/courts/${program.courtId}/training`}
              className="text-sm text-primary font-medium mt-4 inline-block hover:underline"
            >
              Manage →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
