import prisma from '@/lib/prisma';
import { getOltPonPorts, OltCredentials } from '@/lib/oltConnection';
import PonPortsClient from './PonPortsClient';

export const revalidate = 0;

export default async function OltPonPortsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  
  // Do not fetch from OLT via Telnet on the server-side to avoid blocking the page load.
  // We pass an empty array and let the client component fetch or display a refresh button.
  return <PonPortsClient oltId={idStr} initialPorts={[]} />;
}
