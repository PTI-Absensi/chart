# Procurement Charting System Documentation

> Dokumentasi teknis lengkap untuk aplikasi visualisasi data procurement PT SGN.

## 1. Deskripsi Project

Platform analisis dan visualisasi data procurement yang menampilkan metrik mingguan dari proses pengadaan. Sistem ini membaca data dari database PostgreSQL (`olahproc`) yang dihasilkan melalui proses ETL dari data mentah SAP/Procurement.

**Tujuan Utama:**
- Visualisasi performa proses pengadaan (Total Nilai, Dokumen, Durasi).
- Analisis tren mingguan/bulanan.
- Deteksi bottleneck proses (PR, PK, HPS, PP, SPPBJ).
- Komparasi data antar unit (PG, MKSO, HO).

---

## 2. Arsitektur & Teknologi

### High-Level Architecture (ASCII)
```
┌────────────────────────────────────────────────────────────────────────────┐
│                              WEB BROWSER                                   │
└────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ FRONTEND (Vue 3 + Vite)                                                    │
│ ├─ Router (frontend/src/router/index.ts)                                   │
│ │  ├─ /                -> ChartPage -> ChartApp                            │
│ │  │    ├─ ProcurementChart (ApexCharts)                                   │
│ │  │    ├─ DrawingLayer (canvas tools)                                     │
│ │  │    └─ Search/Filters/Summary/Legend                                   │
│ │  ├─ /dfg             -> DfgPage                                          │
│ │  ├─ /process-time    -> ProcessTimePage                                  │
│ │  ├─ /sources         -> DataSourcesPage                                  │
│ │  ├─ /builder         -> ChartBuilderPage                                 │
│ │  ├─ /dashboards      -> DashboardsPage                                   │
│ │  ├─ /templates       -> TemplatesPage                                    │
│ │  └─ /admin           -> AdminPage                                        │
│ ├─ Layout: AppShell + SideNav                                              │
│ ├─ Theme: CSS variables (frontend/src/styles/app.css)                       │
│ └─ API client: authFetch (Bearer token optional)                           │
└────────────────────────────────────────────────────────────────────────────┘
                                     │  /api (Vite proxy 5173 → 8000)
                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ BACKEND (Node.js + Express)                                                │
│ ├─ index.js (routes)                                                       │
│ ├─ auth.js (JWT auth middleware)                                           │
│ ├─ db.js (PostgreSQL pool)                                                 │
│ └─ services/                                                               │
│    ├─ procurementService.js  (/api/procurement/*)                          │
│    ├─ dataService.js         (/api/ohlc, /api/price)                       │
│    ├─ sourceService.js       (/api/sources*)                               │
│    ├─ chartService.js        (/api/charts, /api/dashboards)                │
│    └─ templateService.js     (/api/templates)                              │
└────────────────────────────────────────────────────────────────────────────┘
        │                                   │
        │ SQL                               │ File storage (JSON)
        ▼                                   ▼
┌──────────────────────────────────────┐    ┌───────────────────────────────┐
│ POSTGRESQL (schema olahproc)         │    │ backend-node/storage/          │
│ ├─ analitic                          │    │ ├─ charts.json                 │
│ ├─ fact_doc_weekly                   │    │ ├─ dashboards.json             │
│ ├─ fact_value_weekly                 │    │ ├─ templates.json              │
│ ├─ fact_tahap_weekly                 │    │ ├─ sources.json                │
│ ├─ dim_plant                         │    │ └─ uploads/*.csv|json          │
│ └─ views (v_*_cum, dfg, etc.)         │    └───────────────────────────────┘
└──────────────────────────────────────┘
        ▲
        │ ETL/ELT (offline batch)
        │  - raw SAP/procurement -> cleansing -> weekly facts
        └───────────────────────────────────────────────────────────────────
```

### Technology Stack
**Frontend (`chart/frontend`)**
*   **Core**: Vue 3 (Composition API), Vite, TypeScript
*   **Visualization**: ApexCharts (Time series), Lightweight Charts (Trading view style), Fabric.js (Drawing tools)
*   **State**: Vue Reactivity (ref, computed)
*   **Routing**: Vue Router
*   **CSS**: Vanilla CSS variables (theme selection)

**Backend (`chart/backend-node`)**
*   **Runtime**: Node.js
*   **Framework**: Express.js
*   **Database Driver**: `pg` (node-postgres)
*   **Authentication**: JWT (JSON Web Tokens)
*   **Storage**: JSON-based local storage for user configs (Chart layouts, templates)

**Database**
*   **Engine**: PostgreSQL
*   **Schema**: Star Schema (Fact & Dimension tables)

---

## 3. Daftar Modul (Dependencies)

### Frontend Modules (`package.json`)
| Package | Version | Fungsi |
|---------|---------|--------|
| `vue` | ^3.5.27 | Framework UI utama |
| `vite` | ^5.x/6.x | Build tool & Dev server |
| `apexcharts` | ^3.x | Library chart utama (Bar, Line, Area) |
| `vue3-apexcharts` | ^1.x | Wrapper Vue untuk ApexCharts |
| `lightweight-charts` | ^4.x | Library chart alternatif (Trading style) |
| `fabric` | ^5.x/6.x | Canvas manipulation untuk drawing tools |
| `vue-router` | ^4.x | Navigasi halaman SPA |
| `typescript` | ^5.x | Type checking & intelligence |

### Backend Modules (`package.json`)
| Package | Version | Fungsi |
|---------|---------|--------|
| `express` | ^4.21.2 | Web server & REST API handling |
| `pg` | ^8.13.1 | Koneksi ke PostgreSQL database |
| `pg-format` | ^1.0.4 | SQL query formatting aman |
| `cors` | ^2.8.5 | Cross-Origin Resource Sharing middleware |
| `multer` | ^1.4.5 | Handle file uploads (CSV/JSON source) |
| `jsonwebtoken` | ^9.0.2 | Token-based authentication |
| `bcryptjs` | ^2.4.3 | Hasing password user |
| `dotenv` | ^16.4.5 | Environment variable management |

---

## 4. Proses ETL & Alur Data

Data procurement diproses melalui beberapa tahapan sebelum siap divisualisasikan.

### Sumber Data (`t_raw_data`)
- **Origin**: Export JSON/CSV dari sistem SAP/Procurement.
- **Konten**: Purchase Request (PR), Pendaftaran Paket (PK), HPS, Paket Pengadaan (PP), Purchase Order/SPPBJ.

### Mapping Alur Dokumen
Urutan standar proses procurement:
1.  **PR** (Purchase Request) - Permintaan pembelian.
2.  **PK** (Paket Pekerjaan) - Pengelompokkan request.
3.  **HPS** (Harga Perkiraan Sendiri) - Estimasi harga.
4.  **PP** (Paket Pengadaan) - Proses tender/seleksi.
5.  **SPPBJ** (Surat Penunjukan) - Finalisasi vendor.

### Cleansing & Transformation
**View Utama**: `v_cleansing_pk_vendor`
- **Cleansing**: Membersihkan nilai NULL, memperbaiki format tanggal, standarisasi status.
- **Mapping Status**:
    - `finish` -> Selesai
    - `laksanakan/draft` -> Dalam Proses
    - `canceled/retender` -> Dikeluarkan dari analisis utama
- **Derived Metrics**: Menghitung durasi hari kerja antar tahap (exclude libur).

### Data Mart (Tabel Akhir)
Data hasil olahan disimpan dalam "Tabel Fakta" mingguan yang dibaca langsung oleh Backend:

1.  **`fact_doc_weekly`** (Dokumen)
    - **Grain**: Mingguan per Unit
    - **Kolom**: `week_start`, `doc_type` (PR/PK/PP/SPPBJ), `count_doc`, `kategori_plant`, `sumber_dana`.
    - **Kegunaan**: Menghitung volume dokumen mingguan.

2.  **`fact_value_weekly`** (Nilai Rupiah)
    - **Grain**: Mingguan per Unit
    - **Kolom**: `week_start`, `total_nilai`, `anggaran`, `hps`, `realisasi`, `saving_nilai`.
    - **Kegunaan**: Menampilkan trend nilai transaksi, saving, dan penyerapan anggaran.

### Script ETL
- **Python Scripts** (`dashboard/`):
    - `process_time_module/`: Menghitung durasi rata-rata proses.
    - `analyze_db.py`: Validasi konsistensi data.
- **SQL Scripts**: View dan Stored Procedures untuk agregasi mingguan.

---

## 5. Struktur Database (`olahproc`)

| Tabel | Tipe | Deskripsi |
|-------|------|-----------|
| `fact_doc_weekly` | Fact | Agregat jumlah dokumen per minggu |
| `fact_value_weekly` | Fact | Agregat nilai uang (Rp) per minggu |
| `dim_plant` | Dimension | Data master unit/pabrik (PG, MKSO, HO) |
| `t_raw_data` | Staging | Data mentah JSON import |
| `users` | System | Data user login web app |

---

## 6. Cara Menjalankan Project

### Backend
Service ini harus jalan untuk menyediakan API data.
```bash
cd chart/backend-node
npm install
npm run dev
# Running on http://localhost:8000
```

### Frontend
Interface web utama.
```bash
cd chart/frontend
npm install
npm run dev
# Running on http://localhost:5173
```

### Cek Kesehatan Sistem
Buka browser: `http://localhost:8000/health`
Response: `{"status":"healthy","app":"chart-backend-node"}`
