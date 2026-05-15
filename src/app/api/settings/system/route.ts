import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    let config = await prisma.systemConfig.findUnique({ where: { id: 1 } });
    if (!config) {
      config = await prisma.systemConfig.create({ data: { id: 1, system_title: 'SmartOLT Clone' } });
    }
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const config = await prisma.systemConfig.upsert({
      where: { id: 1 },
      update: { 
        system_title: body.system_title, 
        timezone: body.timezone,
        allowed_ips: body.allowed_ips,
        smtp_host: body.smtp_host,
        smtp_port: body.smtp_port,
        smtp_user: body.smtp_user,
        smtp_pass: body.smtp_pass,
        sms_api_key: body.sms_api_key
      },
      create: { 
        id: 1, 
        system_title: body.system_title, 
        timezone: body.timezone,
        allowed_ips: body.allowed_ips,
        smtp_host: body.smtp_host,
        smtp_port: body.smtp_port,
        smtp_user: body.smtp_user,
        smtp_pass: body.smtp_pass,
        sms_api_key: body.sms_api_key
      }
    });
    return NextResponse.json({ success: true, config });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
  }
}
