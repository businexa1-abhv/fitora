import { redirect } from 'next/navigation';

export default async function CourtDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/owner/courts/${id}/slots`);
}
