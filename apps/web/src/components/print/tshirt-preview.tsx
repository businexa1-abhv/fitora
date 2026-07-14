'use client';

import React from 'react';

interface TshirtPreviewProps {
  designUrl?: string | null;
  colorHex?: string;
  customText?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function TshirtPreview({ designUrl, colorHex = '#FFFFFF', customText, size = 'md' }: TshirtPreviewProps): React.JSX.Element {
  const dims = { sm: 'w-40 h-48', md: 'w-56 h-64', lg: 'w-72 h-80' }[size];

  return (
    <div className={`relative mx-auto ${dims}`}>
      <div
        className="absolute inset-0 rounded-t-3xl rounded-b-xl border-2 border-border shadow-inner"
        style={{ backgroundColor: colorHex }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-8 border-2 border-border rounded-b-full bg-background/30" />
      {designUrl && (
        <div className="absolute top-[28%] left-1/2 -translate-x-1/2 w-[55%] aspect-square rounded-lg overflow-hidden border border-black/10 bg-white/80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={designUrl} alt="Design preview" className="w-full h-full object-contain p-1" />
        </div>
      )}
      {customText && (
        <p className="absolute bottom-[18%] left-1/2 -translate-x-1/2 text-xs font-bold text-center px-2 max-w-[80%] truncate drop-shadow">
          {customText}
        </p>
      )}
      <p className="absolute -bottom-6 left-0 right-0 text-center text-xs text-muted">Preview</p>
    </div>
  );
}
