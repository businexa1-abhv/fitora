import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';
import { COURT_AMENITIES, SPORT_TYPE_TO_SLUG } from '../constants/court.constants';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

export async function generateUniqueCourtSlug(
  prisma: PrismaService,
  name: string,
  city: string,
  tenantId: string,
): Promise<string> {
  const base = slugify(`${name}-${city}`) || 'court';
  let slug = base;
  let attempt = 0;

  while (attempt < 20) {
    const existing = await prisma.court.findFirst({
      where: { tenantId, slug, deletedAt: null },
    });
    if (!existing) return slug;
    attempt++;
    slug = `${base}-${attempt}`;
  }

  return `${base}-${Date.now()}`;
}

export function validateAmenities(amenities: string[]): void {
  if (amenities.length > 20) {
    throw new BadRequestException('Maximum 20 amenities allowed');
  }

  const invalid = amenities.filter(
    (a) => !COURT_AMENITIES.includes(a as (typeof COURT_AMENITIES)[number]),
  );
  if (invalid.length > 0) {
    throw new BadRequestException(`Invalid amenities: ${invalid.join(', ')}`);
  }
}

export function validateCoordinates(latitude?: number, longitude?: number): void {
  if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
    throw new BadRequestException('latitude must be between -90 and 90');
  }
  if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
    throw new BadRequestException('longitude must be between -180 and 180');
  }
  if ((latitude === undefined) !== (longitude === undefined)) {
    throw new BadRequestException('latitude and longitude must both be provided or omitted');
  }
}

export function validatePincode(pincode?: string): void {
  if (pincode && !/^\d{6}$/.test(pincode)) {
    throw new BadRequestException('pincode must be a 6-digit Indian postal code');
  }
}

export function resolveSportSlug(input?: { sportId?: string; sportSlug?: string; sportType?: string }): string | null {
  if (input?.sportSlug) return input.sportSlug.toLowerCase();
  if (input?.sportType) return SPORT_TYPE_TO_SLUG[input.sportType.toUpperCase()] ?? input.sportType.toLowerCase();
  return null;
}

export async function resolveSportId(
  prisma: PrismaService,
  input: { sportId?: string; sportSlug?: string; sportType?: string },
): Promise<string> {
  if (input.sportId) {
    const sport = await prisma.sport.findFirst({
      where: { id: input.sportId, deletedAt: null, isActive: true },
    });
    if (!sport) throw new BadRequestException('Invalid sportId');
    return sport.id;
  }

  const slug = resolveSportSlug(input);
  if (!slug) {
    throw new BadRequestException('sportId or sportSlug is required');
  }

  const sport = await prisma.sport.findFirst({
    where: { slug, deletedAt: null, isActive: true },
  });
  if (!sport) throw new BadRequestException(`Sport not found: ${slug}`);
  return sport.id;
}
