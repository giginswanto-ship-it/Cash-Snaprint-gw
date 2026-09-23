# REKAPITULASI KAS & KEUANGAN HARIAN DINAMIS - SNAPRINT GWISATA 📸💸

Aplikasi Web Modern, Responsif, dan **100% Dinamis** untuk Pencatatan Transaksi, Rekapitulasi Keuangan, dan **Monitor Kas Tunai Fisik Berkelanjutan (Continuous Day-to-Day Cash Ledger)** pada **SNAPRINT GWISATA**.

---

## 🌟 Fitur Unggulan & Dinamis

### 1. ⚙️ Pengaturan & Master Data 100% Dinamis
- **Metode Pembayaran Pemasukan Dinamis**: Bebas menambah, mengedit, dan menghapus metode pembayaran (contoh: Tunai/Cash, Transfer BCA, QRIS, EDC, GoPay, ShopeePay, Mandiri, dll.) lengkap dengan opsi penentu apakah masuk kas tunai laci (`isCash`).
- **Kategori Pengeluaran Dinamis**: Bebas menambah/mengedit/menghapus kategori biaya operasional (Transport, Bahan Cetak & Tinta, Konsumsi, Listrik, Sampah, Donasi, Gaji, dll.).
- **Akun Sumber Dana Dinamis**: Bebas mengatur sumber pembayaran biaya (Kas Tunai Laci, Rekening BCA, Mandiri, dll.).
- **Profil Toko Dinamis**: Nama usaha, alamat, nomor telepon/WhatsApp, dan catatan kaki struk kasir dapat diubah langsung dari aplikasi.

### 2. 💰 Monitor Kas Tunai Fisik Laci (Day-to-Day Cash Ledger)
- **Sistem Buku Kas Berkelanjutan**:
  - Saldo akhir uang tunai hari kemarin otomatis menjadi saldo awal hari ini:
    $$\text{Saldo Akhir Hari Ini} = \text{Saldo Awal} + \text{Kas Masuk Tunai} - \text{Biaya Kas Tunai} - \text{Penarikan Owner}$$
- **Tab Khusus Monitor Kas Harian**:
  - Tabel rincian mutasi kas harian: Saldo Awal, Kas Masuk (+), Biaya Tunai (-), Tarik Owner (-), dan **SALDO AKHIR FISIK**.
  - Grafik tren pergerakan saldo kas fisik di laci dari hari ke hari.
  - Grafik arus kas masuk vs kas keluar harian.

### 3. 🧮 Kalkulator Rekonsiliasi Kas Fisik Laci
- Fitur hitung lembaran & koin fisik (Rp 100rb, 50rb, 20rb, 10rb, 5rb, 2rb, 1rb, koin).
- Otomatis membandingkan total fisik di laci dengan **Saldo Kas Sistem** secara real-time:
  - ✅ **Cocok / Pas** (Tidak ada selisih)
  - ⚠️ **Selisih Kurang** (Kas fisik kurang dari sistem)
  - ℹ️ **Selisih Lebih** (Kas fisik lebih banyak dari sistem)

### 4. 📅 Filter Periode Sangat Fleksibel
- **Mode Harian (Single Day)**: Dengan navigasi Cepat (Hari ini, Kemarin, Besok, Kalender).
- **Mode Rentang Tanggal (Date Range)**: Bebas memilih Tanggal Mulai s/d Tanggal Selesai.
- **Pencarian Real-time**: Filter instan berdasarkan keterangan, nomor nota, nominal, atau kategori.

### 5. ⚡ Tombol Nominal Cepat (Quick Amount Chips)
- Saat menginput nominal pemasukan, pengeluaran, atau tarik kas, tersedia tombol chip cepat (+5k, +10k, +20k, +50k, +100k, +500k, +1jt) untuk mempermudah kasir.

### 6. 🖨️ Cetak Ganda (Dual Print Layout)
- **Berita Acara Rekapitulasi Format A4**: Laporan lengkap formal dengan ringkasan mutasi, tabel transaksi, dan kolom tanda tangan Kasir & Owner.
- **Struk Kasir Thermal (58mm / 80mm POS)**: Format ringkas untuk printer thermal kasir bluetooth/USB.

### 7. 📊 Ekspor & Cadangan Data
- **Ekspor Excel (.xlsx)**: Buku Kas Tunai, Semua Transaksi, Sheet Pemasukan, Sheet Pengeluaran, dan Sheet Penarikan Owner.
- **Backup & Restore JSON**: Simpan seluruh database & kustomisasi pengaturan ke komputer secara aman.

---

## 🚀 Cara Menggunakan

1. Buka folder `CASH SNAPRINT GWISATA`.
2. Klik ganda (**Double Click**) pada file **`index.html`** di Google Chrome, Microsoft Edge, atau browser lainnya.
3. Langsung gunakan untuk mencatat transaksi dan memantau saldo kas fisik secara akurat!
