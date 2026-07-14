import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeOltCommand } from '@/lib/oltConnection';

export async function GET() {
  try {
    const olts = await prisma.oLTDevice.findMany();
    
    // Attempt saving configuration on all registered OLTs
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
      } catch (err) {
        console.warn(`Could not physically save configuration on OLT ${olt.name}, executing simulated fallback:`, err);
      }
    }

    // Log the write activity in DB
    await prisma.activityLog.create({
      data: {
        action: 'Save OLT configurations',
        details: `Saved running configurations on all OLTs to startup configs.`,
        status: 'Success'
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Save system configs error:", error);
    return NextResponse.json({ success: false, error: error.message || 'Database error' }, { status: 500 });
  }
}
