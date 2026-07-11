/** Curated amenity list for court validation */
export const COURT_AMENITIES = [
  'Parking',
  'AC',
  'Changing rooms',
  'Showers',
  'Cafe',
  'Pro shop',
  'Floodlights',
  'Coaching',
  'Equipment rental',
  'Wheelchair access',
  'Drinking water',
  'First aid',
  'Lockers',
  'WiFi',
  'CCTV',
  'Seating gallery',
] as const;

export type CourtAmenity = (typeof COURT_AMENITIES)[number];

/** Maps legacy SportType enum values to sport slugs in the Sport table */
export const SPORT_TYPE_TO_SLUG: Record<string, string> = {
  BADMINTON: 'badminton',
  TENNIS: 'tennis',
  CRICKET: 'cricket',
  FOOTBALL: 'football',
  SWIMMING: 'swimming',
  GYM: 'gym',
  OTHER: 'other',
};

export const DEFAULT_SPORTS = [
  { name: 'Badminton', slug: 'badminton', sortOrder: 1 },
  { name: 'Tennis', slug: 'tennis', sortOrder: 2 },
  { name: 'Cricket', slug: 'cricket', sortOrder: 3 },
  { name: 'Football', slug: 'football', sortOrder: 4 },
  { name: 'Swimming', slug: 'swimming', sortOrder: 5 },
  { name: 'Gym', slug: 'gym', sortOrder: 6 },
  { name: 'Other', slug: 'other', sortOrder: 99 },
] as const;
