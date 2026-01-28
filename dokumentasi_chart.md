# Dokumentasi Sistem Chart (Procurement Charting Suite)

Dokumen ini adalah dokumentasi tunggal untuk folder `chart/`.  
Mencakup arsitektur, frontend (Vue + Vite), backend (Node.js), API, struktur folder, konfigurasi, dan legacy.

## 1. Ringkasan

Sistem saat ini terdiri dari:
- **Frontend Vue + Vite + Vue Router** (SPA) untuk charting tools + DFG + Process Time.
- **Backend Node.js (Express + PostgreSQL)** untuk REST API data chart.
- **Legacy** disimpan di folder `legacy/` (FastAPI dan HTML statis lama).

Fokus aplikasi: **charting tools fleksibel untuk data procurement**, bukan trading.

---

## 2. Arsitektur (ASCII)

```
┌──────────────────────────────┐       HTTP/JSON       ┌──────────────────────────────┐
│  FRONTEND (Vue + Vite SPA)    │ <-------------------> │  BACKEND (Node.js + Express) │
│  - /dashboard (SPA routes)    │                       │  - /api/*                   │
│  - /dfg, /process-time        │                       │  - /api/procurement/*       │
└───────────────┬───────────────┘                       └───────────────┬───────────────┘
                │                                                       │
                │ static assets (Vite dev/build)                        │ PostgreSQL
                v                                                       v
      Vite dev server / build output                          Schema: olahproc
                                                              Tables: fact_value_weekly,
                                                                      fact_doc_weekly,
                                                                      dim_plant, analitic
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
- PostgreSQL (`pg`)
- `pg-format` untuk safe identifier formatting
- `dotenv` untuk konfigurasi

---

## 4. Struktur Folder (Lengkap)

```
chart/
├── backend-node/                 # Backend Node.js (baru)
│   ├── src/
│   │   ├── index.js               # Express server + routes
│   │   ├── config.js              # env loader
│   │   ├── db.js                  # PG Pool
│   │   ├── mapping.js             # mapping loader
│   │   └── services/
│   │       ├── dataService.js     # /api (symbols, ohlc, price)
│   │       └── procurementService.js # /api/procurement
│   ├── config/
│   │   └── data_mapping.json
│   ├── package.json
│   └── .env.example
├── frontend/                     # Vue + Vite SPA
│   ├── src/
│   │   ├── App.vue
│   │   ├── main.ts
│   │   ├── router/index.ts
│   │   ├── layouts/AppShell.vue
│   │   ├── components/SideNav.vue
│   │   ├── pages/
│   │   │   ├── ChartPage.vue
│   │   │   ├── DfgPage.vue
│   │   │   └── ProcessTimePage.vue
│   │   ├── legacy/chart-app.ts    # port JS chart lama
│   │   └── styles/app.css
│   ├── index.html
│   └── vite.config.ts
├── legacy/
│   ├── backend-python/            # FastAPI lama
│   └── web-static/                # HTML/CSS/JS lama
└── dokumentasi_chart.md
```

---

## 5. Frontend (Vue + Vite)

### 5.1 Routing
SPA routes:
- `/dashboard/` -> Chart page
- `/dashboard/dfg` -> DFG page
- `/dashboard/process-time` -> Process Time page

### 5.2 Layout Global
Navbar global via:
```
frontend/src/layouts/AppShell.vue
frontend/src/components/SideNav.vue
```

### 5.3 Dark/Light Mode
Theme disimpan di `localStorage`:
- `light`
- `dark`

CSS theme memakai CSS variables di `frontend/src/styles/app.css`.

### 5.4 Animasi & Hover
Kelas `.animate-in` dipakai di seluruh page.  
Card di DFG/Process Time menggunakan hover `transform` + `shadow`.

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

### 6.3 Response Format
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

### 6.4 Mapping DB (Adapter)
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

- UI menggunakan **Lightweight Charts**, watermark sudah dimatikan.
- Multi-series diproses di frontend (Promise.all).
- DFG / Process Time tidak pakai API backend, hanya file preview lokal.
- Dark/Light mode sudah dipakai di semua page.

---

## 12. Perubahan Terbaru (Log)

- Migrasi backend ke Node.js.
- Port endpoint `/api/procurement/*`.
- Migrasi frontend ke Vue + Vite + Router.
- Navbar global (modular).
- Animasi + hover diterapkan ke semua halaman.

---

Last updated: **2026-01-28**
