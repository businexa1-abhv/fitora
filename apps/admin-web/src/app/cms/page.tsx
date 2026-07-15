'use client';

import { AdminShell, primaryBtnClass } from '@/components/admin-shell';

const SPORTS = [
  ['Cricket', '124 Venues'],
  ['Badminton', '88 Venues'],
  ['Swimming', '42 Venues'],
  ['Football', '210 Venues'],
  ['Gym Training', '340 Venues'],
  ['Yoga', '112 Classes'],
];

export default function CmsPage() {
  return (
    <AdminShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Platform Configuration</h1>
          <p className="mt-1 text-sm text-muted">
            Manage global services, regional accessibility, and marketing assets.
          </p>
        </div>
        <button type="button" className={primaryBtnClass}>
          Add New Sport
        </button>
      </div>

      <section className="rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-semibold">Service Management</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SPORTS.map(([name, meta]) => (
            <article key={name} className="rounded-2xl border border-border bg-surface-low p-4">
              <p className="font-semibold">{name}</p>
              <p className="mt-1 text-sm text-muted">{meta}</p>
              <button type="button" className="mt-3 text-sm font-semibold text-primary">
                Edit
              </button>
            </article>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
