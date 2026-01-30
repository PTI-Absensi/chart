# Dokumentasi Series Data Analitik

Dokumen ini menjelaskan cara menampilkan data series berdasarkan judul analitik (PR/PK/HPS/PP/SPPBJ, nilai, dan tahap), serta tabel/view yang dipakai untuk **mingguan** dan **kumulatif mingguan**.

## Tabel/View utama

- `fact_doc_weekly`  
  Series jumlah dokumen per minggu.  
  Kolom penting: `period_type`, `period_year`, `period_cal_year`, `period_month`, `week_in_month`, `week_start`, `week_end`, `label`, `doc_type`, `status`, `sumber_dana`, `kategori_plant`, `tahun_anggaran`, `count_doc`.

- `fact_value_weekly`  
  Series nilai (nominal) per minggu.  
  Kolom: `total_nilai`, `anggaran`, `hps`, `realisasi`, `saving_nilai`, `saving_pct_anggaran`, `saving_pct_hps`.

- `fact_tahap_weekly`  
  Series durasi rata‑rata (hari kerja) per minggu untuk kategori tahap.  
  View kumulatif: `v_fact_tahap_weekly_cum`.

- Event log / DFG (jika butuh alur event):  
  `fact_event_log_v2`, `v_dfg_edges_v2`, `v_dfg_edges_status_v2`.

## Filter tahun

1) **Fiscal (tahun anggaran)**  
   - `period_type = 'fiscal'`
   - `period_year = <tahun_anggaran>`

2) **Calendar (tahun kalender)**  
   - `period_type = 'calendar'`
   - `period_year = period_cal_year`

Filter tambahan:
- `sumber_dana` (eksploitasi/investasi)
- `kategori_plant` (PG/MKSO/HO)
- `tahun_anggaran` (opsional sebagai dimensi tambahan)

## Cara membentuk series

### A. Series jumlah dokumen
Gunakan `fact_doc_weekly` dengan filter:
- `doc_type` + `status` sesuai judul analitik.
- `period_type`, `period_year`, `sumber_dana`, `kategori_plant`.

### B. Series nilai (nominal)
Gunakan `fact_value_weekly` dan ambil kolom nilai yang relevan:
- `total_nilai`, `anggaran`, `hps`, `realisasi`, `saving_nilai`.

### C. Series durasi tahap
Gunakan `fact_tahap_weekly` untuk nilai per minggu.  
Jika butuh kumulatif, pakai view `v_fact_tahap_weekly_cum`.

## Kumulatif mingguan

Kumulatif mingguan dibuat dengan window function:

```sql
SELECT
  week_start,
  SUM(count_doc) OVER (ORDER BY week_start) AS cum_doc
FROM fact_doc_weekly
WHERE period_type = 'fiscal'
  AND period_year = '2025'
  AND doc_type = 'PK'
  AND status = 'pengadaan'
ORDER BY week_start;
```

Prinsip yang sama berlaku untuk `fact_value_weekly` (gunakan `SUM(total_nilai)`).

## Kondisi facts* saat ini (belum dense)

Saat ini `fact_doc_weekly` dan `fact_value_weekly` **belum dense**:
- Minggu yang **tidak ada transaksi** tidak memiliki row.
- Grafik time series akan **loncat** di minggu kosong jika langsung load dari facts*.

Rencana perbaikan ke depan:
- Rebuild `facts*` agar **dense** (menyertakan semua minggu dengan nilai 0),
  sehingga front‑end bisa **langsung load** tanpa zero‑fill.

## Contoh query mingguan

```sql
SELECT
  week_start,
  label,
  count_doc
FROM fact_doc_weekly
WHERE period_type = 'fiscal'
  AND period_year = '2025'
  AND sumber_dana = 'eksploitasi'
  AND kategori_plant = 'PG'
  AND doc_type = 'PK'
  AND status = 'pengadaan'
ORDER BY week_start;
```

## Menggabungkan series

Jika membutuhkan data jumlah + nilai:
1) Query `fact_doc_weekly` (jumlah dokumen).
2) Query `fact_value_weekly` (nilai).
3) Join di `period_type`, `period_year`, `week_start`, `sumber_dana`, `kategori_plant`.

Gunakan tabel `analitic` sebagai dimensi label judul analitik di layer aplikasi.
