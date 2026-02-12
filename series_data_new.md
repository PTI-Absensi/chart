# Dokumentasi Series Data Analitik

Dokumen ini menjelaskan sumber tabel/view untuk series mingguan dan kumulatif mingguan, termasuk mapping `kode_data` dari tabel `analitic`.

## Tabel dan View Utama

- `fact_doc_weekly`
  Series jumlah dokumen per minggu per `kode_data`.
- `v_fact_doc_weekly_dense`
  Series dokumen dense (minggu kosong = 0).
- `v_fact_doc_weekly_dense_cum`
  Series dokumen dense kumulatif.

- `fact_value_weekly_analitic`
  Series nilai per minggu per `kode_data` (hanya analitic yang punya nilai).
- `v_fact_value_weekly_by_analitic`
  View read-friendly untuk nilai per analitic.
- `v_fact_value_weekly_by_analitic_dense`
  Series nilai per analitic dense (untuk kombinasi yang sudah ada di fact).
- `v_fact_value_weekly_by_analitic_dense_cum`
  Series nilai per analitic dense kumulatif.

- `fact_value_weekly`
  KPI nilai mingguan global (V001-V007), bukan per `kode_data` analitic.
- `v_fact_value_weekly_dense`
  KPI nilai mingguan dense.
- `v_fact_value_weekly_dense_cum`
  KPI nilai mingguan dense kumulatif.
- `v_fact_value_weekly_dense_kpi`
  KPI nilai dalam format unpivot (V001-V007).

## Filter Tahun

1. Fiscal (tahun anggaran): `period_type='fiscal'` dan `period_year=<tahun_anggaran>`.
2. Calendar (tahun kalender): `period_type='calendar'` dan `period_year=<tahun kalender>`.

Filter tambahan:
- `sumber_dana`
- `kategori_plant`
- `tahun_anggaran` (jika dibutuhkan sebagai dimensi tambahan)

Catatan:
- `analitic.sumber_dana IS NULL` artinya ALL sumber_dana.
- `analitic.kategori_plant IS NULL` artinya ALL kategori_plant.

## Penambahan ticker sumber dana (Plant ALL)

Sudah ditambahkan analitic level `sumber_dana` dengan `kategori_plant=NULL` (Plant ALL):

| Kode | Deskripsi | Sumber Dana | Kategori Plant | Nilai? |
|------|-----------|-------------|----------------|--------|
| `A101` | PR total eksploitasi (Plant ALL) | eksploitasi | ALL | ❌ |
| `A102` | PR total investasi (Plant ALL) | investasi | ALL | ❌ |
| `B101` | PK total eksploitasi (Plant ALL) | eksploitasi | ALL | ✅ |
| `B102` | PK total investasi (Plant ALL) | investasi | ALL | ✅ |
| `C101` | HPS selesai eksploitasi (Plant ALL) | eksploitasi | ALL | ✅ |
| `C102` | HPS selesai investasi (Plant ALL) | investasi | ALL | ✅ |
| `C103` | HPS proses eksploitasi (Plant ALL) | eksploitasi | ALL | ✅ |
| `C104` | HPS proses investasi (Plant ALL) | investasi | ALL | ✅ |
| `D101` | PP total eksploitasi (Plant ALL) | eksploitasi | ALL | ✅ |
| `D102` | PP total investasi (Plant ALL) | investasi | ALL | ✅ |
| `E101` | SPPBJ total eksploitasi (Plant ALL) | eksploitasi | ALL | ✅ |
| `E102` | SPPBJ total investasi (Plant ALL) | investasi | ALL | ✅ |

**Catatan:**
- `kategori_plant=NULL` artinya agregat semua plant (PG + MKSO + HO)
- PR (`A*`) tidak punya nilai rupiah (`is_value_applicable=false`)
- PK, HPS, PP, SPPBJ punya nilai rupiah (`is_value_applicable=true`)

Tujuannya untuk kebutuhan ticker/laporan yang memisahkan `investasi` vs `eksploitasi` dengan plant agregat.

## Rekomendasi Ticker/Series (3 varian saja)

Untuk tampilan dashboard agar tidak terlalu padat, rekomendasi varian dimensi yang ditampilkan hanya:
- `sumber_dana = ALL`, `kategori_plant = ALL`
- `sumber_dana = eksploitasi`, `kategori_plant = ALL`
- `sumber_dana = investasi`, `kategori_plant = ALL`

Implementasi filter:
- Untuk data KPI (`v_fact_value_weekly_dense_kpi`): ambil hanya 3 kombinasi di atas.
- Untuk data analitic dokumen (`v_fact_doc_weekly_dense`) dan nilai per analitic (`v_fact_value_weekly_by_analitic_dense`): gunakan kombinasi yang sama.

Dampak jumlah series:
- KPI: `7 KPI x 3 varian = 21 series` per `(period_type, period_year)`.
- Analitic dokumen/nilai: jumlah series = jumlah `kode_data` aktif x `3 varian` (jika semua kode dipakai).

## Series Kategori Tahap

Untuk series berbasis `kategori_tahap`, gunakan view:
- `v_fact_tahap_weekly_3var` (dokumen non-kumulatif, 3 varian)
- `v_fact_tahap_weekly_3var_cum` (dokumen kumulatif)
- `v_fact_tahap_weekly_3var_doc_value` (dokumen + nilai non-kumulatif)
- `v_fact_tahap_weekly_3var_doc_value_cum` (dokumen + nilai kumulatif)

Varian dimensi yang disediakan:
- `sumber_dana='ALL'`, `kategori_plant='ALL'`
- `sumber_dana='eksploitasi'`, `kategori_plant='ALL'`
- `sumber_dana='investasi'`, `kategori_plant='ALL'`

Kategori tahap:
- `Tahap pembuatan paket`
- `Tahap penyusunan hps`
- `Dalam proses (pemilihan penyedia)`
- `Selesai (pemilihan penyedia)`

Contoh query non-kumulatif (dokumen saja):
```sql
SELECT week_start, label, kategori_tahap, sumber_dana, count_pk
FROM public.v_fact_tahap_weekly_3var
WHERE period_type = 'fiscal'
  AND period_year = 2025
  AND tahun_anggaran = '2025'
ORDER BY sumber_dana, kategori_tahap, week_start;
```

Contoh query non-kumulatif (dokumen + nilai):
```sql
SELECT week_start, label, kategori_tahap, sumber_dana, count_pk, value_amount
FROM public.v_fact_tahap_weekly_3var_doc_value
WHERE period_type = 'fiscal'
  AND period_year = 2025
  AND tahun_anggaran = '2025'
ORDER BY sumber_dana, kategori_tahap, week_start;
```

Contoh query kumulatif (dokumen + nilai):
```sql
SELECT week_start, label, kategori_tahap, sumber_dana, count_pk, value_amount, count_pk_cum, value_amount_cum
FROM public.v_fact_tahap_weekly_3var_doc_value_cum
WHERE period_type = 'fiscal'
  AND period_year = 2025
  AND tahun_anggaran = '2025'
ORDER BY sumber_dana, kategori_tahap, week_start;
```

Catatan mapping nilai tahap:
- `Tahap pembuatan paket` -> nilai PK (`total_nilai_hasil`) dengan tanggal `tgl_create_pk`
- `Tahap penyusunan hps` -> nilai HPS (`hps_hasil`) dengan tanggal `tgl_submit_pk_ke_hps`
- `Dalam proses (pemilihan penyedia)` -> nilai PP (`anggaran_hasil`) dengan tanggal `tgl_create_pp`
- `Selesai (pemilihan penyedia)` -> nilai akhir (`nilai_akhir_hasil`) dengan tanggal `tgl_approval_sppbj`

## Mapping Kolom Sumber pada Tabel `analitic`

Kolom metadata yang dipakai:
- `source_doc_no_col`
- `source_doc_date_col`
- `source_value_col`
- `source_value_date_col`
- `is_value_applicable`

Mapping nilai dokumen dari `v_cleansing_pk_vendor`:
- PK (`B*`) -> `total_nilai_hasil`
- HPS (`C*`) -> `hps_hasil`
- PP (`D*`) -> `anggaran_hasil`
- SPPBJ (`E*`) -> `nilai_akhir_hasil`
- PR (`A*`) -> tidak ada kolom nilai (`is_value_applicable=false`)

Mapping tanggal acuan sesuai status:
- PK (`B*`):
  - draft -> `tgl_create_pk`
  - assign -> `tgl_assign` (wajib terisi, tanpa fallback)
  - submit -> `tgl_submit_pk_ke_hps`
  - pengadaan -> `tgl_submit_ke_pengadaan`
- HPS (`C*`):
  - proses HPS -> `tgl_submit_pk_ke_hps`
  - HPS selesai -> `tgl_penetapan`
- PP (`D*`):
  - draft -> `tgl_create_pp`
  - laksanakan -> `tgl_pelaksanaan_pp`
  - finish -> `tgl_pengumuman_pemenang`
- SPPBJ (`E*`):
  - approved/total -> `tgl_approval_sppbj`

## Cara Ambil Series

### 1) Volume dokumen per analitic
Gunakan `fact_doc_weekly` atau `v_fact_doc_weekly_dense`.

Contoh:
```sql
SELECT week_start, label, count_doc
FROM public.v_fact_doc_weekly_dense
WHERE period_type = 'fiscal'
  AND period_year = 2025
  AND kode_data = 'B100'
ORDER BY week_seq;
```

### 2) Nilai per analitic
Gunakan `fact_value_weekly_analitic` atau `v_fact_value_weekly_by_analitic_dense`.

Contoh:
```sql
SELECT week_start, label, value_amount
FROM public.v_fact_value_weekly_by_analitic_dense
WHERE period_type = 'fiscal'
  AND period_year = 2025
  AND kode_data = 'D100'
ORDER BY week_seq;
```

### 3) Kumulatif
Gunakan view kumulatif:
- `v_fact_doc_weekly_dense_cum`
- `v_fact_value_weekly_by_analitic_dense_cum`
- `v_fact_value_weekly_dense_cum`

## Catatan Implementasi Saat Ini

- `fact_doc_weekly` sudah tergenerate ulang berdasarkan mapping kolom di `analitic`.
- `fact_value_weekly_analitic` sudah tergenerate ulang berdasarkan mapping kolom di `analitic`.
- Untuk nilai, tidak semua `kode_data` wajib punya baris fakta (misalnya status tertentu memang tidak ada transaksi pada data sumber).
- Untuk kebutuhan chart, gunakan view dense agar minggu kosong tetap tampil.
