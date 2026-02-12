# Analytic Column Mapping (per item)

Sumber data: `v_cleansing_pk_vendor`. Semua analitic diambil dari tabel `olahproc.analitic`.
Catatan: semua item analitic di tabel ini adalah volume dokumen (COUNT DISTINCT).

Tambahan terbaru untuk level `sumber_dana` dengan `plant = ALL`:
- `A101`,`A102` (PR total eksploitasi/investasi)
- `B101`,`B102` (PK total eksploitasi/investasi)
- `C101`,`C102`,`C103`,`C104` (HPS selesai/proses eksploitasi/investasi)
- `D101`,`D102` (PP total eksploitasi/investasi)
- `E101`,`E102` (SPPBJ total eksploitasi/investasi)

| kode_data | analitic | agg_type | agg_col | doc_no_col | status_col | status_rule | date_col | filter sumber_dana | filter kategori_plant | note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A001 | PR approve | COUNT DISTINCT | no_pr | no_pr | status_pr | status_pr = 'approve' | tgl_verifikasi_pr | sumber_dana IS NOT NULL AND sumber_dana <> '' | (all kategori_plant) |  |
| A002 | PR submit | COUNT DISTINCT | no_pr | no_pr | status_pr | status_pr = 'submit' | tgl_verifikasi_pr | sumber_dana IS NOT NULL AND sumber_dana <> '' | (all kategori_plant) |  |
| A100 | PR total | COUNT DISTINCT | no_pr | no_pr | status_pr | status_pr IN ('approve','submit') | tgl_verifikasi_pr | sumber_dana IS NOT NULL AND sumber_dana <> '' | (all kategori_plant) | agregat status |
| A1 | PR approve eksploitasi PG | COUNT DISTINCT | no_pr | no_pr | status_pr | status_pr = 'approve' | tgl_verifikasi_pr | sumber_dana = 'eksploitasi' | kategori_plant = 'PG' |  |
| A2 | PR approve eksploitasi MKSO | COUNT DISTINCT | no_pr | no_pr | status_pr | status_pr = 'approve' | tgl_verifikasi_pr | sumber_dana = 'eksploitasi' | kategori_plant = 'MKSO' |  |
| A3 | PR approve eksploitasi HO | COUNT DISTINCT | no_pr | no_pr | status_pr | status_pr = 'approve' | tgl_verifikasi_pr | sumber_dana = 'eksploitasi' | kategori_plant = 'HO' |  |
| A4 | PR approve investasi PG | COUNT DISTINCT | no_pr | no_pr | status_pr | status_pr = 'approve' | tgl_verifikasi_pr | sumber_dana = 'investasi' | kategori_plant = 'PG' |  |
| A5 | PR approve investasi MKSO | COUNT DISTINCT | no_pr | no_pr | status_pr | status_pr = 'approve' | tgl_verifikasi_pr | sumber_dana = 'investasi' | kategori_plant = 'MKSO' |  |
| A6 | PR approve investasi HO | COUNT DISTINCT | no_pr | no_pr | status_pr | status_pr = 'approve' | tgl_verifikasi_pr | sumber_dana = 'investasi' | kategori_plant = 'HO' |  |
| B001 | PK pengadaan | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'pengadaan' | tgl_submit_ke_pengadaan | sumber_dana IS NOT NULL AND sumber_dana <> '' | (all kategori_plant) |  |
| B002 | PK assign | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'assign' | tgl_assign | sumber_dana IS NOT NULL AND sumber_dana <> '' | (all kategori_plant) | wajib terisi, tanpa fallback |
| B003 | PK submit | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'submit' | tgl_submit_pk_ke_hps | sumber_dana IS NOT NULL AND sumber_dana <> '' | (all kategori_plant) |  |
| B004 | PK draft | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'draft' | tgl_create_pk | sumber_dana IS NOT NULL AND sumber_dana <> '' | (all kategori_plant) |  |
| B100 | PK total | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk IN ('draft','assign','pengadaan','submit') | CASE status_pk: draft=tgl_create_pk; assign=tgl_assign; submit=tgl_submit_pk_ke_hps; pengadaan=tgl_submit_ke_pengadaan | sumber_dana IS NOT NULL AND sumber_dana <> '' | (all kategori_plant) | agregat status |
| B1 | PK pengadaan eksploitasi PG | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'pengadaan' | tgl_submit_ke_pengadaan | sumber_dana = 'eksploitasi' | kategori_plant = 'PG' |  |
| B10 | PK assign investasi PG | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'assign' | tgl_assign | sumber_dana = 'investasi' | kategori_plant = 'PG' | wajib terisi, tanpa fallback |
| B11 | PK submit eksploitasi PG | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'submit' | tgl_submit_pk_ke_hps | sumber_dana = 'eksploitasi' | kategori_plant = 'PG' |  |
| B12 | PK submit investasi PG | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'submit' | tgl_submit_pk_ke_hps | sumber_dana = 'investasi' | kategori_plant = 'PG' |  |
| B13 | PK draft eksploitasi PG | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'draft' | tgl_create_pk | sumber_dana = 'eksploitasi' | kategori_plant = 'PG' |  |
| B14 | PK draft eksploitasi MKSO | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'draft' | tgl_create_pk | sumber_dana = 'eksploitasi' | kategori_plant = 'MKSO' |  |
| B15 | PK draft investasi PG | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'draft' | tgl_create_pk | sumber_dana = 'investasi' | kategori_plant = 'PG' |  |
| B16 | PK draft investasi MKSO | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'draft' | tgl_create_pk | sumber_dana = 'investasi' | kategori_plant = 'MKSO' |  |
| B2 | PK pengadaan eksploitasi MKSO | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'pengadaan' | tgl_submit_ke_pengadaan | sumber_dana = 'eksploitasi' | kategori_plant = 'MKSO' |  |
| B3 | PK pengadaan eksploitasi HO | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'pengadaan' | tgl_submit_ke_pengadaan | sumber_dana = 'eksploitasi' | kategori_plant = 'HO' |  |
| B4 | PK pengadaan investasi PG | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'pengadaan' | tgl_submit_ke_pengadaan | sumber_dana = 'investasi' | kategori_plant = 'PG' |  |
| B5 | PK pengadaan investasi MKSO | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'pengadaan' | tgl_submit_ke_pengadaan | sumber_dana = 'investasi' | kategori_plant = 'MKSO' |  |
| B6 | PK pengadaan investasi HO | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'pengadaan' | tgl_submit_ke_pengadaan | sumber_dana = 'investasi' | kategori_plant = 'HO' |  |
| B7 | PK assign eksploitasi PG | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'assign' | tgl_assign | sumber_dana = 'eksploitasi' | kategori_plant = 'PG' | wajib terisi, tanpa fallback |
| B8 | PK assign eksploitasi MKSO | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'assign' | tgl_assign | sumber_dana = 'eksploitasi' | kategori_plant = 'MKSO' | wajib terisi, tanpa fallback |
| B9 | PK assign eksploitasi HO | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'assign' | tgl_assign | sumber_dana = 'eksploitasi' | kategori_plant = 'HO' | wajib terisi, tanpa fallback |
| C001 | HPS HPS selesai | COUNT DISTINCT | no_pk | no_pk | (derived) | tgl_penetapan IS NOT NULL | tgl_penetapan | sumber_dana IS NOT NULL AND sumber_dana <> '' | (all kategori_plant) | status HPS diturunkan dari tanggal |
| C002 | HPS proses HPS | COUNT DISTINCT | no_pk | no_pk | (derived) | tgl_submit_pk_ke_hps IS NOT NULL AND tgl_penetapan IS NULL | tgl_submit_pk_ke_hps | sumber_dana IS NOT NULL AND sumber_dana <> '' | (all kategori_plant) | status HPS diturunkan dari tanggal |
| C1 | HPS HPS selesai eksploitasi PG | COUNT DISTINCT | no_pk | no_pk | (derived) | tgl_penetapan IS NOT NULL | tgl_penetapan | sumber_dana = 'eksploitasi' | kategori_plant = 'PG' | status HPS diturunkan dari tanggal |
| C10 | HPS proses HPS investasi PG | COUNT DISTINCT | no_pk | no_pk | (derived) | tgl_submit_pk_ke_hps IS NOT NULL AND tgl_penetapan IS NULL | tgl_submit_pk_ke_hps | sumber_dana = 'investasi' | kategori_plant = 'PG' | status HPS diturunkan dari tanggal |
| C11 | HPS proses HPS investasi MKSO | COUNT DISTINCT | no_pk | no_pk | (derived) | tgl_submit_pk_ke_hps IS NOT NULL AND tgl_penetapan IS NULL | tgl_submit_pk_ke_hps | sumber_dana = 'investasi' | kategori_plant = 'MKSO' | status HPS diturunkan dari tanggal |
| C2 | HPS HPS selesai eksploitasi MKSO | COUNT DISTINCT | no_pk | no_pk | (derived) | tgl_penetapan IS NOT NULL | tgl_penetapan | sumber_dana = 'eksploitasi' | kategori_plant = 'MKSO' | status HPS diturunkan dari tanggal |
| C3 | HPS HPS selesai eksploitasi HO | COUNT DISTINCT | no_pk | no_pk | (derived) | tgl_penetapan IS NOT NULL | tgl_penetapan | sumber_dana = 'eksploitasi' | kategori_plant = 'HO' | status HPS diturunkan dari tanggal |
| C4 | HPS HPS selesai investasi PG | COUNT DISTINCT | no_pk | no_pk | (derived) | tgl_penetapan IS NOT NULL | tgl_penetapan | sumber_dana = 'investasi' | kategori_plant = 'PG' | status HPS diturunkan dari tanggal |
| C5 | HPS HPS selesai investasi MKSO | COUNT DISTINCT | no_pk | no_pk | (derived) | tgl_penetapan IS NOT NULL | tgl_penetapan | sumber_dana = 'investasi' | kategori_plant = 'MKSO' | status HPS diturunkan dari tanggal |
| C6 | HPS HPS selesai investasi HO | COUNT DISTINCT | no_pk | no_pk | (derived) | tgl_penetapan IS NOT NULL | tgl_penetapan | sumber_dana = 'investasi' | kategori_plant = 'HO' | status HPS diturunkan dari tanggal |
| C7 | HPS proses HPS eksploitasi PG | COUNT DISTINCT | no_pk | no_pk | (derived) | tgl_submit_pk_ke_hps IS NOT NULL AND tgl_penetapan IS NULL | tgl_submit_pk_ke_hps | sumber_dana = 'eksploitasi' | kategori_plant = 'PG' | status HPS diturunkan dari tanggal |
| C8 | HPS proses HPS eksploitasi MKSO | COUNT DISTINCT | no_pk | no_pk | (derived) | tgl_submit_pk_ke_hps IS NOT NULL AND tgl_penetapan IS NULL | tgl_submit_pk_ke_hps | sumber_dana = 'eksploitasi' | kategori_plant = 'MKSO' | status HPS diturunkan dari tanggal |
| C9 | HPS proses HPS eksploitasi HO | COUNT DISTINCT | no_pk | no_pk | (derived) | tgl_submit_pk_ke_hps IS NOT NULL AND tgl_penetapan IS NULL | tgl_submit_pk_ke_hps | sumber_dana = 'eksploitasi' | kategori_plant = 'HO' | status HPS diturunkan dari tanggal |
| D001 | PP finish | COUNT DISTINCT | no_pp | no_pp | status_pp_ | status_pp_ = 'finish' AND status_pp_ <> 'pengajuan pr' | tgl_pengumuman_pemenang | sumber_dana IS NOT NULL AND sumber_dana <> '' | (all kategori_plant) |  |
| D002 | PP laksanakan | COUNT DISTINCT | no_pp | no_pp | status_pp_ | status_pp_ = 'laksanakan' AND status_pp_ <> 'pengajuan pr' | tgl_pelaksanaan_pp | sumber_dana IS NOT NULL AND sumber_dana <> '' | (all kategori_plant) |  |
| D003 | PP draft | COUNT DISTINCT | no_pp | no_pp | status_pp_ | status_pp_ = 'draft' AND status_pp_ <> 'pengajuan pr' | tgl_create_pp | sumber_dana IS NOT NULL AND sumber_dana <> '' | (all kategori_plant) |  |
| D100 | PP total | COUNT DISTINCT | no_pp | no_pp | status_pp_ | status_pp_ IN ('draft','laksanakan','finish') AND status_pp_ <> 'pengajuan pr' | CASE status_pp_: draft=tgl_create_pp; laksanakan=tgl_pelaksanaan_pp; finish=tgl_pengumuman_pemenang | sumber_dana IS NOT NULL AND sumber_dana <> '' | (all kategori_plant) | agregat status |
| D1 | PP finish eksploitasi PG | COUNT DISTINCT | no_pp | no_pp | status_pp_ | status_pp_ = 'finish' AND status_pp_ <> 'pengajuan pr' | tgl_pengumuman_pemenang | sumber_dana = 'eksploitasi' | kategori_plant = 'PG' |  |
| D10 | PP laksanakan investasi PG | COUNT DISTINCT | no_pp | no_pp | status_pp_ | status_pp_ = 'laksanakan' AND status_pp_ <> 'pengajuan pr' | tgl_pelaksanaan_pp | sumber_dana = 'investasi' | kategori_plant = 'PG' |  |
| D11 | PP draft eksploitasi PG | COUNT DISTINCT | no_pp | no_pp | status_pp_ | status_pp_ = 'draft' AND status_pp_ <> 'pengajuan pr' | tgl_create_pp | sumber_dana = 'eksploitasi' | kategori_plant = 'PG' |  |
| D2 | PP finish eksploitasi MKSO | COUNT DISTINCT | no_pp | no_pp | status_pp_ | status_pp_ = 'finish' AND status_pp_ <> 'pengajuan pr' | tgl_pengumuman_pemenang | sumber_dana = 'eksploitasi' | kategori_plant = 'MKSO' |  |
| D3 | PP finish eksploitasi HO | COUNT DISTINCT | no_pp | no_pp | status_pp_ | status_pp_ = 'finish' AND status_pp_ <> 'pengajuan pr' | tgl_pengumuman_pemenang | sumber_dana = 'eksploitasi' | kategori_plant = 'HO' |  |
| D4 | PP finish investasi PG | COUNT DISTINCT | no_pp | no_pp | status_pp_ | status_pp_ = 'finish' AND status_pp_ <> 'pengajuan pr' | tgl_pengumuman_pemenang | sumber_dana = 'investasi' | kategori_plant = 'PG' |  |
| D5 | PP finish investasi MKSO | COUNT DISTINCT | no_pp | no_pp | status_pp_ | status_pp_ = 'finish' AND status_pp_ <> 'pengajuan pr' | tgl_pengumuman_pemenang | sumber_dana = 'investasi' | kategori_plant = 'MKSO' |  |
| D6 | PP finish investasi HO | COUNT DISTINCT | no_pp | no_pp | status_pp_ | status_pp_ = 'finish' AND status_pp_ <> 'pengajuan pr' | tgl_pengumuman_pemenang | sumber_dana = 'investasi' | kategori_plant = 'HO' |  |
| D7 | PP laksanakan eksploitasi PG | COUNT DISTINCT | no_pp | no_pp | status_pp_ | status_pp_ = 'laksanakan' AND status_pp_ <> 'pengajuan pr' | tgl_pelaksanaan_pp | sumber_dana = 'eksploitasi' | kategori_plant = 'PG' |  |
| D8 | PP laksanakan eksploitasi MKSO | COUNT DISTINCT | no_pp | no_pp | status_pp_ | status_pp_ = 'laksanakan' AND status_pp_ <> 'pengajuan pr' | tgl_pelaksanaan_pp | sumber_dana = 'eksploitasi' | kategori_plant = 'MKSO' |  |
| D9 | PP laksanakan eksploitasi HO | COUNT DISTINCT | no_pp | no_pp | status_pp_ | status_pp_ = 'laksanakan' AND status_pp_ <> 'pengajuan pr' | tgl_pelaksanaan_pp | sumber_dana = 'eksploitasi' | kategori_plant = 'HO' |  |
| E001 | SPPBJ approved | COUNT DISTINCT | no_sppbj | no_sppbj | status_sppbj | status_sppbj = 'approved' | tgl_approval_sppbj | sumber_dana IS NOT NULL AND sumber_dana <> '' | (all kategori_plant) |  |
| E100 | SPPBJ total | COUNT DISTINCT | no_sppbj | no_sppbj | status_sppbj | status_sppbj = 'approved' AND kategori_tahap = 'Selesai (pemilihan penyedia)' | tgl_approval_sppbj | sumber_dana IS NOT NULL AND sumber_dana <> '' | (all kategori_plant) | agregat total |
| E1 | SPPBJ approved eksploitasi PG | COUNT DISTINCT | no_sppbj | no_sppbj | status_sppbj | status_sppbj = 'approved' | tgl_approval_sppbj | sumber_dana = 'eksploitasi' | kategori_plant = 'PG' |  |
| E2 | SPPBJ approved eksploitasi MKSO | COUNT DISTINCT | no_sppbj | no_sppbj | status_sppbj | status_sppbj = 'approved' | tgl_approval_sppbj | sumber_dana = 'eksploitasi' | kategori_plant = 'MKSO' |  |
| E3 | SPPBJ approved eksploitasi HO | COUNT DISTINCT | no_sppbj | no_sppbj | status_sppbj | status_sppbj = 'approved' | tgl_approval_sppbj | sumber_dana = 'eksploitasi' | kategori_plant = 'HO' |  |
| E4 | SPPBJ approved investasi PG | COUNT DISTINCT | no_sppbj | no_sppbj | status_sppbj | status_sppbj = 'approved' | tgl_approval_sppbj | sumber_dana = 'investasi' | kategori_plant = 'PG' |  |
| E5 | SPPBJ approved investasi MKSO | COUNT DISTINCT | no_sppbj | no_sppbj | status_sppbj | status_sppbj = 'approved' | tgl_approval_sppbj | sumber_dana = 'investasi' | kategori_plant = 'MKSO' |  |
| E6 | SPPBJ approved investasi HO | COUNT DISTINCT | no_sppbj | no_sppbj | status_sppbj | status_sppbj = 'approved' | tgl_approval_sppbj | sumber_dana = 'investasi' | kategori_plant = 'HO' |  |
## Metadata sumber kolom di tabel analitic

Kolom berikut sudah ditambahkan dan diisi untuk seluruh kode:
- `source_doc_no_col`
- `source_doc_date_col`
- `source_value_col`
- `source_value_date_col`
- `is_value_applicable`

Aturan inti:
- `A*` (PR) hanya volume dokumen (`is_value_applicable=false`).
- `B*` (PK) nilai dari `total_nilai_hasil`.
- `C*` (HPS) nilai dari `hps_hasil`.
- `D*` (PP) nilai dari `anggaran_hasil`.
- `E*` (SPPBJ) nilai dari `nilai_akhir_hasil`.

## KPI Nilai (V001-V007)

KPI global disajikan dari:
- `v_fact_value_weekly_dense` (format wide)
- `v_fact_value_weekly_dense_kpi` (format unpivot per `kpi_code`)
- `v_fact_value_weekly_dense_cum` (kumulatif wide)

Definisi isi KPI (sesuai view saat ini):

| kpi_code | kpi_label | sumber nilai | rumus |
| --- | --- | --- | --- |
| V001 | total_nilai | `total_nilai` | nilai PK |
| V002 | anggaran | `anggaran` | nilai anggaran PP |
| V003 | hps | `hps` | nilai HPS |
| V004 | realisasi | `realisasi` | nilai realisasi |
| V005 | saving_nilai | `saving_nilai` | nilai saving |
| V006 | saving_pct_anggaran | turunan | `saving_nilai / anggaran * 100` (jika `anggaran > 0`) |
| V007 | saving_pct_hps | turunan | `saving_nilai / hps * 100` (jika `hps > 0`) |

Varian dimensi yang tersedia saat ini (`sumber_dana`, `kategori_plant`):
- `ALL, ALL`
- `eksploitasi, ALL`
- `eksploitasi, PG`
- `eksploitasi, MKSO`
- `eksploitasi, HO`
- `investasi, ALL`
- `investasi, PG`
- `investasi, MKSO`
- `investasi, HO`

Rekap jumlah series KPI:
- Jumlah KPI: `7`
- Jumlah varian dimensi: `9`
- Total series KPI per `(period_type, period_year)`: `7 x 9 = 63`

Penyederhanaan agar tidak terlalu banyak (opsional):
- Paket ringkas dashboard: gunakan hanya `3` varian dimensi
  - `ALL, ALL`
  - `eksploitasi, ALL`
  - `investasi, ALL`
- Dengan paket ringkas, series KPI per `(period_type, period_year)` menjadi `7 x 3 = 21`.

Catatan:
- KPI V001-V007 adalah KPI nilai global mingguan (bukan mapping 1:1 ke setiap `kode_data` analitic).
- Untuk nilai per `kode_data`, gunakan `fact_value_weekly_analitic` / `v_fact_value_weekly_by_analitic`.
- Kumulatif unpivot per `kpi_code` belum ada view khusus; saat ini kumulatif tersedia di format wide (`v_fact_value_weekly_dense_cum`).

