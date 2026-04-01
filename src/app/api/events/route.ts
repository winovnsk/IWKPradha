import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
    const events = await db.$queryRawUnsafe(
      `SELECT * FROM "Event" ${whereClause} ORDER BY "tanggalMulai" DESC LIMIT $1`,
      limit
    );

    const parsed = (events as Record<string, unknown>[]).map((e) => ({
      ...e,
      images: safeJsonParse(e.images as string),
      attachments: safeJsonParse(e.attachments as string),
    }));

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error('Events fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, tanggalMulai, tanggalSelesai, lokasi, images, attachments } = body;

    if (!title || !tanggalMulai) {
      return NextResponse.json(
        { success: false, message: 'Judul dan tanggal mulai wajib diisi' },
        { status: 400 }
      );
    }

    await db.$queryRawUnsafe(
      `INSERT INTO "Event" (id, title, description, "tanggalMulai", "tanggalSelesai", lokasi, images, attachments, "isActive", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
      crypto.randomUUID(),
      title,
      description || '',
      tanggalMulai,
      tanggalSelesai || tanggalMulai,
      lokasi || '',
      JSON.stringify(images || []),
      JSON.stringify(attachments || []),
      true
    );

    return NextResponse.json({ success: true, message: 'Kegiatan berhasil ditambahkan' });
  } catch (error) {
    console.error('Event create error:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menambahkan kegiatan' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, description, tanggalMulai, tanggalSelesai, lokasi, images, attachments, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID wajib diisi' },
        { status: 400 }
      );
    }

    await db.$queryRawUnsafe(
      `UPDATE "Event" SET title = $1, description = $2, "tanggalMulai" = $3, "tanggalSelesai" = $4, lokasi = $5, images = $6, attachments = $7, "isActive" = $8, "updatedAt" = NOW() WHERE id = $9`,
      title,
      description || '',
      tanggalMulai,
      tanggalSelesai || tanggalMulai,
      lokasi || '',
      JSON.stringify(images || []),
      JSON.stringify(attachments || []),
      isActive !== undefined ? isActive : true,
      id
    );

    return NextResponse.json({ success: true, message: 'Kegiatan berhasil diperbarui' });
  } catch (error) {
    console.error('Event update error:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui kegiatan' },
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

    const events = (await db.$queryRawUnsafe(
      `SELECT images, attachments FROM "Event" WHERE id = $1`,
      id
    )) as { images: string; attachments: string }[];

    if (events.length > 0) {
      const images = (safeJsonParse(events[0].images) as string[]) || [];
      const attachments = (safeJsonParse(events[0].attachments) as { url: string }[]) || [];
      const allUrls = [...images, ...attachments.map((a) => a.url)];
      if (allUrls.length > 0) {
        fetch(
          `/api/upload?${allUrls.map((u) => `url=${encodeURIComponent(u)}`).join('&')}`,
          { method: 'DELETE' }
        ).catch(() => {});
      }
    }

    await db.$queryRawUnsafe(`DELETE FROM "Event" WHERE id = $1`, id);
    return NextResponse.json({ success: true, message: 'Kegiatan berhasil dihapus' });
  } catch (error) {
    console.error('Event delete error:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus kegiatan' },
      { status: 500 }
    );
  }
}
