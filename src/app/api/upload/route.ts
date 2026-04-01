import { NextRequest, NextResponse } from 'next/server';
import { uploadFiles, deleteFile } from '@/lib/storage';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const folder = (formData.get('folder') as string) || '';

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, message: 'Tidak ada file yang diunggah' }, { status: 400 });
    }
    if (files.length > 10) {
      return NextResponse.json({ success: false, message: 'Maksimal 10 file sekaligus' }, { status: 400 });
    }

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ success: false, message: `File "${file.name}" melebihi batas 5MB` }, { status: 400 });
      }
      const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
      const isAllowedFile = ALLOWED_FILE_TYPES.includes(file.type);
      if (!isImage && !isAllowedFile) {
        return NextResponse.json({ success: false, message: `Tipe file "${file.name}" tidak didukung` }, { status: 400 });
      }
    }

    const results = await uploadFiles(files, folder);
    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ success: false, message: 'Gagal mengunggah file' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const urls = searchParams.getAll('url');
    if (!urls.length) {
      return NextResponse.json({ success: false, message: 'Tidak ada URL file' }, { status: 400 });
    }
    for (const url of urls) {
      await deleteFile(url);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete file error:', error);
    return NextResponse.json({ success: false, message: 'Gagal menghapus file' }, { status: 500 });
  }
}
