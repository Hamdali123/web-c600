import prisma from '@/lib/prisma';
import OltsClient from './OltsClient';

export const revalidate = 0;

export default async function OltsPage() {
  let initialOlts: any[] = [];
  try {
    const olts = await prisma.oLTDevice.findMany({
      orderBy: { name: 'asc' }
    });
    initialOlts = JSON.parse(JSON.stringify(olts));
  } catch (e) {
    console.error("Failed to query OLTs on SSR:", e);
  }

  return <OltsClient initialOlts={initialOlts} />;
}
