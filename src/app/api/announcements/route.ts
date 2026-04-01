import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

function safeJsonParse(str: string): unknown {
  if (!str) return [];
  try {
    return JSON.parse(str);
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const showAll = searchParams.get('all') === 'true';

    const whereClause = showAll ? '' : 'WHERE "isActive" = true';
    const announcements = await db.$queryRawUnsafe(
      `SELECT * FROM "Announcement" ${whereClause} ORDER BY "tanggal" DESC LIMIT $1`,
      limit
    );

    const parsed = (announcements as Record<string, unknown>[]).map((a) => ({
      ...a,
      images: safeJsonParse(a.images as string),
      attachments: safeJsonParse(a.attachments as string),
    }));

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error('Announcements fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch announcements' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, tanggal, images, attachments } = body;

    if (!title || !tanggal) {
      return NextResponse.json(
        { success: false, message: 'Judul dan tanggal wajib diisi' },
        { status: 400 }
      );
    }

    await db.$queryRawUnsafe(
      `INSERT INTO "Announcement" (id, title, content, tanggal, images, attachments, "isActive", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      randomUUID(),
      title,
      content || '',
      tanggal,
      JSON.stringify(images || []),
      JSON.stringify(attachments || []),
      true
    );

    return NextResponse.json({ success: true, message: 'Pengumuman berhasil ditambahkan' });
  } catch (error) {
    console.error('Announcement create error:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menambahkan pengumuman' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, content, tanggal, images, attachments, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID wajib diisi' },
        { status: 400 }
      );
    }

    await db.$queryRawUnsafe(
      `UPDATE "Announcement" SET title = $1, content = $2, tanggal = $3, images = $4, attachments = $5, "isActive" = $6, "updatedAt" = NOW() WHERE id = $7`,
      title,
      content || '',
      tanggal,
      JSON.stringify(images || []),
      JSON.stringify(attachments || []),
      isActive !== undefined ? isActive : true,
      id
    );

    return NextResponse.json({ success: true, message: 'Pengumuman berhasil diperbarui' });
  } catch (error) {
    console.error('Announcement update error:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui pengumuman' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID wajib diisi' },
        { status: 400 }
      );
    }

    const announcements = (await db.$queryRawUnsafe(
      `SELECT images, attachments FROM "Announcement" WHERE id = $1`,
      id
    )) as { images: string; attachments: string }[];

    if (announcements.length > 0) {
      const images = (safeJsonParse(announcements[0].images) as string[]) || [];
      const attachments = (safeJsonParse(announcements[0].attachments) as { url: string }[]) || [];
      const allUrls = [...images, ...attachments.map((a) => a.url)];
      if (allUrls.length > 0) {
        fetch(
          `/api/upload?${allUrls.map((u) => `url=${encodeURIComponent(u)}`).join('&')}`,
          { method: 'DELETE' }
        ).catch(() => {});
      }
    }

    await db.$queryRawUnsafe(`DELETE FROM "Announcement" WHERE id = $1`, id);
    return NextResponse.json({ success: true, message: 'Pengumuman berhasil dihapus' });
  } catch (error) {
    console.error('Announcement delete error:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus pengumuman' },
      { status: 500 }
    );
  }
}
