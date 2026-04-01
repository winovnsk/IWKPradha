import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/* ═══════════════════════════════════════════════════════════════ */
/*  SERVER-SIDE REPORT EXPORT (PDF / Excel / CSV)               */
/*                                                               */
/*  FORMAT:                                                      */
/*  Pendapatan: kategori + total saja                            */
/*  Pengeluaran: kategori header → item digabung per deskripsi   */
/*    Kebersihan & Keamanan dipisah sebagai kategori sendiri     */
/*    Deskripsi sama digabung (misal ATK Jan+Feb = 1 baris)      */
/*  Dicetak oleh: nama user yang download laporan               */
/* ═══════════════════════════════════════════════════════════════ */

const INCOME_SOURCE_NAMES: Record<string, string> = {
  'IURANBULANAN': 'Iuran IWK',
  'IURANINSIDENTAL': 'Iuran Insidental',
  'DONASI': 'Donasi',
  'DENDA': 'Denda',
  'SALDOAWAL': 'Saldo Awal',
  'LAINLAIN_IN': 'Lain-lain',
  'CAT-IB': 'Iuran IWK',
  'CAT-II': 'Iuran Insidental',
  'CAT-DON': 'Donasi',
  'CAT-DND': 'Denda',
  'CAT-SA': 'Saldo Awal',
  'CAT-LIN': 'Lain-lain',
};

const EXPENSE_CATEGORY_NAMES: Record<string, string> = {
  'KEBERSIHAN': 'Kebersihan',
  'KEAMANAN': 'Keamanan',
  'OPERASIONALRUTIN': 'Operasional',
  'ADMINISTRASI': 'Administrasi',
  'INFRASTRUKTURLINGKUNGAN': 'Infrastruktur Lingkungan',
  'SOSIALKEMANUSIAAN': 'Sosial Kemanusiaan',
  'KEGIATANWARGA': 'Kegiatan Warga',
  'LAINLAIN_OUT': 'Lain-lain',
  'CAT-KBR': 'Kebersihan',
  'CAT-KMN': 'Keamanan',
  'CAT-OR': 'Operasional',
  'CAT-ADM': 'Administrasi',
  'CAT-INF': 'Infrastruktur Lingkungan',
  'CAT-SOS': 'Sosial Kemanusiaan',
  'CAT-KGT': 'Kegiatan Warga',
  'CAT-LEX': 'Lain-lain',
};

// Urutan kategori pengeluaran di laporan
const EXPENSE_ORDER = ['KEBERSIHAN','CAT-KBR','KEAMANAN','CAT-KMN','OPERASIONALRUTIN','CAT-OR','ADMINISTRASI','CAT-ADM','INFRASTRUKTURLINGKUNGAN','CAT-INF','SOSIALKEMANUSIAAN','CAT-SOS','KEGIATANWARGA','CAT-KGT','LAINLAIN_OUT','CAT-LEX'];

const MONTH_NAMES_FULL = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
];

function formatRupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function formatDateId(s: string): string {
  const d = new Date(s);
  return `${d.getDate()} ${MONTH_NAMES_FULL[d.getMonth()]} ${d.getFullYear()}`;
}

function formatMonthYear(ym: string): string {
  const [year, month] = ym.split('-');
  return `${MONTH_NAMES_FULL[parseInt(month) - 1]} ${year}`;
}

function getIncomeLabel(catId: string): string {
  return INCOME_SOURCE_NAMES[catId] || 'Lainnya';
}

function getExpenseLabel(catId: string): string {
  return EXPENSE_CATEGORY_NAMES[catId] || 'Lainnya';
}

function getExpenseSortKey(catId: string): number {
  const idx = EXPENSE_ORDER.indexOf(catId);
  return idx >= 0 ? idx : 999;
}

/* ═══════════════════════════════════════════════════════════ */
/*  TYPES                                                      */
/* ═══════════════════════════════════════════════════════════ */
interface TxRow {
  id: string; type: string; categoryId: string; nominal: number;
  tanggal: string; status: string; deskripsi: string;
}

interface ExpenseCategoryGroup {
  label: string;
  total: number;
  items: [string, number][];
}

interface ReportData {
  totalIncome: number;
  totalExpense: number;
  saldoAwal: number;
  saldoAkhir: number;
  saldoAwalLabel: string;
  incomeList: [string, number][];
  expenseList: ExpenseCategoryGroup[];
  cashFlowMonthly: {
    bulan: string; saldoAwal: number; pemasukan: number;
    pengeluaran: number; net: number; saldoAkhir: number;
  }[];
  periodLabel: string;
  exportDate: string;
  printedBy: string;
}

/* ═══════════════════════════════════════════════════════════ */
/*  BUILD REPORT DATA                                          */
/* ═══════════════════════════════════════════════════════════ */
function buildReportData(transactions: TxRow[], startDate: string, endDate: string, saldoAwal: number, printedBy: string, startMonth?: string, endMonth?: string): ReportData {
  let totalIncome = 0;
  let totalExpense = 0;
  for (const t of transactions) {
    if (t.type === 'income') totalIncome += t.nominal;
    else totalExpense += t.nominal;
  }

  // Pendapatan: kategori + total saja
  const incomeMap: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type === 'income') {
      const label = getIncomeLabel(t.categoryId);
      incomeMap[label] = (incomeMap[label] || 0) + t.nominal;
    }
  }
  const incomeList = Object.entries(incomeMap).sort((a, b) => b[1] - a[1]);

  // Kategori yang ditampilkan per-transaksi (tidak digabung), dengan bulan di deskripsi
  const PER_TRANSACTION_CATS = new Set(['KEBERSIHAN', 'CAT-KBR', 'KEAMANAN', 'CAT-KMN']);

  // Pengeluaran: kategori → item
  const expenseCatMap: Record<string, { sortKey: number; label: string; items: Record<string, number> }> = {};
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    const catLabel = getExpenseLabel(t.categoryId);
    const sortKey = getExpenseSortKey(t.categoryId);
    if (!expenseCatMap[catLabel]) {
      expenseCatMap[catLabel] = { sortKey, label: catLabel, items: {} };
    }
    // Kebersihan & Keamanan: tampilkan per transaksi dengan bulan
    // Contoh: "Gaji kebersihan Bpk Supri - Januari"
    if (PER_TRANSACTION_CATS.has(t.categoryId)) {
      const mNum = parseInt(t.tanggal.split('-')[1]) - 1;
      const bulan = MONTH_NAMES_FULL[mNum] || '';
      const key = (t.deskripsi || catLabel).trim() + ' - ' + bulan;
      expenseCatMap[catLabel].items[key] = (expenseCatMap[catLabel].items[key] || 0) + t.nominal;
    } else {
      // Kategori lain: digabung per deskripsi yang sama
      const deskripsi = (t.deskripsi || catLabel).trim();
      expenseCatMap[catLabel].items[deskripsi] = (expenseCatMap[catLabel].items[deskripsi] || 0) + t.nominal;
    }
  }

  const expenseList = Object.entries(expenseCatMap)
    .map(([catKey, v]) => {
      // Kebersihan & Keamanan: urutkan per bulan (Januari → Februari → dst)
      let sortedItems;
      if (PER_TRANSACTION_CATS.has(catKey)) {
        const monthOrder = MONTH_NAMES_FULL.reduce<Record<string, number>>((acc, m, i) => { acc[m] = i; return acc; }, {});
        sortedItems = Object.entries(v.items).sort((a, b) => {
          // Extract bulan from "Deskripsi - Bulan"
          const mA = a[0].split(' - ').pop() || '';
          const mB = b[0].split(' - ').pop() || '';
          return (monthOrder[mA] ?? 99) - (monthOrder[mB] ?? 99);
        });
      } else {
        // Kategori lain: urutkan berdasar nominal terbesar
        sortedItems = Object.entries(v.items).sort((a, b) => b[1] - a[1]);
      }
      return {
        label: v.label,
        total: Object.values(v.items).reduce((s, val) => s + val, 0),
        items: sortedItems,
      };
    })
    .sort((a, b) => {
      const keyA = getExpenseSortKey(a.label);
      const keyB = getExpenseSortKey(b.label);
      return keyA - keyB;
    });

  // Arus Kas Bulanan — generate ALL months in the selected range
  const txMonthlyMap: Record<string, { income: number; expense: number }> = {};
  for (const t of transactions) {
    const m = t.tanggal.substring(0, 7);
    if (!txMonthlyMap[m]) txMonthlyMap[m] = { income: 0, expense: 0 };
    if (t.type === 'income') txMonthlyMap[m].income += t.nominal;
    else txMonthlyMap[m].expense += t.nominal;
  }

  // Build complete list of months in range
  let allMonths: string[] = [];
  const effectiveStartMonth = startMonth || (transactions.length > 0 ? transactions[0].tanggal.substring(0, 7) : '');
  const effectiveEndMonth = endMonth || (transactions.length > 0 ? transactions[transactions.length - 1].tanggal.substring(0, 7) : '');

  if (effectiveStartMonth && effectiveEndMonth) {
    const [sy, sm] = effectiveStartMonth.split('-').map(Number);
    const [ey, em] = effectiveEndMonth.split('-').map(Number);
    let curY = sy, curM = sm;
    while (curY < ey || (curY === ey && curM <= em)) {
      allMonths.push(`${curY}-${String(curM).padStart(2, '0')}`);
      curM++;
      if (curM > 12) { curM = 1; curY++; }
    }
  } else if (transactions.length > 0) {
    allMonths = [...new Set(transactions.map(t => t.tanggal.substring(0, 7)))].sort();
  }

  // Check if range spans multiple years — if yes, show year in month labels
  const hasMultiYear = allMonths.length >= 2 && allMonths[0].substring(0, 4) !== allMonths[allMonths.length - 1].substring(0, 4);

  let runningBalance = saldoAwal;
  const cashFlowMonthly = allMonths.map(month => {
    const d = txMonthlyMap[month] || { income: 0, expense: 0 };
    const mNum = parseInt(month.split('-')[1]);
    const yNum = parseInt(month.substring(0, 4));
    const prevSaldo = runningBalance;
    runningBalance += d.income - d.expense;
    return {
      bulan: hasMultiYear
        ? `${MONTH_NAMES_FULL[mNum - 1]} ${yNum}`
        : (MONTH_NAMES_FULL[mNum - 1] || month),
      saldoAwal: prevSaldo,
      pemasukan: d.income,
      pengeluaran: d.expense,
      net: d.income - d.expense,
      saldoAkhir: runningBalance,
    };
  });

  // Saldo akhir label = last month in range
  const lastMonthLabel = allMonths.length > 0
    ? 'Saldo Akhir ' + formatMonthYear(allMonths[allMonths.length - 1])
    : 'Saldo Akhir';

  // Period label
  const startFmt = startDate ? formatDateId(startDate) : 'Awal';
  const endFmt = endDate ? formatDateId(endDate) : 'Sekarang';
  const now = new Date();
  const exportDate = `${String(now.getDate()).padStart(2,'0')} ${MONTH_NAMES_FULL[now.getMonth()]} ${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  let periodLabel = `${startFmt} s.d. ${endFmt}`;
  if (startDate && endDate && startDate.endsWith('-01') && startDate.substring(0, 7) === endDate.substring(0, 7)) {
    periodLabel = formatMonthYear(startDate.substring(0, 7));
  } else if (startDate?.endsWith('-01') && endDate) {
    const startM = formatMonthYear(startDate.substring(0, 7));
    const [ey, em] = endDate.split('-').map(Number);
    const lastDay = new Date(ey, em, 0).getDate();
    if (parseInt(endDate.split('-')[2]) === lastDay) {
      periodLabel = `${startM} s.d. ${formatMonthYear(endDate.substring(0, 7))}`;
    }
  }

  return {
    totalIncome,
    totalExpense,
    saldoAwal,
    saldoAkhir: saldoAwal + totalIncome - totalExpense,
    incomeList,
    expenseList,
    cashFlowMonthly,
    periodLabel,
    exportDate,
    printedBy,
    saldoAwalLabel: 'Saldo Awal',
  };
}

/**
 * Hitung saldo awal laporan = saldo akhir bulan sebelumnya.
 * = initial_saldo_awal (dari settings) + semua income sebelum periode - semua expense sebelum periode
 */
async function hitungSaldoAwalPeriode(startMonth: string, initialSaldoAwal: number): Promise<{ saldoAwal: number; label: string }> {
  if (!startMonth) {
    return { saldoAwal: initialSaldoAwal, label: 'Saldo Awal Pertama Kali' };
  }

  // Single aggregate query instead of loading all rows
  const rows = await db.$queryRawUnsafe(
    `SELECT 
      SUM(CASE WHEN type = 'income' THEN nominal ELSE 0 END) as total_income,
      SUM(CASE WHEN type != 'income' THEN nominal ELSE 0 END) as total_expense,
      MAX(SUBSTRING(tanggal, 1, 7)) as last_month
    FROM "Transaction" 
    WHERE status = 'approved' AND tanggal < $1`,
    startMonth + '-01'
  ) as { total_income: number | null; total_expense: number | null; last_month: string | null }[];

  const row = rows[0];
  const inc = Number(row?.total_income) || 0;
  const exp = Number(row?.total_expense) || 0;
  const saldo = initialSaldoAwal + inc - exp;

  let label = 'Saldo Awal Pertama Kali';
  if (row?.last_month) {
    label = 'Saldo Akhir ' + formatMonthYear(row.last_month);
  }

  return { saldoAwal: saldo, label };
}

/* ═══════════════════════════════════════════════════════════ */
/*  CSV GENERATOR                                               */
/* ═══════════════════════════════════════════════════════════ */
function generateCSV(data: ReportData): string {
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const row = (cols: (string | number)[]) => cols.map(esc).join(',');

  const lines: string[] = [
    'LAPORAN KEUANGAN RT 11',
    'Komplek Pradha Ciganitri',
    'Periode: ' + data.periodLabel,
    'Dicetak: ' + data.exportDate,
    'Dicetak oleh: ' + (data.printedBy || '-'),
    '',
    'PENDAPATAN',
    'Uraian,Jumlah (Rp)',
  ];

  for (const [label, total] of data.incomeList) {
    lines.push(row([label, total]));
  }
  lines.push(row(['Total Pendapatan', data.totalIncome]));
  lines.push('');

  lines.push('PENGELUARAN');
  lines.push('Uraian,Jumlah (Rp)');
  for (const g of data.expenseList) {
    lines.push(row([g.label, '']));
    for (const [deskripsi, nominal] of g.items) {
      lines.push(row(['  - ' + deskripsi, nominal]));
    }
    lines.push(row(['  Subtotal ' + g.label, g.total]));
    lines.push('');
  }
  lines.push(row(['Total Pengeluaran', data.totalExpense]));
  lines.push('');

  lines.push('NERACA');
  lines.push('Uraian,Jumlah (Rp)');
  lines.push(row([data.saldoAwalLabel, data.saldoAwal]));
  lines.push(row(['(+) Pendapatan', data.totalIncome]));
  lines.push(row(['(-) Pengeluaran', data.totalExpense]));
  lines.push(row(['SALDO AKHIR', data.saldoAkhir]));
  lines.push('');

  lines.push('ARUS KAS BULANAN');
  lines.push('Bulan,Saldo Awal,Pemasukan,Pengeluaran,Net,Saldo Akhir');
  for (const r of data.cashFlowMonthly) {
    lines.push(row([r.bulan, r.saldoAwal, r.pemasukan, r.pengeluaran, r.net, r.saldoAkhir]));
  }

  return '\uFEFF' + lines.join('\n');
}

/* ═══════════════════════════════════════════════════════════ */
/*  EXCEL GENERATOR                                             */
/* ═══════════════════════════════════════════════════════════ */
async function generateExcelBuffer(data: ReportData): Promise<Buffer> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const rows: (string | number)[][] = [
    ['LAPORAN KEUANGAN RT 11', '', ''],
    ['Komplek Pradha Ciganitri', '', ''],
    ['Periode: ' + data.periodLabel, '', ''],
    ['Dicetak: ' + data.exportDate, '', ''],
    ['Dicetak oleh: ' + (data.printedBy || '-'), '', ''],
    [],
    ['PENDAPATAN', 'Jumlah (Rp)', ''],
  ];
  for (const [label, total] of data.incomeList) {
    rows.push([label, total, '']);
  }
  rows.push(['Total Pendapatan', data.totalIncome, '']);
  rows.push([]);
  rows.push([]);
  rows.push(['PENGELUARAN', 'Jumlah (Rp)', '']);
  for (const g of data.expenseList) {
    rows.push([g.label, '', '']);
    for (const [deskripsi, nominal] of g.items) {
      rows.push(['  - ' + deskripsi, nominal, '']);
    }
    rows.push(['  Subtotal ' + g.label, g.total, '']);
    rows.push([]);
  }
  rows.push(['Total Pengeluaran', data.totalExpense, '']);
  rows.push([]);
  rows.push([]);
  rows.push(['NERACA', '', '']);
  rows.push([data.saldoAwalLabel, data.saldoAwal, '']);
  rows.push(['(+) Pendapatan', data.totalIncome, '']);
  rows.push(['(-) Pengeluaran', data.totalExpense, '']);
  rows.push(['SALDO AKHIR', data.saldoAkhir, '']);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 45 }, { wch: 22 }, { wch: 16 }];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 2 } },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan Keuangan');

  // Arus Kas Bulanan
  const rows2: (string | number)[][] = [
    ['ARUS KAS BULANAN - ' + data.periodLabel, '', '', '', '', ''],
    [],
    ['Bulan', 'Saldo Awal (Rp)', 'Pemasukan (Rp)', 'Pengeluaran (Rp)', 'Net (Rp)', 'Saldo Akhir (Rp)'],
    ...data.cashFlowMonthly.map(r => [
      r.bulan, r.saldoAwal, r.pemasukan, r.pengeluaran, r.net, r.saldoAkhir,
    ]),
    ['TOTAL', '-', data.totalIncome, data.totalExpense, data.totalIncome - data.totalExpense, '-'],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(rows2);
  ws2['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Arus Kas Bulanan');

  return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
}

/* ═══════════════════════════════════════════════════════════ */
/*  PDF GENERATOR                                               */
/* ═══════════════════════════════════════════════════════════ */
async function generatePDFBuffer(data: ReportData): Promise<Buffer> {
  const { jsPDF } = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = autoTableModule.default as (doc: unknown, options: Record<string, unknown>) => void;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const getLastY = () => (doc as unknown as Record<string, Record<string, number>>).lastAutoTable?.finalY ?? 30;
  const ensureSpace = (needed: number) => {
    if (getLastY() + needed > 265) { doc.addPage(); return 20; }
    return getLastY();
  };

  // ─── Header ─────────────────────────────────────────────
  doc.setFillColor(26, 60, 94);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('LAPORAN KEUANGAN RT 11', 105, 10, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Komplek Pradha Ciganitri  |  Periode: ' + data.periodLabel, 105, 17, { align: 'center' });
  doc.setFontSize(7);
  doc.setTextColor(200, 200, 200);
  doc.text('Dicetak: ' + data.exportDate + '  |  Oleh: ' + (data.printedBy || '-'), 105, 24, { align: 'center' });

  // ─── 1. Pendapatan ──────────────────────────────────────
  let y = 38;
  doc.setTextColor(26, 60, 94);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PENDAPATAN', 14, y);

  autoTable(doc, {
    startY: y + 3,
    head: [['Uraian', 'Jumlah (Rp)']],
    body: [
      ...data.incomeList.map(([label, total]) => [label, formatRupiah(total)]),
      [{ content: 'Total Pendapatan', styles: { fontStyle: 'bold', fillColor: [46, 125, 50], textColor: [255, 255, 255] } }, { content: formatRupiah(data.totalIncome), styles: { fontStyle: 'bold', fillColor: [46, 125, 50], textColor: [255, 255, 255], halign: 'right' } }],
    ],
    theme: 'plain',
    headStyles: { fillColor: [26, 60, 94], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', cellPadding: 4 },
    bodyStyles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 110 }, 1: { cellWidth: 65, halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  // ─── 2. Pengeluaran ─────────────────────────────────────
  y = ensureSpace(20) + 10;
  if (y > 250) { doc.addPage(); y = 20; }

  doc.setTextColor(26, 60, 94);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PENGELUARAN', 14, y);

  const expenseBody: (string | { content: string; styles?: Record<string, unknown> })[][] = [];
  for (const g of data.expenseList) {
    expenseBody.push([{
      content: g.label,
      styles: { fontStyle: 'bold', fontSize: 9, textColor: [198, 40, 40], fillColor: [255, 243, 243] },
    }, {
      content: '',
      styles: { fillColor: [255, 243, 243] },
    }]);
    for (const [deskripsi, nominal] of g.items) {
      expenseBody.push(['   - ' + deskripsi, formatRupiah(nominal)]);
    }
    expenseBody.push([{
      content: '   Subtotal ' + g.label,
      styles: { fontStyle: 'italic', fontSize: 8, textColor: [120, 120, 120] },
    }, {
      content: formatRupiah(g.total),
      styles: { fontStyle: 'italic', fontSize: 8, textColor: [120, 120, 120], halign: 'right' },
    }]);
  }
  expenseBody.push([
    { content: 'Total Pengeluaran', styles: { fontStyle: 'bold', fillColor: [198, 40, 40], textColor: [255, 255, 255] } },
    { content: formatRupiah(data.totalExpense), styles: { fontStyle: 'bold', fillColor: [198, 40, 40], textColor: [255, 255, 255], halign: 'right' } },
  ]);

  autoTable(doc, {
    startY: y + 3,
    head: [['Uraian', 'Jumlah (Rp)']],
    body: expenseBody as unknown[][],
    theme: 'plain',
    headStyles: { fillColor: [26, 60, 94], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', cellPadding: 4 },
    bodyStyles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 110 }, 1: { cellWidth: 65, halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  // ─── 3. Neraca Saldo ────────────────────────────────────
  y = ensureSpace(40) + 10;
  if (y > 250) { doc.addPage(); y = 20; }

  doc.setTextColor(26, 60, 94);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('NERACA SALDO', 14, y);

  autoTable(doc, {
    startY: y + 3,
    head: [['Uraian', 'Jumlah (Rp)']],
    body: [
      [data.saldoAwalLabel, formatRupiah(data.saldoAwal)],
      ['(+) Pendapatan', formatRupiah(data.totalIncome)],
      ['(-) Pengeluaran', formatRupiah(data.totalExpense)],
      [{ content: 'SALDO AKHIR', styles: { fontStyle: 'bold', fillColor: [26, 60, 94], textColor: [255, 255, 255] } }, { content: formatRupiah(data.saldoAkhir), styles: { fontStyle: 'bold', fillColor: [26, 60, 94], textColor: [255, 255, 255], halign: 'right' } }],
    ],
    theme: 'striped',
    headStyles: { fillColor: [26, 60, 94], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', cellPadding: 4 },
    bodyStyles: { fontSize: 9, cellPadding: 4 },
    columnStyles: { 0: { cellWidth: 110, fontStyle: 'bold' }, 1: { cellWidth: 65, halign: 'right', fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  });

  // ─── 4. Arus Kas Bulanan ────────────────────────────────
  if (data.cashFlowMonthly.length > 0) {
    y = ensureSpace(40) + 10;
    if (y > 240) { doc.addPage(); y = 20; }

    doc.setTextColor(26, 60, 94);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('ARUS KAS BULANAN', 14, y);

    autoTable(doc, {
      startY: y + 3,
      head: [['Bulan', 'Saldo Awal', 'Pemasukan', 'Pengeluaran', 'Net', 'Saldo Akhir']],
      body: [
        ...data.cashFlowMonthly.map(r => [
          r.bulan, formatRupiah(r.saldoAwal), formatRupiah(r.pemasukan),
          formatRupiah(r.pengeluaran), formatRupiah(r.net), formatRupiah(r.saldoAkhir),
        ]),
        ['TOTAL', '-', formatRupiah(data.totalIncome), formatRupiah(data.totalExpense), formatRupiah(data.totalIncome - data.totalExpense), '-'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [26, 60, 94], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', cellPadding: 3 },
      bodyStyles: { fontSize: 7.5, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 25, fontStyle: 'bold' },
        1: { cellWidth: 30, halign: 'right' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
        5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: 14, right: 14 },
    });
  }

  return Buffer.from(doc.output('arraybuffer'));
}

/* ═══════════════════════════════════════════════════════════ */
/*  MAIN HANDLER                                               */
/* ═══════════════════════════════════════════════════════════ */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'pdf').toLowerCase();
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const startMonth = searchParams.get('startMonth') || '';
    const endMonth = searchParams.get('endMonth') || '';
    const printedBy = searchParams.get('printedBy') || '';

    const conditions: string[] = ["status = 'approved'"];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (startMonth) { conditions.push(`tanggal >= $${paramIndex++}`); params.push(startMonth + '-01'); }
    else if (startDate) { conditions.push(`tanggal >= $${paramIndex++}`); params.push(startDate); }

    if (endMonth) {
      const [ey, em] = endMonth.split('-').map(Number);
      const lastDay = new Date(ey, em, 0).getDate();
      conditions.push(`tanggal <= $${paramIndex++}`);
      params.push(endMonth + '-' + String(lastDay).padStart(2, '0'));
    } else if (endDate) {
      conditions.push(`tanggal <= $${paramIndex++}`); params.push(endDate);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');
    const transactions = await db.$queryRawUnsafe(
      'SELECT * FROM "Transaction" ' + whereClause + ' ORDER BY "tanggal" ASC',
      ...params
    ) as TxRow[];

    // Saldo awal pertama kali dari settings (hanya seed value)
    let initialSaldoAwal = 0;
    try {
      const saldoRow = await db.$queryRawUnsafe(
        'SELECT value FROM "Setting" WHERE key = \'saldo_awal\''
      ) as { value: string }[];
      if (saldoRow.length > 0) {
        initialSaldoAwal = parseInt(saldoRow[0].value) || 0;
      }
    } catch {
      // ignore
    }

    // Hitung saldo awal = saldo akhir bulan sebelumnya
    const { saldoAwal, label: saldoAwalLabel } = await hitungSaldoAwalPeriode(startMonth || '', initialSaldoAwal);

    const effectiveStartDate = startMonth ? startMonth + '-01' : startDate;
    const effectiveEndDate = endMonth
      ? endMonth + '-' + String(new Date(parseInt(endMonth.split('-')[0]), parseInt(endMonth.split('-')[1]), 0).getDate()).padStart(2, '0')
      : endDate;

    const data = buildReportData(transactions, effectiveStartDate, effectiveEndDate, saldoAwal, printedBy, startMonth || undefined, endMonth || undefined);
    // Override saldo awal label dengan label dari perhitungan saldo bulan sebelumnya
    data.saldoAwalLabel = saldoAwalLabel;

    const baseName = 'Laporan_Keuangan_RT11_' + (startMonth || startDate || 'all') + '_' + (endMonth || endDate || 'all');

    if (format === 'csv') {
      const csv = generateCSV(data);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv;charset=utf-8',
          'Content-Disposition': 'attachment; filename="' + baseName + '.csv"',
        },
      });
    }

    if (format === 'xlsx' || format === 'excel') {
      const buffer = await generateExcelBuffer(data);
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="' + baseName + '.xlsx"',
        },
      });
    }

    const buffer = await generatePDFBuffer(data);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="' + baseName + '.pdf"',
      },
    });
  } catch (error) {
    console.error('Report export error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
