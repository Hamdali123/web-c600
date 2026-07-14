import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    console.log(`FETCHING OLT DETAILS FOR ID: ${idStr}`);
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const olt = await prisma.oLTDevice.findUnique({
      where: { id: id },
      include: {
        vlans: true,
      }
    });

    console.log(`PRISMA RESULT FOR ID ${id}:`, JSON.stringify(olt));

    if (!olt) {
      return NextResponse.json({ error: 'OLT not found' }, { status: 404 });
    }

    return NextResponse.json(olt);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch OLT details' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();

    const updatedOlt = await prisma.oLTDevice.update({
      where: { id: id },
      data: {
        name: body.name,
        ip_address: body.ipAddress,
        telnet_port: body.telnetPort || 23,
        telnet_user: body.username,
        telnet_pass: body.password,
        snmp_ro: body.snmpRo,
        snmp_rw: body.snmpRw,
        snmp_port: body.snmpPort || 161,
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
        action: 'Edit OLT',
        details: `Edited OLT: ${updatedOlt.name} (${updatedOlt.ip_address})`,
        status: 'Success'
      }
    });

    return NextResponse.json({ success: true, olt: updatedOlt });
  } catch (error: any) {
    console.error("Edit OLT Error:", error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update OLT' }, { status: 500 });
  }
}

