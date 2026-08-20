import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
  try {
    // We run the hardware sync script in the background.
    // In a real production app, this would be a proper background queue job.
    // For local clone, we can just execute the script.
    
    // We don't await it fully so we don't block the request for 5 minutes,
    // but we can start it. Pass the OLT id so only that OLT is synced.
    exec(`npx tsx sync_from_olt_hardware.ts ${resolvedParams.id}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error pulling ONUs: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Stderr pulling ONUs: ${stderr}`);
        }
        console.log(`Stdout pulling ONUs: ${stdout}`);
    });

    return NextResponse.json({ success: true, message: 'Sync started successfully. ONUs will appear shortly.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to start sync' }, { status: 500 });
  }
}
