import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const rows = await db.$queryRawUnsafe(
      `SELECT key, value FROM "Setting"`
    ) as Record<string, string>[];

    const settingsMap: Record<string, string> = {};
    rows.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    return NextResponse.json({ success: true, data: settingsMap });
  } catch (error) {
    console.error('Settings fetch error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch settings' }, { status: 500 });
  }
}
