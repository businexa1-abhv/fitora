/** Common kids training age bands for program setup */
export const AGE_GROUP_PRESETS = [
  { label: 'Tiny Tots', minAge: 3, maxAge: 5 },
  { label: 'Beginners', minAge: 6, maxAge: 8 },
  { label: 'Juniors', minAge: 9, maxAge: 12 },
  { label: 'Teens', minAge: 13, maxAge: 16 },
  { label: 'Youth', minAge: 17, maxAge: 18 },
] as const;

export function calculateAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export function ageGroupLabel(minAge: number, maxAge: number): string {
  const preset = AGE_GROUP_PRESETS.find((p) => p.minAge === minAge && p.maxAge === maxAge);
  return preset ? preset.label : `${minAge}–${maxAge} yrs`;
}
