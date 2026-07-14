import { redirect } from 'next/navigation';

export default async function OltDetailsIndexPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/olt/olt_details/${id}/details`);
}
