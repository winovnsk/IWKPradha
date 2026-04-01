-- ═══════════════════════════════════════════════════════════
-- IWK RT 11 - Supabase SQL Setup Script
-- Jalankan ini di Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ── Aktifkan RLS untuk semua tabel ──
ALTER TABLE "Setting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Announcement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- ── Setting: publik bisa baca ──
CREATE POLICY "Setting public read" ON "Setting"
  FOR SELECT USING (true);

CREATE POLICY "Setting admin write" ON "Setting"
  FOR ALL USING (true);

-- ── Announcement: publik bisa baca ──
CREATE POLICY "Announcement public read" ON "Announcement"
  FOR SELECT USING (true);

CREATE POLICY "Announcement admin write" ON "Announcement"
  FOR ALL USING (true);

-- ── Event: publik bisa baca ──
CREATE POLICY "Event public read" ON "Event"
  FOR SELECT USING (true);

CREATE POLICY "Event admin write" ON "Event"
  FOR ALL USING (true);

-- ── Transaction: semua bisa baca ──
CREATE POLICY "Transaction read all" ON "Transaction"
  FOR SELECT USING (true);

CREATE POLICY "Transaction admin write" ON "Transaction"
  FOR ALL USING (true);

-- ── User: semua bisa baca ──
CREATE POLICY "User read all" ON "User"
  FOR SELECT USING (true);

CREATE POLICY "User insert" ON "User"
  FOR INSERT WITH CHECK (true);

CREATE POLICY "User update" ON "User"
  FOR UPDATE USING (true);
