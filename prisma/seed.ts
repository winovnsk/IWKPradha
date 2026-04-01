import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Buat admin user (password: admin123)
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@rt11.id' },
    update: {},
    create: {
      nama: 'Ketua RT 11',
      email: 'admin@rt11.id',
      password: hashedPassword,
      noHp: '081234567890',
      alamat: 'Blok A No. 1',
      role: 'admin',
      status: 'approved',
    },
  });
  console.log('✅ Admin user:', admin.email, '(password: admin123)');

  // 2. Buat settings default
  const defaultSettings = [
    { key: 'app_name', value: 'Iuran Wajib Komplek RT 11', description: 'Nama Aplikasi' },
    { key: 'alamat', value: 'Komplek Pradha Ciganitri, Bandung', description: 'Alamat' },
    { key: 'alamat_rt', value: 'Komplek Pradha Ciganitri', description: 'Alamat RT Singkat' },
    { key: 'ketua_rt', value: 'Ketua RT 11', description: 'Nama Ketua RT' },
    { key: 'sekretaris', value: 'Sekretaris RT 11', description: 'Nama Sekretaris' },
    { key: 'bendahara', value: 'Bendahara RT 11', description: 'Nama Bendahara' },
    { key: 'whatsapp_admin', value: '6281234567890', description: 'Nomor WhatsApp Admin' },
    { key: 'nominal_iuran', value: '100000', description: 'Nominal Iuran Bulanan' },
    { key: 'link_website', value: 'https://pradha-ciganitri.com', description: 'Link Website' },
    { key: 'bank_accounts', value: '[]', description: 'Rekening Bank (JSON)' },
    { key: 'saldo_awal', value: '0', description: 'Saldo Awal Keuangan' },
    { key: 'ketua_foto', value: '', description: 'Foto Ketua RT' },
    { key: 'ketua_wa', value: '6281234567890', description: 'WA Ketua RT' },
    { key: 'sekretaris_foto', value: '', description: 'Foto Sekretaris' },
    { key: 'sekretaris_wa', value: '', description: 'WA Sekretaris' },
    { key: 'bendahara_foto', value: '', description: 'Foto Bendahara' },
    { key: 'bendahara_wa', value: '', description: 'WA Bendahara' },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log(`✅ ${defaultSettings.length} settings seeded`);

  console.log('🎉 Seeding complete!');
  console.log('');
  console.log('═══════════════════════════════════');
  console.log('  Login Admin:');
  console.log('  Email: admin@rt11.id');
  console.log('  Password: admin123');
  console.log('═══════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
