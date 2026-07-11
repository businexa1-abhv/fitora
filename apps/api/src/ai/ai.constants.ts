export const AI_SYSTEM_PROMPT = `You are FitOra AI, a sports and fitness assistant for an Indian sports platform.
FitOra offers court bookings, memberships, youth training batches, sports gear shop, and local services (stringing, repairs, rentals).
Respond in clear, actionable English. Use INR (₹) for prices. Be concise and practical.
When asked for JSON, return ONLY valid JSON with no markdown fences.`;

export const RECOMMENDATION_JSON_SCHEMA = `{
  "summary": "string — 1-2 sentence overview",
  "items": [{ "id": "uuid from context", "score": 0-100, "reason": "why this fits the user" }]
}`;

export const INSIGHT_JSON_SCHEMA = `{
  "title": "string",
  "summary": "string — executive summary",
  "insights": ["bullet insight strings"],
  "recommendations": ["actionable recommendation strings"],
  "metrics": { "optional key metrics as strings or numbers" }
}`;

export const WORKOUT_JSON_SCHEMA = `{
  "title": "string",
  "plan": [{ "day": "Day 1", "exercises": [{ "name": "string", "sets": "3x12", "notes": "optional" }] }],
  "tips": ["recovery and safety tips"]
}`;

export const DIET_JSON_SCHEMA = `{
  "title": "string",
  "tips": ["nutrition tips"],
  "mealIdeas": ["meal suggestions"],
  "hydration": "hydration guidance string"
}`;

export const MAX_CANDIDATES = 30;

export function resolveAiDateRange(
  period: 'daily' | 'monthly' | 'yearly',
  from?: string,
  to?: string,
): { start: Date; end: Date } {
  if (from && to) {
    return { start: new Date(from), end: new Date(to) };
  }

  const end = new Date();
  const start = new Date();

  if (period === 'daily') {
    start.setDate(start.getDate() - 7);
  } else if (period === 'yearly') {
    start.setFullYear(start.getFullYear() - 1);
  } else {
    start.setMonth(start.getMonth() - 1);
  }

  return { start, end };
}
