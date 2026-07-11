import { createHash } from 'crypto';

export type CursorPaginatedResult<T> = {
  items: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
  limit: number;
};

export function encodeCursor(id: string, createdAt: Date | string): string {
  const ts = typeof createdAt === 'string' ? createdAt : createdAt.toISOString();
  return Buffer.from(`${ts}|${id}`).toString('base64url');
}

export function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const sep = decoded.lastIndexOf('|');
    if (sep <= 0) return null;
    const createdAt = new Date(decoded.slice(0, sep));
    const id = decoded.slice(sep + 1);
    if (Number.isNaN(createdAt.getTime()) || !id) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

export function buildCursorPaginatedResult<T extends { id: string; createdAt: Date }>(
  items: T[],
  limit: number,
): CursorPaginatedResult<T> {
  const hasMore = items.length > limit;
  const pageItems = hasMore ? items.slice(0, limit) : items;
  const last = pageItems[pageItems.length - 1];
  const first = pageItems[0];

  return {
    items: pageItems,
    nextCursor: hasMore && last ? encodeCursor(last.id, last.createdAt) : null,
    prevCursor: first ? encodeCursor(first.id, first.createdAt) : null,
    hasMore,
    limit,
  };
}

export function hashQueryParams(params: Record<string, unknown>): string {
  const normalized = JSON.stringify(
    Object.keys(params)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {}),
  );
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}
