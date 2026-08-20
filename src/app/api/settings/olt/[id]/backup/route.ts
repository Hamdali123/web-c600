import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';
import { fetchOltRunningConfig, executeOltCommand, saveConfig, OltCredentials } from '@/lib/oltConnection';

const BACKUP_DIR = path.join(process.cwd(), 'backups');

function getOltDir(oltId: number) {
    const dir = path.join(BACKUP_DIR, `OLT_${oltId}`);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const oltId = parseInt(id);
    const { searchParams } = new URL(request.url);

    const download = searchParams.get('download');
    if (download) {
        const filePath = path.join(getOltDir(oltId), path.basename(download));
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'Backup file not found' }, { status: 404 });
        }
        const content = fs.readFileSync(filePath, 'utf8');
        return new NextResponse(content, {
            headers: {
                'Content-Type': 'text/plain',
                'Content-Disposition': `attachment; filename="${download}"`
            }
        });
    }

    try {
        const dir = getOltDir(oltId);
        const files = fs.readdirSync(dir)
            .filter(f => f.endsWith('.txt'))
            .map(f => {
                const stat = fs.statSync(path.join(dir, f));
                const content = fs.readFileSync(path.join(dir, f), 'utf8');
                return {
                    id: f,
                    date: stat.mtime.toISOString().slice(0, 19).replace('T', ' '),
                    lines: content.split('\n').length.toLocaleString('en-US'),
                    size: `${Math.max(1, Math.round(stat.size / 1024))} KB`,
                    type: f.startsWith('auto_') ? 'Automatic Backup' : 'Manual Backup'
                };
            })
            .sort((a, b) => b.date.localeCompare(a.date));

        return NextResponse.json({ success: true, backups: files });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to list backups' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const oltId = parseInt(id);

    const olt = await prisma.oLTDevice.findUnique({ where: { id: oltId } });
    if (!olt) return NextResponse.json({ error: 'OLT not found' }, { status: 404 });

    const creds: OltCredentials = {
        ip: olt.ip_address,
        port: olt.telnet_port || 23,
        username: olt.telnet_user || '',
        password: olt.telnet_pass || '',
        protocol: (olt.protocol as any) || 'telnet',
        vendor: (olt.vendor as any) || 'zte'
    };

    const body = await request.json().catch(() => ({}));
    const prefix = body.auto ? 'auto_' : 'manual_';
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `${prefix}${ts}.txt`;
    const filePath = path.join(getOltDir(oltId), filename);

    try {
        const rc = await fetchOltRunningConfig(creds, 8000);
        fs.writeFileSync(filePath, rc);
        const stat = fs.statSync(filePath);
        return NextResponse.json({
            success: true,
            file: filename,
            size: `${Math.max(1, Math.round(stat.size / 1024))} KB`,
            lines: rc.split('\n').length
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to fetch running config' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const oltId = parseInt(id);

    const olt = await prisma.oLTDevice.findUnique({ where: { id: oltId } });
    if (!olt) return NextResponse.json({ error: 'OLT not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const file = body.file;
    if (!file) return NextResponse.json({ error: 'Backup file is required' }, { status: 400 });

    const filePath = path.join(getOltDir(oltId), path.basename(file));
    if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: 'Backup file not found' }, { status: 404 });
    }

    const creds: OltCredentials = {
        ip: olt.ip_address,
        port: olt.telnet_port || 23,
        username: olt.telnet_user || '',
        password: olt.telnet_pass || '',
        protocol: (olt.protocol as any) || 'telnet',
        vendor: (olt.vendor as any) || 'zte'
    };

    try {
        const content = fs.readFileSync(filePath, 'utf8')
            .replace(/^show running-config.*$/m, '')
            .replace(/^\$.*$/m, '')
            .trim();
        const output = await executeOltCommand(creds, `configure terminal\n${content}\nexit`, { failOnError: false });
        await saveConfig(creds);
        const errors = output.split('\n').filter(l => l.includes('%Error'));
        return NextResponse.json({
            success: true,
            message: errors.length > 0
                ? `Restored with ${errors.length} warning(s): ${errors[0].trim().slice(0, 100)}`
                : 'Configuration restored successfully',
            warnings: errors.length
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to restore config' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const oltId = parseInt(id);
    const body = await request.json().catch(() => ({}));
    const file = body.file;
    if (!file) return NextResponse.json({ error: 'Backup file is required' }, { status: 400 });

    const filePath = path.join(getOltDir(oltId), path.basename(file));
    if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: 'Backup file not found' }, { status: 404 });
    }

    fs.unlinkSync(filePath);
    return NextResponse.json({ success: true });
}