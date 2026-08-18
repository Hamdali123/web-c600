# 📡 SmartOLT Clone — ZTE C600 Management Dashboard

Dashboard manajemen OLT berbasis web yang dibangun dengan **Next.js 16**, terinspirasi dari produksi SmartOLT. Mendukung manajemen ONU secara *real-time* via **Telnet/SSH** ke perangkat OLT fisik ZTE C600.

---

## ✨ Fitur Utama

- 🔍 **Auto-Discovery ONU** — Scan ONU baru tiap 1 menit secara otomatis
- ✅ **Otorisasi ONU** — Authorize ONU langsung via CLI ke OLT fisik
- 📊 **Monitoring Signal** — Tracking Rx/Tx power secara *real-time*
- 🗑️ **Batch Action** — Reboot / Delete ONU secara massal
- 🌐 **VLAN Management** — Tambah & hapus VLAN di OLT
- 📋 **PON Port Monitor** — Status port GPON lengkap
- 🔌 **Uplink Monitor** — Status & optik uplink port
- 🖥️ **Web Terminal** — Akses CLI OLT via browser (WebSocket)
- 🔔 **Notifikasi** — Alert sinyal lemah & ONU offline
- 📈 **Grafik Signal History** — Histori sinyal tiap ONU

---

## 🛠️ Tech Stack

| Komponen | Teknologi |
|----------|-----------|
| Framework | Next.js 16 (App Router) |
| Database | SQLite via Prisma ORM |
| Koneksi OLT | Telnet (`telnet-client`) / SSH (`ssh2`) |
| Terminal Web | WebSocket + xterm.js |
| Background Job | `node-cron` |
| UI | Bootstrap 3 + Custom CSS |
| Runtime | Node.js 20+ |

---

## 📋 Prasyarat

Pastikan semua sudah terinstall di server/PC kamu:

- **Node.js** v20 atau lebih baru
- **npm** v10 atau lebih baru
- **Git**
- Akses jaringan ke OLT (via IP + port Telnet/SSH)

---

## 🚀 Cara Clone & Setup

### 1. Clone Repository

```bash
git clone https://github.com/username/smartolt_baru.git
cd smartolt_baru
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Database

Generate Prisma client dan buat database SQLite:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Seed Data Awal (ONU Types, Speed Profiles, dll)

```bash
npx ts-node seed.ts
npx ts-node seed_settings.ts
```

### 5. Buat User Admin

```bash
npx ts-node seed_user.ts
```

### 6. Tambah OLT Device

Edit file `add_olt.ts` sesuaikan dengan data OLT kamu, lalu jalankan:

```bash
npx ts-node add_olt.ts
```

Atau bisa langsung lewat web di menu **Settings → OLT**.

### 7. Jalankan Server Development

```bash
# Jalankan Next.js + Terminal WebSocket server sekaligus
npm run dev:all
```

Web akan berjalan di: **http://localhost:3009**

---

## ⚙️ Konfigurasi OLT (ZTE C600)

Masuk ke **Settings → OLT → Edit** dan isi:

| Field | Contoh | Keterangan |
|-------|--------|------------|
| IP Address | `103.68.214.225` | IP OLT |
| Telnet Port | `2334` | Default Telnet: 23 |
| Username | `admin` | Login CLI OLT |
| Password | `yourpassword` | Password CLI OLT |
| Protocol | `telnet` | `telnet` atau `ssh` |
| Vendor | `zte` | `zte` atau `huawei` |
| SNMP RO | `public` | Community string read-only |

---

## 🖥️ Deploy ke Production (Ubuntu Server 22.04)

### 1. Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

### 3. Build Aplikasi

```bash
npm run build
```

### 4. Jalankan dengan PM2

```bash
# Start Next.js
pm2 start npm --name "smartolt" -- run start

# Start Terminal WebSocket Server
pm2 start npx --name "smartolt-ws" -- ts-node terminal-server.ts

# Simpan config PM2 agar auto-start saat reboot
pm2 save
pm2 startup
```

### 5. Setup Nginx sebagai Reverse Proxy

Install Nginx:

```bash
sudo apt install nginx
```

Buat config Nginx di `/etc/nginx/sites-available/smartolt`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3009;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /ws {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
```

Aktifkan:

```bash
sudo ln -s /etc/nginx/sites-available/smartolt /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. SSL dengan Certbot (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 📁 Struktur Direktori Penting

```
smartolt_baru/
├── src/
│   ├── app/                    # Next.js App Router (pages + API routes)
│   │   ├── api/                # Backend API endpoints
│   │   │   ├── onus/           # ONU management APIs
│   │   │   ├── settings/       # OLT & system settings APIs
│   │   │   └── ...
│   │   ├── onu/                # Halaman ONU (unconfigured, configured, view)
│   │   └── olt/                # Halaman OLT details (vlan, pon, uplink, dll)
│   └── lib/
│       ├── oltConnection.ts    # ⚡ Wrapper utama Telnet/SSH ke OLT
│       ├── autoDiscoveryWorker.ts  # ⏰ Background cron jobs
│       ├── vendors/
│       │   └── zte-c600.ts    # 📟 Parser & command builder ZTE C600
│       └── prisma.ts           # Database client
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── dev.db                  # SQLite database file
├── terminal-server.ts          # WebSocket server untuk web terminal
└── package.json
```

---

## 🔧 Scripts Yang Tersedia

```bash
npm run dev          # Start Next.js dev server (port 3009)
npm run dev:all      # Start Next.js + WebSocket Terminal server
npm run build        # Build production
npm run start        # Start production server
```

---

## 📡 Background Workers (Auto-run saat server start)

| Worker | Interval | Fungsi |
|--------|----------|--------|
| **Radar** | Tiap 1 menit | Scan OLT untuk ONU baru |
| **Status Sync** | Tiap 2 menit | Update status Online/Offline + sinyal |
| **Metrics Sync** | Tiap 5 menit | Update CPU, Memori, Suhu OLT |

---

## 🐛 Troubleshooting

### ONU tidak muncul di Unconfigured
1. Pastikan OLT sudah terkonfigurasi di Settings
2. Cek koneksi Telnet ke OLT: `telnet <IP_OLT> <PORT>`
3. Tunggu maksimal 1 menit untuk scan otomatis
4. Klik tombol **Refresh** di halaman Unconfigured

### VLAN tidak muncul
1. Tambahkan VLAN lewat tombol **Add VLAN**
2. VLAN disimpan ke database lokal, muncul setelah Refresh
3. Perintah CLI juga dikirim ke OLT secara bersamaan

### Web Terminal tidak konek
1. Pastikan `terminal-server.ts` sedang berjalan (port 3010)
2. Gunakan `npm run dev:all` bukan hanya `npm run dev`

### Error Telnet timeout
1. Cek IP & port OLT sudah benar
2. Pastikan tidak ada firewall yang memblokir koneksi
3. Periksa kredensial login OLT

---

## 📄 Lisensi

MIT License — Bebas digunakan dan dimodifikasi.

---

*Dibuat dengan ❤️ untuk manajemen jaringan FTTH yang lebih mudah.*
