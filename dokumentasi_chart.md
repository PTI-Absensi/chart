# Dokumentasi Sistem Chart (Procurement Charting Suite)

Dokumen ini adalah dokumentasi utama untuk folder `chart/`. Isinya sudah disesuaikan dengan versi terbaru UI/UX, backend, dan alur data procurement.

## 1) Ringkasan Sistem

Sistem terdiri dari:
- Frontend SPA (Vue 3 + Vite) untuk charting procurement, DFG, process time, dashboard, template.
- Backend Node.js (Express) sebagai REST API.
- Database PostgreSQL (schema `olahproc`) sebagai sumber data analytics procurement.
- Legacy disimpan di `chart/legacy/` sebagai referensi.

Fokus aplikasi: **charting procurement perusahaan**, bukan trading.

---

## 2) Arsitektur (Ringkas)

```
---------------------------+     HTTP/JSON     +---------------------------+
| Frontend (Vue + Vite)    | <---------------> | Backend (Express)          |
| - / (Charting)           |                   | - /api/procurement/*       |
| - /dfg                   |                   | - /api/sources, /charts... |
| - /process-time          |                   | - /api/dfg, /process-time  |
+---------------------------+                   +---------------------------+
                                       |
                                       v
                          PostgreSQL (schema olahproc)
                          fact_doc_weekly / fact_value_weekly / analitic / dim_plant
```

---

## 2.1) Teknologi Inti

Frontend:
- Vue 3 + Vite
- vue-router
- ApexCharts (via `vue3-apexcharts`) untuk chart utama
- Canvas overlay untuk drawing (custom component)

Backend:
- Node.js + Express
- PostgreSQL (pg)
- File storage JSON untuk charts/dashboards/templates/sources

Catatan:
- `lightweight-charts` masih ada di dependency untuk legacy/eksperimen, tetapi chart procurement utama memakai ApexCharts.

---

## 3) Frontend (Vue + Vite)

### 3.1 Routing (SPA)
Routes utama (lihat `frontend/src/router/index.ts`):
- `/` -> Chart Page (Procurement chart)
- `/sources` -> Data Sources
- `/builder` -> Chart Builder
- `/dashboards` -> Dashboard Manager
- `/templates` -> Templates
- `/admin` -> Admin (management)
- `/dfg` -> DFG viewer
- `/process-time` -> Process time viewer
- `/login` -> Auth login

### 3.2 Komponen inti Chart
Komponen utama:
- `frontend/src/components/ChartApp.vue`
  - Header dengan filter: period_type (calendar/fiscal), year, sumber_dana, kategori_plant.
  - Toggle: Raw, Kumulatif.
  - Chart type: Line, Area, Bar.
  - Summary bar di bawah chart.
  - Floating buttons: Log scale, Normalize, Object Tree, Layers.
  - Side toolbar: drawing tools + theme toggle.
- `frontend/src/components/ProcurementChart.vue`
  - Render chart via **ApexCharts** (vue3-apexcharts).
  - Memuat data dari endpoint `/api/procurement/data/:symbol`.
  - Chart type: line/area/bar (tanpa candlestick).
  - Export PNG / CSV.
- `frontend/src/components/DrawingLayer.vue`
  - Canvas overlay untuk drawing (hline/vline/trendline/freedraw).

### 3.3 Tema
Theme light/dark disimpan di `localStorage` dan diaktifkan via `document.body.dataset.theme`.
CSS variables ada di `frontend/src/styles/app.css`.

---

## 4) Backend (Node.js + Express)

Entry point: `backend-node/src/index.js`

### 4.1 Endpoint Procurement
```
GET /api/procurement/symbols
GET /api/procurement/search?q=...&limit=20
GET /api/procurement/timeframes
GET /api/procurement/data/:symbol
GET /api/procurement/latest/:symbol
GET /api/procurement/metrics
GET /api/procurement/plants
```

Parameter `GET /api/procurement/data/:symbol`:
- `timeframe` : 1D | 1W | 1M | 1Y (default 1W)
- `limit` : default 1000
- `period_type` : calendar | fiscal
- `year`
- `sumber_dana` : eksploitasi | investasi
- `kategori_plant` : PG | MKSO | HO
- `raw` : true|false (raw rows)
- `cumulative` : true|false (kumulatif mingguan)

Catatan penting:
- Jika `raw=true`, mode raw **lebih dulu** dan **mengabaikan** mode kumulatif.
- `cumulative=true` menghasilkan running total berbasis weekly aggregate.

Format data time series (OHLC-like):
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

### 4.2 Endpoint DFG & Process Time
```
GET  /api/dfg/preview?table=...&mode=...&format=...&min_edge=...
GET  /api/dfg/file?name=...
POST /api/process-time/parse (multipart file)
```

### 4.3 Data Sources / Chart / Dashboard / Template
```
GET    /api/sources
POST   /api/sources          (upload csv/json)
GET    /api/sources/:id/schema
GET    /api/sources/:id/preview
POST   /api/sources/:id/mapping
DELETE /api/sources/:id

GET    /api/charts
POST   /api/charts
GET    /api/charts/:id
PUT    /api/charts/:id
DELETE /api/charts/:id

GET    /api/dashboards
POST   /api/dashboards
GET    /api/dashboards/:id
PUT    /api/dashboards/:id
DELETE /api/dashboards/:id

GET    /api/templates
POST   /api/templates
GET    /api/templates/:id
DELETE /api/templates/:id
```

Storage saat ini berbasis file JSON:
- `backend-node/storage/charts.json`
- `backend-node/storage/dashboards.json`
- `backend-node/storage/templates.json`
- `backend-node/storage/sources.json`
- `backend-node/storage/uploads/*` (file CSV/JSON)

### 4.4 Auth
Jika auth aktif (`AUTH_ENABLED=true` dan `config/users.json` ada):
```
POST /api/auth/login
GET  /api/auth/me
```
Header:
```
Authorization: Bearer <token>
```

### 4.5 Endpoint Lain (Generic / Legacy Support)
```
GET /health
GET /api/symbols
GET /api/timeframes
GET /api/ohlc/:symbol
GET /api/price/:symbol
GET /api/exports/chart/:id
GET /api/exports/dashboard/:id
GET /api/exports/template/:id
GET /api/permissions/roles
GET /api/permissions/users
```
Endpoint ini dipakai untuk fungsi generik/non-procurement dan export.

---

## 5) Struktur Data & Mapping (Procurement)

### 5.1 Tabel Utama
Sumber utama (schema `olahproc`):
- `analitic`
  - `kode_data`, `nama_dokumen`, `status`, `sumber_dana`, `kategori_plant`, `desc`
- `fact_doc_weekly`
  - `period_type`, `period_year`, `period_cal_year`
  - `week_start`, `week_end`, `week_number`, `label`
  - `doc_type`, `status`, `sumber_dana`, `kategori_plant`, `tahun_anggaran`
  - `count_doc`, `kode_data`, `week_seq`
- `fact_value_weekly`
  - `period_type`, `period_year`, `period_cal_year`
  - `week_start`, `week_end`, `week_number`, `label`
  - `sumber_dana`, `kategori_plant`, `tahun_anggaran`
  - `total_nilai`, `anggaran`, `hps`, `realisasi`, `saving_nilai`, `saving_pct_anggaran`, `saving_pct_hps`
- `fact_tahap_weekly` (durasi tahap)
- `dim_plant`

### 5.2 Kode Data (A1/B001/...)
Mapping detail kode ke definisi analitik ada di:
`chart/analytic_column_mapping.md`

Contoh:
- A1 = PR approve eksploitasi PG
- A2 = PR approve eksploitasi MKSO
- B001 = PK pengadaan (all plant)

### 5.3 Taxonomy Symbol di Backend
Di `backend-node/src/services/procurementService.js`:
- `DOC_*` -> fact_doc_weekly (count_doc)
- `VAL_*` -> fact_value_weekly (nilai Rp)
- `PLANT_*` -> agregasi per plant (total_nilai)
- `KAT_*` -> agregasi per kategori plant
- `DANA_*` -> agregasi per sumber dana
- Kode A/B/C/D/E -> data dari `fact_doc_weekly` (filter `kode_data`)

---

## 6) Alur ETL / ELT (Masalah & Checklist)

Bagian ini menjelaskan **alur ETL** dan masalah umum yang sering muncul di data procurement.

### 6.1 Sumber Data
Mapping analitik berasal dari:
- `v_cleansing_pk_vendor` (raw cleansing)
- Tabel metadata `analitic` (kode_data, nama_dokumen, desc)

### 6.2 Output Wajib (Analytics Tables)
Minimal output ETL:
1) `analitic` (metadata kode_data)
2) `fact_doc_weekly` (count dokumen per minggu)
3) `fact_value_weekly` (nilai Rp per minggu)
4) `fact_tahap_weekly` (durasi tahap)
5) View kumulatif (opsional):
   - `v_fact_doc_weekly_cum`
   - `v_fact_value_weekly_cum`
   - `v_fact_tahap_weekly_cum`

### 6.3 Masalah ETL yang Sering Terjadi
1) **Data tidak dense**
   - Minggu tanpa transaksi tidak ada row.
   - Akibat: chart terlihat loncat.
   - Solusi: generate kalender minggu dan **zero-fill**.

2) **Period type vs period_year tidak konsisten**
   - `period_type = 'calendar'` seharusnya memakai `period_cal_year`.
   - Pastikan `period_year` sudah diisi sesuai mode calendar, atau mapping di API disesuaikan.

3) **Inkonistensi sumber_dana / kategori_plant**
   - Null/empty menyebabkan filter front-end tidak match.
   - Wajib normalisasi (eksploitasi/investasi, PG/MKSO/HO).

4) **Duplikasi kode_data**
   - Jika kode_data mapping di analitic tidak konsisten, hasil agregasi ganda.
   - Pastikan `kode_data` unik dan stabil.

5) **Status derivatif**
   - Beberapa status HPS/PP dihitung dari tanggal (lihat `analytic_column_mapping.md`).
   - Jika tanggal kosong -> status turunannya hilang.

6) **Timezone**
   - Semua agregasi mingguan menggunakan `week_start`.
   - Pastikan ETL menyimpan `week_start` konsisten (UTC vs lokal).

### 6.4 Checklist ETL
Gunakan checklist ini sebelum sistem dipakai:
- [ ] `analitic` terisi lengkap (`kode_data`, `nama_dokumen`, `desc`).
- [ ] `fact_doc_weekly` dan `fact_value_weekly` dense (atau dipastikan zero-fill di layer ETL).
- [ ] `period_type` dan `period_year` sesuai definisi.
- [ ] Normalisasi `sumber_dana` dan `kategori_plant`.
- [ ] Minimal range data 1 tahun untuk chart default.

---

## 7) Menjalankan (Development)

### 7.1 Backend
```
cd chart/backend-node
npm install
copy .env.example .env
npm run dev
```

### 7.2 Frontend
```
cd chart/frontend
npm install
npm run dev
```

Frontend akses:
- `http://localhost:5173/`

Proxy Vite:
- `/api` diarahkan ke `http://127.0.0.1:8000` (lihat `frontend/vite.config.ts`).

---

## 8) Troubleshooting Cepat

1) Chart kosong:
   - Cek response `/api/procurement/data/:symbol` (status 200).
   - Pastikan filter `period_type/year/sumber_dana/kategori_plant` match data.

2) Data raw + kumulatif:
   - Jika `raw=true`, mode kumulatif diabaikan.

3) Login gagal:
   - Auth hanya aktif jika `AUTH_ENABLED=true` dan `config/users.json` ada.

---

## 9) Legacy

Folder legacy:
```
chart/legacy/backend-python
chart/legacy/web-static
```
Digunakan hanya untuk referensi/rollback.

---

## 10) Catatan Perubahan Utama

- Chart utama kini menggunakan **ApexCharts**, bukan Lightweight Charts.
- Routing frontend sudah pindah ke `/`, `/sources`, `/builder`, `/dashboards`, `/templates`.
- UI/UX chart dibuat khusus procurement (bukan trading).
- Summary bar dan filter tambahan sudah disesuaikan kebutuhan procurement.
