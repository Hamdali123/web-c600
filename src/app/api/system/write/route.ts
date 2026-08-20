import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeOltCommand } from '@/lib/oltConnection';

export async function POST() {
  try {
    const olts = await prisma.oLTDevice.findMany();
    const results: { id: number; name: string; ok: boolean; error?: string }[] = [];

    for (const olt of olts) {
      try {
        const cmd = olt.vendor?.toLowerCase() === 'huawei'
          ? 'save'
          : 'write';

        await executeOltCommand({
          ip: olt.ip_address,
          port: olt.telnet_port,
          username: olt.telnet_user || '',
          password: olt.telnet_pass || '',
          protocol: (olt.protocol as any) || 'telnet',
          vendor: (olt.vendor as any) || 'zte'
        }, cmd);

        results.push({ id: olt.id, name: olt.name, ok: true });
      } catch (err: any) {
        console.warn(`Could not save configuration on OLT ${olt.name}:`, err);
        results.push({ id: olt.id, name: olt.name, ok: false, error: err?.message || 'Connection failed' });
      }
    }

    const savedCount = results.filter(r => r.ok).length;

    await prisma.activityLog.create({
      data: {
        action: 'Save OLT configurations',
        details: `Saved configurations on ${savedCount}/${olts.length} OLTs to startup configs.`,
        status: savedCount === olts.length ? 'Success' : 'Error'
      }
    });

    return NextResponse.json({ success: savedCount > 0, savedCount, total: olts.length, results });
  } catch (error: any) {
    console.error("Save system configs error:", error);
    return NextResponse.json({ success: false, error: error.message || 'Database error' }, { status: 500 });
  }
}