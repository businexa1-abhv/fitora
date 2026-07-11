import {
  buildCursorPaginatedResult,
  decodeCursor,
  encodeCursor,
  hashQueryParams,
} from './cursor-pagination.util';

describe('cursor-pagination.util', () => {
  it('encodes and decodes cursor', () => {
    const createdAt = new Date('2026-01-15T10:00:00.000Z');
    const cursor = encodeCursor('abc-123', createdAt);
    const decoded = decodeCursor(cursor);
    expect(decoded?.id).toBe('abc-123');
    expect(decoded?.createdAt.toISOString()).toBe(createdAt.toISOString());
  });

  it('returns null for invalid cursor', () => {
    expect(decodeCursor('not-valid')).toBeNull();
  });

  it('builds cursor paginated result with hasMore', () => {
    const items = [
      { id: '3', createdAt: new Date('2026-01-03') },
      { id: '2', createdAt: new Date('2026-01-02') },
      { id: '1', createdAt: new Date('2026-01-01') },
    ];
    const result = buildCursorPaginatedResult(items, 2);
    expect(result.items).toHaveLength(2);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBeTruthy();
  });

  it('hashes query params deterministically', () => {
    const a = hashQueryParams({ page: 1, search: 'ball' });
    const b = hashQueryParams({ search: 'ball', page: 1 });
    expect(a).toBe(b);
  });
});
