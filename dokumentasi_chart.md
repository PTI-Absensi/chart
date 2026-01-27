# Dokumentasi Sistem Chart (Procurement Dashboard)

Dokumen ini adalah dokumentasi tunggal untuk folder `chart/`.
Mencakup arsitektur, fitur, sumber data, API, struktur folder, dan detail teknis.

## 1. Ringkasan

Sistem terdiri dari:
- Frontend dashboard statis (HTML/CSS/JS) dengan chart ala TradingView.
- Backend FastAPI untuk REST API dan WebSocket.
- Halaman tambahan: DFG dan Process Time (preview berbasis file lokal).

## 2. Arsitektur (ASCII)

```
+---------------------------+        HTTP / WebSocket       +---------------------------+
| BROWSER                   | <--------------------------> | FASTAPI BACKEND           |
| - /index.html             |                              | - /api/procurement        |
| - /dfg/index.html         |                              | - /api                    |
| - /process-time/index.html|                              | - /ws                     |
| - /css, /js (static)      |                              | - /dashboard (static)     |
+-------------+-------------+                              +-------------+-------------+
              |                                                        |
              | static assets                                          | data access
              v                                                        v
       /css, /js                                             +---------------------------+
                                                            | DATA SOURCES              |
                                                            | - PostgreSQL (olahproc)   |
                                                            | - Local files (CSV/JSON)  |
                                                            +---------------------------+
```

## 3. Komponen Utama

- Frontend utama: `chart/index.html`, `chart/js/app.js`, `chart/css/styles.css`.
- Backend: `chart/backend/app/main.py` (FastAPI), `api/*.py`, `services/*.py`.
- DFG: `chart/dfg/index.html` (preview image + mermaid CDN).
- Process Time: `chart/process-time/index.html` (preview CSV/JSON lokal).

## 4. Fitur yang Sudah Ada

### 4.1 Dashboard Chart (Charting Tools – Kode Data)
- Pemilihan kode data via popup search.
- Multi-series compare (tanpa batas keras; disarankan <= 5).
- Filter inti:
  - Kode data (multi-series)
  - Tipe periode (`calendar` / `fiscal`)
  - Tahun (`year`)
- Tipe chart: line, area, bar, candlestick (candle hanya series utama).
- Tools: fit, auto-scale, log-scale, normalize (index 100), zoom in/out,
  dock/undock toolbar, settings panel.
- Export: PNG dan CSV.
- Drawing tools (sidebar kiri): crosshair, trendline, hline, vline, rectangle, clear.
- Data window (hover crosshair) menampilkan nilai.

#### Sumber Series Dashboard
- Charting tools mengambil data dari:
  - `GET /api/symbols` (daftar kode data)
  - `GET /api/ohlc/{symbol}` (series OHLC-like)
- Sumber DB (default): `fact_doc_weekly` (schema `olahproc`).
- Format data: OHLC-like (open=high=low=close=value).

#### Bagaimana Series Dibentuk (Detail)
1) Frontend memanggil `GET /api/ohlc/{symbol}` untuk setiap kode data.
2) Backend membaca mapping (`data_mapping.json`) untuk menentukan:
   - Tabel series (`fact_doc_weekly` default)
   - Kolom waktu (`week_start`)
   - Kolom nilai (`count_doc`)
3) Backend agregasi per minggu (SUM) dan mengirim OHLC-like.
4) Multi-series digabung di frontend (bukan join DB).

### 4.2 DFG (Directly-Follows Graph)
- Form parameter DFG: table, mode, format output, min edge,
  tahun anggaran, sumber dana, kategori plant, start/end date.
- Load latest file (PNG/SVG/DOT/CSV output dari folder lokal).
- Tab preview: image dan mermaid (render via CDN).
- File picker untuk image lokal.

### 4.3 Process Time (Rekap Waktu Proses)
- Form parameter recap (tahun kalender/anggaran, sumber dana, kategori plant,
  format output).
- Load file CSV/JSON lokal dan render tabel.
- Summary chips (tahun, kategori, sumber dana) berdasarkan metadata file.

## 5. Spesifikasi API

### 5.1 Core Charting API (`/api`)
- `GET /api/symbols?with_data=true` -> daftar kode data.
- `GET /api/ohlc/{symbol}` -> time series OHLC-like.
  - Query: `period_type`, `year`, `limit`, `cumulative`.
- `GET /api/price/{symbol}` -> nilai terbaru + perubahan.

### 5.2 Procurement API (`/api/procurement`) – Legacy
Masih tersedia untuk dashboard lama (multi-metric) bila dibutuhkan.

## 6. Teknologi yang Dipakai

Frontend:
- HTML5, CSS3, JavaScript (Vanilla, ES6+)
- TradingView Lightweight Charts (CDN)
- Google Fonts (Space Grotesk, Source Sans 3)
- Mermaid JS (DFG preview via CDN)

Backend:
- FastAPI, Uvicorn
- Pydantic, pandas, numpy
- psycopg2 (PostgreSQL)

Database:
- PostgreSQL schema `olahproc`

## 7. Konfigurasi

`chart/backend/app/config.py`:
- `HOST` default: `0.0.0.0`
- `PORT` default: `8000`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `CORS_ORIGINS` default: `[*]`
- `DATA_ADAPTER` default: `postgres`
- `DATA_MAPPING_PATH` default: `app/data_mapping.json`

Frontend (`chart/js/app.js`) menggunakan:
- `API_BASE = "http://localhost:8000"`

## 7.1 Data Adapter (Fleksibel)
Charting tools sekarang **adapter-based**. Semua nama tabel/kolom dibaca dari
mapping JSON sehingga ganti database cukup ubah mapping.

- Mapping file: `chart/backend/app/data_mapping.json`
- Adapter aktif: `postgres`

Contoh format mapping:
```json
{
  "symbols": {
    "table": "public.analitic",
    "columns": {
      "symbol": "kode_data",
      "name": "desc",
      "fallback_parts": ["nama_dokumen", "status", "sumber_dana", "kategori_plant"]
    },
    "filters": {
      "with_data": {
        "table": "public.fact_doc_weekly",
        "column": "kode_data"
      }
    }
  },
  "series": {
    "table": "public.fact_doc_weekly",
    "time_column": "week_start",
    "value_column": "count_doc",
    "symbol_column": "kode_data",
    "period_type_column": "period_type",
    "year_column": "period_year"
  }
}
```

## 8. Struktur Folder (Lengkap)

```
chart/
+-- dokumentasi_chart.md
+-- index.html
+-- css/
|   +-- styles.css
+-- js/
|   +-- app.js
+-- dfg/
|   +-- index.html
+-- process-time/
|   +-- index.html
+-- backend/
    +-- requirements.txt
    +-- app/
        +-- data_mapping.json
        +-- __init__.py
        +-- config.py
        +-- main.py
        +-- api/
        |   +-- __init__.py
        |   +-- routes.py
        |   +-- procurement_routes.py
        |   +-- websocket.py
        +-- models/
        |   +-- __init__.py
        |   +-- chart.py
        +-- services/
            +-- __init__.py
            +-- data_service.py
            +-- procurement_service.py
```

## 9. Cara Menjalankan

1) Install dependencies:
```
cd chart/backend
pip install -r requirements.txt
```

2) Jalankan server:
```
cd chart/backend
python -m uvicorn app.main:app --reload --port 8000
```

3) Akses aplikasi:
- Dashboard: `http://localhost:8000/dashboard`
- DFG: `http://localhost:8000/dashboard/dfg`
- Process Time: `http://localhost:8000/dashboard/process-time`

## 10. Batasan dan Catatan

- Candlestick hanya untuk 1 series (symbol pertama).
- Normalize tidak aktif untuk candlestick dan bar chart.
- DFG dan Process Time tidak memakai API backend (file lokal).
- Template/indikator di UI masih placeholder (belum diaktifkan di JS).

## 11. Requirement Tambahan (Hasil Diskusi Client)

1) Series dimasukkan ke chart di atas (dibuat stack/stacked).
2) Fitur drawing dipindah ke toolbar yang bisa docking/undocking.
3) Template bisa diakses per user dan global (dengan batas max template).
4) Settings untuk menampilkan/menyembunyikan bagian-bagian charting.
5) Candlestick bisa di-hide dan tambah bar chart.
6) RSI dipisahkan dari fitur drawing (menu/section berbeda).
7) Gambar garis bebas (freehand drawing).
8) Data dibaca dan digabung sebelum plotting (merge series).
9) Nama data menjadi judul series.
10) Toggle kalender/fiscal tetap ada dan jelas.
11) Series di-load dulu, baru di-plot (preload data sebelum render).

## 12. Detail Teknis Tambahan (Lengkap)

### 12.1 Format Response API (Ringkas)
- Umum: `{ "status": "success", "data": [...] }`.
- OHLC-like procurement: `time` (epoch detik), `open`, `high`, `low`, `close`, `volume`.

### 12.2 Parameter dan Batasan API
- `/api/procurement/data/{symbol}`: `limit` 1..1000, `timeframe` salah satu `1D`, `1W`, `1M`, `1Y`.
- `period_type`: hanya `calendar` atau `fiscal`.
- Jika `year` diisi dan timeframe `1Y`, data di-breakdown per bulan.

### 12.3 Taxonomy Symbol Procurement
- `DOC_*`: metric jumlah dokumen (`fact_doc_weekly`).
- `VAL_*`: metric nilai (`fact_value_weekly`).
- `PLANT_*`: agregasi per plant (`fact_value_weekly`).
- `KAT_*`: agregasi per kategori plant (`fact_value_weekly`).
- `DANA_*`: agregasi per sumber dana (`fact_value_weekly`).
- Suffix `_EKS` / `_INV`: filter sumber dana eksploitasi / investasi.

### 12.4 Cache dan Fallback
- Procurement service cache: daftar plant dan kategori (10 menit).

### 12.6 Routing & Static Files
- Root: `/` -> `chart/index.html`.
- `/dashboard` -> `chart/index.html`.
- `/dashboard/dfg` -> `chart/dfg/index.html`.
- `/dashboard/process-time` -> `chart/process-time/index.html`.
- Static assets:
  - `/css` -> `chart/css`
  - `/js` -> `chart/js`
  - `/dashboard/static` -> `chart/`

### 12.7 Penyimpanan di Browser (Legacy)
- Bagian template sebelumnya menyimpan ke localStorage. Saat ini **nonaktif**.

### 12.8 Struktur Kolom Database (Aktual - `olahproc`)

Berikut kolom aktual yang digunakan pada dashboard:

- `dim_plant`:
  - `plant_id`, `kode`, `kategori`, `nama`, `regional`.
- `fact_doc_weekly`:
  - `period_type`, `period_year`, `week_number`, `week_start`, `week_end`,
    `label`, `doc_type`, `status`, `sumber_dana`, `kategori_plant`,
    `tahun_anggaran`, `count_doc`, `period_month`, `week_in_month`,
    `period_cal_year`, `kode_data`, `week_seq`.
- `fact_value_weekly`:
  - `period_type`, `period_year`, `week_number`, `week_start`, `week_end`,
    `label`, `sumber_dana`, `kategori_plant`, `tahun_anggaran`,
    `total_nilai`, `anggaran`, `hps`, `realisasi`, `saving_nilai`,
    `saving_pct_anggaran`, `saving_pct_hps`, `period_month`, `week_in_month`,
    `period_cal_year`, `week_seq`.

Catatan:
- `dim_plant` dipakai untuk daftar symbol/metadata (bukan join series).
- Series utama diambil dari `fact_doc_weekly` dan `fact_value_weekly`.

## 14. Catatan Fleksibilitas Database
- Core charting hanya bergantung pada kontrak API:
  - `/api/symbols` -> daftar kode data + nama.
  - `/api/ohlc/{symbol}` -> OHLC-like dengan `time` epoch (week_start).
- Mapping memungkinkan pindah schema/tabel tanpa ubah frontend.
- Untuk database non-Postgres, tambahkan adapter baru dengan interface yang sama
  pada `DataAdapter`.

### 12.9 Keamanan dan Observabilitas
- CORS saat ini `*` (tanpa pembatasan origin).
- Tidak ada autentikasi/otorisasi built-in.
- Logging dasar aktif di backend (INFO).

### 12.10 Kinerja dan Perilaku
- Multi-series: frontend melakukan request paralel per symbol (Promise.all).
- Time alignment dilakukan oleh chart library berdasarkan `time` (epoch detik).

## 13. Cara Membuat Series (Langkah Teknis)

Bagian ini menjelaskan proses teknis pembentukan series di dashboard.

### 13.1 Alur End-to-End
1) User memilih symbol di UI.
2) Frontend memanggil endpoint:
   - `GET /api/procurement/data/{symbol}?timeframe=...&limit=...&period_type=...&year=...&sumber_dana=...`
3) Backend `procurement_service.fetch_time_series()` menentukan tabel sumber.
4) Backend menjalankan query agregasi per periode (`DATE_TRUNC`).
5) Hasil query dikonversi ke format OHLC-like dan dikirim ke frontend.
6) Jika user memilih beberapa symbol, frontend menggabungkan series di UI.

### 13.2 Tabel Sumber Berdasarkan Symbol
- `DOC_*` -> `fact_doc_weekly`
- `VAL_*` -> `fact_value_weekly`
- `PLANT_*` -> `fact_value_weekly`
- `KAT_*` -> `fact_value_weekly`
- `DANA_*` -> `fact_value_weekly`

### 13.3 Bentuk Query Agregasi (Contoh)

Contoh untuk metric dokumen (`DOC_PR`) pada `fact_doc_weekly`:

```sql
SELECT
  DATE_TRUNC('week', week_start) AS period,
  SUM(count_doc) AS total_value,
  MIN(count_doc) AS min_value,
  MAX(count_doc) AS max_value,
  AVG(count_doc) AS avg_value
FROM fact_doc_weekly
WHERE doc_type = 'PR'
  AND period_type = 'calendar'
  AND period_year = 2025
GROUP BY DATE_TRUNC('week', week_start)
ORDER BY period DESC
LIMIT 200;
```

Contoh untuk metric nilai (`VAL_HPS`) pada `fact_value_weekly`:

```sql
SELECT
  DATE_TRUNC('week', week_start) AS period,
  SUM(hps) AS total_value,
  MIN(hps) AS min_value,
  MAX(hps) AS max_value,
  AVG(hps) AS avg_value
FROM fact_value_weekly
WHERE period_type = 'calendar'
  AND period_year = 2025
GROUP BY DATE_TRUNC('week', week_start)
ORDER BY period DESC
LIMIT 200;
```

### 13.4 Mapping ke Format OHLC-like
- `open`  = `min_value`
- `high`  = `max_value`
- `low`   = `min_value`
- `close` = `avg_value`
- `volume`= `total_value`

### 13.5 Catatan Penting
- Satu series = hasil agregasi dari **satu tabel** (tidak join antar tabel).
- `dim_plant` hanya dipakai untuk daftar symbol/metadata.
- Multi-series digabung di **frontend**, bukan di database.
Last updated: 2026-01-27

