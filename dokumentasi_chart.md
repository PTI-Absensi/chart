# Dokumentasi Sistem Chart (Procurement Charting Suite)

Dokumen ini adalah dokumentasi tunggal untuk folder `chart/`.
Mencakup arsitektur, frontend (Vue + Vite), backend (Node.js), API, struktur folder, konfigurasi, dan legacy.

## 1. Ringkasan

Sistem saat ini terdiri dari:
- Frontend Vue + Vite + Vue Router (SPA) untuk charting tools + DFG + Process Time.
- Backend Node.js (Express + PostgreSQL) untuk REST API data chart.
- Legacy disimpan di folder `legacy/` (FastAPI dan HTML statis lama).

Fokus aplikasi: charting tools fleksibel untuk data procurement, bukan trading.

---

## 2. Arsitektur (ASCII)

```
+------------------------------------+       HTTP/JSON       +------------------------------------+
| FRONTEND (Vue + Vite SPA)          | <-------------------> | BACKEND (Node.js + Express)         |
| - /dashboard (SPA routes)          |                       | - /api/*                            |
| - /dfg, /process-time              |                       | - /api/procurement/*                |
+---------------------+--------------+                       +---------------------+--------------+
                      |                                        | PostgreSQL
                      | static assets (Vite dev/build)         | Schema: olahproc
                      v                                        | Tables: fact_value_weekly,
           Vite dev server / build output                      |         fact_doc_weekly,
                                                               |         dim_plant, analitic
```

---

## 3. Teknologi

### Frontend
- Vue 3 + Vite 7 + Vue Router
- TradingView Lightweight Charts
- CSS custom (theme + dark/light mode)
- Mermaid (DFG preview via CDN)

### Backend
- Node.js (Express)
- PostgreSQL (pg)
- pg-format untuk safe identifier formatting
- dotenv untuk konfigurasi

---

## 4. Struktur Folder (Lengkap)

```
chart/
|-- backend-node/                 # Backend Node.js (baru)
|   |-- src/
|   |   |-- index.js               # Express server + routes
|   |   |-- config.js              # env loader
|   |   |-- db.js                  # PG Pool
|   |   |-- mapping.js             # mapping loader
|   |   `-- services/
|   |       |-- dataService.js     # /api (symbols, ohlc, price)
|   |       `-- procurementService.js # /api/procurement
|   |-- config/
|   |   `-- data_mapping.json
|   |-- package.json
|   `-- .env.example
|-- frontend/                     # Vue + Vite SPA
|   |-- src/
|   |   |-- App.vue
|   |   |-- main.ts
|   |   |-- router/index.ts
|   |   |-- layouts/AppShell.vue
|   |   |-- components/SideNav.vue
|   |   |-- pages/
|   |   |   |-- ChartPage.vue
|   |   |   |-- DfgPage.vue
|   |   |   `-- ProcessTimePage.vue
|   |   |-- legacy/chart-app.ts    # port JS chart lama
|   |   `-- styles/app.css
|   |-- index.html
|   `-- vite.config.ts
|-- legacy/
|   |-- backend-python/            # FastAPI lama
|   `-- web-static/                # HTML/CSS/JS lama
`-- dokumentasi_chart.md
```

---

## 5. Frontend (Vue + Vite)

### 5.1 Routing
SPA routes:
- `/dashboard/` -> Chart page
- `/dashboard/dfg` -> DFG page
- `/dashboard/process-time` -> Process Time page
- `/dashboard/login` -> Login page (JWT)

### 5.2 Layout Global
Navbar global via:
- `frontend/src/layouts/AppShell.vue`
- `frontend/src/components/SideNav.vue`

### 5.3 Dark/Light Mode
Theme disimpan di localStorage:
- `light`
- `dark`

CSS theme memakai CSS variables di `frontend/src/styles/app.css`.

### 5.4 Animasi & Hover
Kelas `.animate-in` dipakai di semua page.
Card di DFG/Process Time menggunakan hover transform + shadow.

---

## 6. Backend Node (Express)

### 6.1 Endpoint Inti
```
GET  /api/symbols?with_data=true
GET  /api/timeframes
GET  /api/ohlc/:symbol?period_type=calendar&year=2025&limit=500&cumulative=false
GET  /api/price/:symbol?period_type=calendar&year=2025
```

### 6.2 Endpoint Procurement (port dari FastAPI)
```
GET  /api/procurement/symbols
GET  /api/procurement/search?q=...&limit=20
GET  /api/procurement/timeframes
GET  /api/procurement/data/:symbol?timeframe=1W&limit=200&plant=...&sumber_dana=...&year=...&period_type=...
GET  /api/procurement/latest/:symbol
GET  /api/procurement/metrics
GET  /api/procurement/plants
```

### 6.3 Endpoint Auth (JWT)
```
POST /api/auth/login
GET  /api/auth/me
```

Jika `AUTH_ENABLED=true` dan file user tersedia, semua endpoint `/api/*` dan
`/api/procurement/*` memerlukan header:
```
Authorization: Bearer <token>
```

Catatan host:
- Vite proxy mengarah ke `http://127.0.0.1:8000`.
- Backend wajib listen ke IPv4 (`0.0.0.0` atau `127.0.0.1`) agar proxy tidak gagal.

### 6.4 Endpoint Data Sources (Stage 1)
```
GET    /api/sources
POST   /api/sources              (multipart file: csv/json, optional name)
GET    /api/sources/:id/schema
GET    /api/sources/:id/preview?limit=50
POST   /api/sources/:id/mapping  (JSON: { dimension, metric, date })
DELETE /api/sources/:id
```

### 6.5 Endpoint DFG & Process Time
```
GET  /api/dfg/preview?table=...&mode=...&format=...&min_edge=...
GET  /api/dfg/file?name=...
POST /api/process-time/parse (multipart file)
```

### 6.6 Response Format
Umumnya:
```
{ "status": "success", "data": [...] }
```

OHLC-like:
```
{
  "time": <epoch seconds>,
  "open": <number>,
  "high": <number>,
  "low": <number>,
  "close": <number>,
  "volume": <number>
}
```

### 6.7 Mapping DB (Adapter)
Mapping file:
```
backend-node/config/data_mapping.json
```

Contoh:
```json
{
  "symbols": {
    "table": "public.analitic",
    "columns": {
      "symbol": "kode_data",
      "name": "nama_dokumen",
      "fallback_parts": ["status", "sumber_dana", "kategori_plant"]
    },
    "filters": {
      "with_data": {
        "table": "public.fact_value_weekly",
        "column": "kode_data"
      }
    }
  },
  "series": {
    "table": "public.fact_value_weekly",
    "time_column": "week_start",
    "value_column": "total_nilai",
    "symbol_column": "kode_data",
    "period_type_column": "period_type",
    "year_column": "period_year"
  }
}
```

---

## 7. Struktur Data (Olahproc)

### 7.1 Tabel Utama
- `analitic` (metadata series)
  - `kode_data`, `nama_dokumen`, `status`, `sumber_dana`, `kategori_plant`, `desc`
- `fact_doc_weekly`
  - `period_type`, `period_year`, `week_start`, `week_end`, `doc_type`, `count_doc`, `kode_data`, dll
- `fact_value_weekly`
  - `period_type`, `period_year`, `week_start`, `week_end`, `total_nilai`, `hps`, `anggaran`, dll
- `dim_plant`
  - `kode`, `nama`, `kategori`, `regional`

### 7.2 Taxonomy Symbol (Procurement)
- `DOC_*` -> metric dokumen (fact_doc_weekly)
- `VAL_*` -> metric nilai (fact_value_weekly)
- `PLANT_*` -> agregasi per plant
- `KAT_*` -> agregasi per kategori
- `DANA_*` -> agregasi per sumber dana
- Suffix `_EKS` / `_INV` -> filter sumber dana

---

## 8. Cara Menjalankan (Development)

### 8.1 Backend Node
```
cd chart/backend-node
npm install
copy .env.example .env
# isi DB_* sesuai database
npm run dev
```

Tambahan auth:
```
AUTH_ENABLED=true
JWT_SECRET=...
HOST=0.0.0.0
```

User default (config/users.json):
- username: `admin`
- password: `admin123`

### 8.2 Frontend Vue
```
cd chart/frontend
npm install
npm run dev
```

URL:
- `http://localhost:5173/dashboard/`
- `http://localhost:5173/dashboard/dfg`
- `http://localhost:5173/dashboard/process-time`

### 8.3 Penting: Jalankan 2 Terminal
Untuk development harus dua terminal:
1) Terminal A: `chart/backend-node` -> `npm run dev`
2) Terminal B: `chart/frontend` -> `npm run dev`

Jika salah satu mati, login/HTTP request akan gagal.

### 8.4 Troubleshooting Login (500 / gagal login)
Checklist cepat:
- Backend hidup di port 8000 (`http://127.0.0.1:8000/health` -> OK).
- Vite proxy menunjuk `127.0.0.1:8000` (cek `frontend/vite.config.ts`).
- User ada di `chart/backend-node/config/users.json`.
- Jika memakai ENV, set:
```
AUTH_ENABLED=true
JWT_SECRET=your-secret
HOST=0.0.0.0
```

---

## 9. Produksi (Opsional)

Build frontend:
```
cd chart/frontend
npm run build
```

Output akan di `frontend/dist`.
Gunakan server statis (Nginx) atau satu service Node/PM2 untuk serving + API.

---

## 10. Legacy

Disimpan di:
```
chart/legacy/backend-python
chart/legacy/web-static
```

Dipertahankan hanya untuk referensi/rollback.

---

## 11. Catatan Penting

- UI menggunakan Lightweight Charts, watermark sudah dimatikan.
- Multi-series diproses di frontend (Promise.all).
- DFG / Process Time sekarang memakai API backend untuk preview/parse file.
- Dark/Light mode sudah dipakai di semua page.
- Auth JWT tersedia dan dapat diaktifkan dari ENV.

---

## 12. Arah ETL / ELT (Untuk Client)

Jika client sudah punya database sendiri, aplikasi ini bisa diintegrasikan dengan dua pendekatan:

### 12.1 Direct Read (Tanpa DB Baru)
- App langsung query read-only ke DB client.
- Cocok untuk data kecil/sederhana.
- Risiko: performa dan query berat di DB produksi client.

### 12.2 ETL/ELT ke Analytics DB (Disarankan)
- Extract: ambil data dari DB client (read-only).
- Transform: mapping kolom, normalisasi tanggal, agregasi.
- Load: simpan ke DB analytics (schema charting).
- Hasil: query cepat, konsisten, aman dari beban DB produksi.

### 12.3 Hybrid
- Data utama disalin ke analytics DB, sisanya query langsung jika dibutuhkan.

Catatan: roadmap tahap 1 fokus ke “Data Source Manager” agar app bisa menerima
berbagai sumber data (DB/CSV/JSON), lalu mapping kolom ke standar charting.

---

## 13. Perubahan Terbaru (Log)

- Migrasi backend ke Node.js.
- Port endpoint `/api/procurement/*`.
- Migrasi frontend ke Vue + Vite + Router.
- Navbar global (modular).
- Animasi + hover diterapkan ke semua halaman.
- Auth JWT + login page.
- DFG & Process Time pakai API backend.

---

## 14. Roadmap (Menuju Charting Tools Fleksibel ala Looker Studio)

### 14.1 Tahap 1 - Data Source & Field Mapping (Fondasi)
Target: aplikasi bisa menerima banyak sumber data, bukan hanya DB olahproc.

Checklist:
- Data source manager (UI):
  - Tambah sumber: PostgreSQL, CSV upload, JSON upload.
  - Simpan koneksi (nama, host, db, user).
  - List & remove source.
- Data profiling:
  - Detect tipe data (string, number, date).
  - Preview sample rows.
- Field mapping:
  - Mapping kolom -> field standar (date, metric, dimension).
  - Rename field + format (currency, percent).
- API backend:
  - `/api/sources` CRUD
  - `/api/sources/:id/schema`
  - `/api/sources/:id/preview`

### 14.2 Tahap 2 - Chart Builder & Dashboard Layout
Target: user bisa bikin chart secara visual dan menyimpan dashboard.

Checklist:
- Chart builder UI:
  - Drag drop: Dimension, Metric, Filter.
  - Pilih tipe chart (line, area, bar).
  - Setting axis (format, label, scale).
- Multi-series:
  - Add series, color, label.
- Dashboard layout:
  - Grid layout (resize, drag).
  - Save layout + restore.
- API backend:
  - `/api/charts` CRUD (config chart)
  - `/api/dashboards` CRUD (layout)

### 14.3 Tahap 3 - Template, Export, Permission
Target: seperti analytics platform, siap multi-user.

Checklist:
- Template report:
  - Simpan, duplikasi, share.
- Export:
  - PNG, PDF, CSV.
- Permissions:
  - Role: admin/editor/viewer.
  - Dataset access control.
- Versioning:
  - Audit log perubahan.

---

## 15. Checklist Otak-Atik (Developer Quick Guide)

### 15.1 Area Frontend
- Layout global + sidebar: `frontend/src/layouts/AppShell.vue`, `frontend/src/components/SideNav.vue`
- Chart page: `frontend/src/pages/ChartPage.vue`
- Chart engine: `frontend/src/components/ChartApp.vue`
- Legacy chart JS: `frontend/src/legacy/chart-app.ts`
- Theme (dark/light + CSS vars): `frontend/src/styles/app.css`
- Router: `frontend/src/router/index.ts`

### 15.2 Area Backend
- Express entry: `backend-node/src/index.js`
- Config ENV: `backend-node/src/config.js`
- DB connection: `backend-node/src/db.js`
- Mapping field: `backend-node/config/data_mapping.json`
- Procurement series logic: `backend-node/src/services/procurementService.js`
- Auth JWT: `backend-node/src/auth.js`

### 15.3 Checklist Modifikasi Cepat
- Ubah tema warna: edit CSS variables di `frontend/src/styles/app.css`
- Ubah sidebar menu: `frontend/src/components/SideNav.vue`
- Ubah chart UI: `frontend/src/components/ChartApp.vue`
- Ubah API endpoint: `backend-node/src/index.js`
- Ubah query data procurement: `backend-node/src/services/procurementService.js`

---

Last updated: 2026-01-28
