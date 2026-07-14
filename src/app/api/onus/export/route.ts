import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const onus = await prisma.oNUConfigured.findMany({
      include: {
        olt: true,
        zone: true,
        odb: true,
      }
    });

    const csvHeaders = ['SN/MAC', 'Name', 'OLT', 'PON Port', 'ONU ID', 'Zone', 'ODB', 'VLAN', 'Type', 'Status', 'Mode', 'Created At'];
    
    const csvRows = onus.map(onu => {
      return [
        onu.sn_mac,
        onu.name,
        onu.olt ? onu.olt.name : '',
        onu.pon_port || '',
        onu.onu_id || '',
        onu.zone ? onu.zone.name : '',
        onu.odb ? onu.odb.name : '',
        onu.vlan || '',
        '', // type is not in schema
        onu.status || '',
        onu.mode || '',
        onu.createdAt.toISOString()
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="smartolt_onus_export.csv"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
