# Backend Changes Documentation

## Ringkasan Perubahan Backend

### 1. Perubahan Query Symbol List (`getAllSymbols`)

**Before:**
```javascript
const sql = `
  SELECT 
    kode_data as symbol,
    nama_dokumen as name,
    COALESCE(status, 'metric') as category,
    COALESCE("desc", nama_dokumen) as description,
    COALESCE(sumber_dana, '') as sumber_dana,
    COALESCE(kategori_plant, '') as kategori_plant
  FROM analitic
  ORDER BY kode_data
`
```

**After:**
```javascript
const sql = `
  SELECT 
    kode_data as symbol,
    nama_dokumen as name,
    COALESCE(status, 'metric') as category,
    COALESCE("desc", nama_dokumen) as description,
    COALESCE(sumber_dana, '') as sumber_dana,
    COALESCE(kategori_plant, '') as kategori_plant,
    COALESCE(is_value_applicable, false) as is_value_applicable  // ← NEW
  FROM analitic
  ORDER BY kode_data
`
```

**Perubahan Output:**
- Sekarang return `is_value_applicable` field
- Untuk PR (A*): `is_value_applicable = false`
- Untuk PK/HPS/PP/SPPBJ (B*/C*/D*/E*): `is_value_applicable = true`

---

### 2. Perubahan Query Dokumen (`fetchByKodeData`)

**Before:**
```sql
-- Menggunakan fact_doc_weekly langsung
SELECT
  DATE_TRUNC('week', week_start) as period,
  SUM(count_doc) as total_value
FROM fact_doc_weekly
WHERE LOWER(kode_data) = LOWER($1)
GROUP BY DATE_TRUNC('week', week_start)
```

**After:**
```sql
-- Menggunakan v_fact_doc_weekly_dense (pre-dense view)
SELECT
  f.week_start as period,
  SUM(f.count_doc) as total_value
FROM v_fact_doc_weekly_dense f
WHERE LOWER(kode_data) = LOWER($1)
  AND period_year = $2
  AND period_type = $3
GROUP BY f.week_start
```

**Keuntungan:**
- Dense view: minggu kosong tetap tampil dengan count_doc = 0
- Tidak perlu DATE_TRUNC karena sudah per minggu
- Pre-filtered by period_year dan period_type

---

### 3. Perubahan Query Nilai per Analitic (`fetchByKodeDataNilai`)

**Before:**
```javascript
// 1. Lookup analitic dulu untuk get sumber_dana & kategori_plant
const lookupSql = `SELECT sumber_dana, kategori_plant FROM analitic WHERE kode_data = $1`

// 2. Query fact_value_weekly dengan filter dari lookup
const sql = `
  SELECT
    DATE_TRUNC('week', week_start) as period,
    SUM(total_nilai) as total_value
  FROM fact_value_weekly
  WHERE sumber_dana = $1 AND kategori_plant = $2
  GROUP BY DATE_TRUNC('week', week_start)
`
```

**After:**
```javascript
// Langsung query ke dense view dengan kode_data
const sql = `
  SELECT
    week_start as period,
    SUM(value_amount) as total_value
  FROM v_fact_value_weekly_by_analitic_dense
  WHERE LOWER(kode_data) = LOWER($1)
    AND period_year = $2
    AND period_type = $3
  GROUP BY week_start
`
```

**Keuntungan:**
- 1 query saja (tidak perlu lookup dulu)
- Dense view sudah berisi semua kombinasi
- Bisa filter langsung by kode_data

---

### 4. Perubahan Query KPI (`fetchMetricData`)

**Before:**
```javascript
// Query ke fact_value_weekly langsung
const sql = `
  SELECT
    DATE_TRUNC('${timeTrunc}', week_start) as period,
    SUM(${column}) as total_value
  FROM fact_value_weekly
  ${whereSql}
  GROUP BY DATE_TRUNC('${timeTrunc}', week_start)
`
```

**After:**
```javascript
// Mapping kolom ke kpi_code
const kpiCodeMap = {
  'total_nilai': 'V001',
  'anggaran': 'V002',
  'hps': 'V003',
  'realisasi': 'V004',
  'saving_nilai': 'V005'
}

// Query ke v_fact_value_weekly_dense_kpi
const sql = `
  SELECT
    DATE_TRUNC('${timeTrunc}', week_start) as period,
    SUM(kpi_value) as total_value
  FROM v_fact_value_weekly_dense_kpi
  WHERE kpi_code = '${kpiCode}'  // ← Filter by KPI code
    AND period_year = $1
    AND period_type = $2
  GROUP BY DATE_TRUNC('${timeTrunc}', week_start)
`
```

**Perubahan Struktur:**

| Metric | Kolom Lama | KPI Code Baru | View Baru |
|--------|-----------|---------------|-----------|
| VAL_TOTAL | `total_nilai` | V001 | v_fact_value_weekly_dense_kpi |
| VAL_ANGGARAN | `anggaran` | V002 | v_fact_value_weekly_dense_kpi |
| VAL_HPS | `hps` | V003 | v_fact_value_weekly_dense_kpi |
| VAL_REALISASI | `realisasi` | V004 | v_fact_value_weekly_dense_kpi |
| VAL_SAVING | `saving_nilai` | V005 | v_fact_value_weekly_dense_kpi |

---

## Data Source Mapping

### Views yang Digunakan:

| View | Purpose | Data |
|------|---------|------|
| `v_fact_doc_weekly_dense` | Volume dokumen per analitic | count_doc per kode_data per minggu |
| `v_fact_doc_weekly_dense_cum` | Volume dokumen kumulatif | count_doc_cum per kode_data |
| `v_fact_value_weekly_by_analitic_dense` | Nilai per analitic | value_amount per kode_data per minggu |
| `v_fact_value_weekly_by_analitic_dense_cum` | Nilai per analitic kumulatif | value_amount_cum per kode_data |
| `v_fact_value_weekly_dense_kpi` | KPI global mingguan | kpi_value per kpi_code (V001-V007) |

---

## Perbandingan Before-After

### Contoh: Query B100 (PK Total)

**Before:**
```sql
-- 1. Query fact_doc_weekly untuk volume
SELECT week_start, count_doc 
FROM fact_doc_weekly 
WHERE kode_data = 'B100'

-- 2. Query fact_value_weekly untuk nilai (tanpa kode_data!)
SELECT week_start, total_nilai 
FROM fact_value_weekly 
WHERE sumber_dana = 'eksploitasi' AND kategori_plant = 'PG'
-- ↑ Tidak bisa filter by B100!
```

**After:**
```sql
-- 1. Query v_fact_doc_weekly_dense untuk volume
SELECT week_start, count_doc 
FROM v_fact_doc_weekly_dense 
WHERE kode_data = 'B100' AND period_year = 2025

-- 2. Query v_fact_value_weekly_by_analitic_dense untuk nilai
SELECT week_start, value_amount 
FROM v_fact_value_weekly_by_analitic_dense 
WHERE kode_data = 'B100' AND period_year = 2025
-- ↑ Bisa filter langsung by B100!
```

---

## Perubahan di Frontend

### Search Results Filter:

**Before:**
- Semua kode_data punya varian `-N` (termasuk PR)
- User bisa pilih A1-N tapi data kosong

**After:**
- Return `is_value_applicable` dari backend
- PR (A*) tetap punya varian `-N` tapi dengan flag `is_value_applicable: false`
- Frontend bisa show warning atau tetap tampilkan sebagai 0

---

## Test Results

### API Test: `/api/procurement/data/VAL_TOTAL`
```json
{
  "status": "success",
  "data": [
    {"time": 1765126800, "close": 3718954008.5, "volume": 11156862025.5},
    {"time": 1765731600, "close": 14990381478.32, "volume": 44971144434.97}
  ]
}
```

### API Test: `/api/procurement/data/B100-N`
```json
{
  "status": "success",
  "data": [
    {"time": 1765126800, "close": 3718954008.5, "volume": 11156862025.5},
    {"time": 1765731600, "close": 14990381478.32, "volume": 44971144434.97}
  ]
}
```

### API Test: `/api/procurement/data/A1-N`
```json
{
  "status": "success",
  "data": []  // ← PR tidak punya nilai (benar)
}
```
