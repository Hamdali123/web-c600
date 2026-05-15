# SmartOLT Clone - Sistem Manajemen Jaringan FTTH

SmartOLT Clone adalah sebuah aplikasi web (Web App) manajemen jaringan Fiber to the Home (FTTH) yang dirancang untuk memberikan kemudahan dalam mengelola dan memonitor perangkat **Optical Line Terminal (OLT)** dan **Optical Network Unit (ONU)**. 

Aplikasi ini dibuat sebagai replika/alternatif lokal berkinerja tinggi dari sistem SmartOLT original, dengan membawa fitur-fitur penting seperti provisioning ONU otomatis, pemantauan sinyal (redaman) secara *real-time*, manajemen VLAN, dan integrasi dengan Router Mikrotik.

---

## 🌟 Fitur Utama

1. **Dashboard Monitoring Real-Time**
   - Menampilkan ringkasan status jaringan secara real-time (Waiting Authorization, Online, Offline, Low Signals).
   - Menampilkan metrik perangkat OLT secara live (CPU, Memori, Temperatur, Uptime).
   - Grafik status jaringan harian.

2. **Manajemen OLT (ZTE & Huawei)**
   - Mendukung perangkat OLT dari vendor ZTE dan Huawei.
   - Komunikasi langsung ke perangkat keras menggunakan protokol **Telnet**, **SSH**, dan **SNMP**.
   - Monitoring kapasitas *card* dan status *port* PON.

3. **Manajemen ONU / Modem (Auto-Discovery)**
   - **Unconfigured ONUs**: Sistem secara otomatis mendeteksi ONU baru yang terhubung ke OLT namun belum diotorisasi.
   - **Configured ONUs**: Manajemen ONU yang sudah berjalan, termasuk pengaturan mode (Bridge/Route), konfigurasi PPPoE, dan VLAN.
   - **Pemantauan Sinyal (Redaman)**: Membaca nilai Rx/Tx Power ONU secara langsung untuk diagnostik jarak jauh.
   - Kemampuan *reboot* dan konfigurasi ulang ONU dari jarak jauh.

4. **Konfigurasi Jaringan & Topologi**
   - **VLANs**: Manajemen VLAN untuk Residential, Management, VoIP, dsb.
   - **Speed Profiles**: Pengaturan limitasi bandwidth (Upload/Download).
   - **Zones & ODB (Optical Distribution Box)**: Pemetaan wilayah dan titik distribusi jaringan optik.
   - **Auth Presets**: Template otorisasi untuk mempercepat aktivasi pelanggan baru.

5. **Integrasi Eksternal**
   - **Mikrotik API**: Terintegrasi dengan router Mikrotik untuk sinkronisasi data PPPoE pelanggan.
   - **TR069 Auto-Configuration Server (ACS)**: Mendukung profil manajemen TR069 untuk kontrol *CPE/Router* lebih lanjut.

6. **Background Workers (Otomatisasi)**
   - Aplikasi ini dilengkapi dengan skrip latar belakang (*cron jobs*) yang berjalan secara otomatis untuk menyinkronkan data OLT, memonitor status/redaman, dan mencari ONU yang baru terpasang.

---

## 🛠️ Teknologi yang Digunakan (Tech Stack)

*   **Frontend & Backend:** [Next.js 16](https://nextjs.org/) (App Router)
*   **Bahasa:** [TypeScript](https://www.typescriptlang.org/)
*   **Database:** [Prisma ORM](https://www.prisma.io/) dengan SQLite (Local DB)
*   **Konektivitas Hardware:** `telnet-client` & `ssh2`
*   **Task Scheduler:** `node-cron`

---

## 🚀 Cara Instalasi (Setelah Cloning)

Ikuti langkah-langkah berikut untuk menjalankan project ini di komputer lokal Anda:

### 1. Persyaratan (Prerequisites)
Pastikan Anda sudah menginstall:
- [Node.js](https://nodejs.org/) (Versi 18 atau terbaru)
- NPM (Biasanya ikut terinstall bersama Node.js)

### 2. Clone Repository
Jika belum, clone repository ini:
```bash
git clone https://github.com/username/smartolt.git
cd smartolt
```

### 3. Install Dependensi
Jalankan perintah ini di dalam terminal:
```bash
npm install
```

### 4. Setup Database
Project ini menggunakan SQLite, jadi Anda tidak perlu install database server (MySQL/Postgres). Cukup jalankan:
```bash
# Membuat file database lokal (dev.db) berdasarkan skema
npx prisma db push

# (Opsional) Menambah user admin default
# Email: mohamadsanwani9@gmail.com | Pass: 72UubSHF4m2z
npx prisma db seed
```

### 5. Jalankan Aplikasi
Jalankan server development:
```bash
npm run dev
```
Buka browser dan akses: [http://localhost:3000](http://localhost:3000)

---

## 📌 Catatan Penting
- **Database:** File database tersimpan di `prisma/dev.db`. Jangan menghapus file ini jika ingin menyimpan data.
- **Prisma Studio:** Jika ingin melihat isi database lewat tampilan grafis, jalankan `npx prisma studio`.
- **Default Login:** Gunakan kredensial dari file `seed.ts` untuk login pertama kali.

---
*Dibuat untuk Manajemen Jaringan Fiber Optik Modern.*
