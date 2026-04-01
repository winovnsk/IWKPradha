import { getSupabaseServerClient } from './supabase';

const BUCKET_NAME = 'uploads';

export interface UploadResult {
  url: string;
  name: string;
  size: number;
  type: 'image' | 'file';
}

/**
 * Upload file ke Supabase Storage
 */
export async function uploadFile(file: File, folder: string = ''): Promise<UploadResult> {
  const supabase = getSupabaseServerClient();
  const ext = file.name.split('.').pop() || 'bin';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const filename = `${timestamp}-${random}.${ext}`;
  const storagePath = folder ? `${folder}/${filename}` : filename;

  const bytes = await file.arrayBuffer();
  const buffer = new Uint8Array(bytes);

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload gagal: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  const isImage = file.type.startsWith('image/');

  return {
    url: urlData.publicUrl,
    name: file.name,
    size: file.size,
    type: isImage ? 'image' : 'file',
  };
}

/**
 * Hapus file dari Supabase Storage
 */
export async function deleteFile(url: string): Promise<void> {
  try {
    const supabase = getSupabaseServerClient();
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/uploads/');
    if (pathParts.length < 2) return;
    const storagePath = pathParts[1];

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([storagePath]);

    if (error) {
      console.error('Gagal menghapus file:', error.message);
    }
  } catch {
    // URL mungkin tidak valid, abaikan
  }
}

/**
 * Upload multiple files sekaligus
 */
export async function uploadFiles(files: File[], folder: string = ''): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  for (const file of files) {
    const result = await uploadFile(file, folder);
    results.push(result);
  }
  return results;
}
