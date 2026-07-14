import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const olts = await prisma.oLTDevice.findMany({
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(olts);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch OLTs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Save to local SQLite via Prisma
    const newOlt = await prisma.oLTDevice.create({
      data: {
        name: body.name,
        ip_address: body.ipAddress,
        telnet_port: body.telnetPort || 23,
        telnet_user: body.username,
        telnet_pass: body.password,
        snmp_ro: body.snmpRo,
        snmp_rw: body.snmpRw,
        snmp_port: body.snmpPort || 161,
        snmp_version: body.snmpVersion || 'v2c',
        timeout: body.timeout || 10,
        signal_threshold: body.signalThreshold || -27.0,
        protocol: body.protocol || 'telnet',
        vendor: body.vendor || body.manufacturer?.toLowerCase() || 'zte',
        manufacturer: body.manufacturer,
        hardware_version: body.hardwareVersion,
        pon_types: body.ponTypes,
        iptv_module: body.iptv === true
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'Add OLT',
        details: `Added new OLT: ${newOlt.name} (${newOlt.ip_address})`,
        status: 'Success'
      }
    });

    return NextResponse.json({ success: true, olt: newOlt });
  } catch (error: any) {
    console.error("Add OLT Error:", error);
    return NextResponse.json({ success: false, error: error.message || 'Database error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });

    const oltId = parseInt(id);

    // First find all ONUs for this OLT to clean up their related records
    const onus = await prisma.oNUConfigured.findMany({ 
      where: { olt_id: oltId }, 
      select: { id: true } 
    });
    const onuIds = onus.map(o => o.id);

    if (onuIds.length > 0) {
      await prisma.notification.deleteMany({ where: { onu_id: { in: onuIds } } });
      await prisma.signalHistory.deleteMany({ where: { onu_id: { in: onuIds } } });
      await prisma.statusHistory.deleteMany({ where: { onu_id: { in: onuIds } } });
    }

    // Delete related records manually to avoid Foreign Key Constraint errors
    await prisma.oNUConfigured.deleteMany({ where: { olt_id: oltId } });
    await prisma.oNUUnconfigured.deleteMany({ where: { olt_id: oltId } });
    await prisma.vLAN.deleteMany({ where: { olt_id: oltId } });

    // Delete the actual OLT
    const deletedOlt = await prisma.oLTDevice.delete({ where: { id: oltId } });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'Delete OLT',
        details: `Deleted OLT: ${deletedOlt.name}`,
        status: 'Success'
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete OLT Error:", error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete OLT' }, { status: 500 });
  }
}
