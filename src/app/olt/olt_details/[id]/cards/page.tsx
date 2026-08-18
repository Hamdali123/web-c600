import prisma from '@/lib/prisma';
import { getOltCards, OltCredentials } from '@/lib/oltConnection';
import CardsClient from './CardsClient';

export const revalidate = 0;

export default async function OltCardsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr);
  let initialCards: any[] = [];

  try {
    const olt = await prisma.oLTDevice.findUnique({ where: { id } });
    if (olt) {
      const creds: OltCredentials = {
        ip: olt.ip_address,
        port: olt.telnet_port,
        username: olt.telnet_user || '',
        password: olt.telnet_pass || '',
        protocol: (olt.protocol as 'telnet' | 'ssh') || 'telnet',
        vendor: (olt.vendor as 'zte' | 'huawei') || 'zte'
      };
      initialCards = await getOltCards(creds);
    }
  } catch (e) {
    console.error("SSR OLT cards error:", e);
  }

  return <CardsClient oltId={idStr} initialCards={JSON.parse(JSON.stringify(initialCards))} />;
}
