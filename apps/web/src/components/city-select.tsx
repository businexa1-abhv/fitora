'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronsUpDown, MapPin, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { filterIndianCities, POPULAR_CITIES } from '@/lib/indian-cities';

type CitySelectProps = {
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  className?: string;
  /** Lighter styling for use on the orange hero strip */
  variant?: 'default' | 'hero';
};

export function CitySelect({
  value,
  onChange,
  placeholder = 'Select city',
  allowClear = true,
  className = '',
  variant = 'default',
}: CitySelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const cities = useMemo(() => filterIndianCities(query), [query]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  function selectCity(city: string) {
    onChange(city);
    setOpen(false);
  }

  function clearCity(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
    setOpen(false);
  }

  const triggerClass =
    variant === 'hero'
      ? 'rounded-xl bg-white/95 text-foreground px-4 py-3 text-sm outline-none w-full text-left flex items-center gap-2 min-h-[48px]'
      : 'input-playo !py-3 flex items-center gap-2 text-left w-full';

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <div className={triggerClass}>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 min-w-0 text-left"
        >
          <MapPin className="h-4 w-4 shrink-0 text-primary" />
          <span className={`flex-1 truncate ${value ? 'font-medium' : 'text-muted'}`}>
            {value || placeholder}
          </span>
          {!value && <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted" />}
        </button>
        {allowClear && value && (
          <button
            type="button"
            aria-label="Clear city"
            onClick={clearCity}
            className="rounded-md p-1 text-muted hover:text-foreground hover:bg-background shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <Search className="h-4 w-4 text-muted shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search cities in India…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
                aria-autocomplete="list"
                aria-controls={listId}
              />
            </div>

            {!query && (
              <div className="border-b border-border px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-1.5">
                  Popular
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_CITIES.map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => selectCity(city)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                        value === city
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-primary-light text-primary hover:bg-primary hover:text-primary-foreground'
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <ul
              id={listId}
              role="listbox"
              className="max-h-56 overflow-y-auto overscroll-contain py-1"
            >
              {allowClear && !query && (
                <li>
                  <button
                    type="button"
                    role="option"
                    aria-selected={!value}
                    onClick={() => selectCity('')}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-muted hover:bg-primary-light hover:text-primary"
                  >
                    All cities
                  </button>
                </li>
              )}
              {cities.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-muted">
                  No cities match “{query}”
                </li>
              )}
              {cities.map((city) => (
                <li key={city}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === city}
                    onClick={() => selectCity(city)}
                    className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                      value === city
                        ? 'bg-primary-light font-semibold text-primary'
                        : 'hover:bg-primary-light/60 hover:text-primary'
                    }`}
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    {city}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
