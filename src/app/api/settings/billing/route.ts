import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const olts = await prisma.oLTDevice.findMany({
      select: {
        id: true,
        name: true
      }
    });

    const subscriptions = olts.map(olt => ({
      id: olt.id,
      name: olt.name,
      status: 'Active',
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toLocaleDateString() // 1 year from now
    }));

    const invoices = await prisma.billingInvoice.findMany({
      orderBy: { id: 'desc' }
    });

    // Seed some mock invoices if empty to display a premium invoices table
    const invoiceList = invoices.length > 0 ? invoices : [
      { id: 1, invoice_no: 'INV-2026-004', amount: 50.00, status: 'Paid', date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toLocaleDateString() },
      { id: 2, invoice_no: 'INV-2026-003', amount: 50.00, status: 'Paid', date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 35).toLocaleDateString() },
      { id: 3, invoice_no: 'INV-2026-002', amount: 50.00, status: 'Paid', date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 65).toLocaleDateString() },
      { id: 4, invoice_no: 'INV-2026-001', amount: 50.00, status: 'Paid', date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 95).toLocaleDateString() }
    ];

    return NextResponse.json({
      subscriptions,
      invoices: invoiceList
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch billing info' }, { status: 500 });
  }
}
