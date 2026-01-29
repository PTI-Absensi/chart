# Analytic Column Mapping (per item)

Sumber data: `v_cleansing_pk_vendor`. Semua analitic diambil dari tabel `olahproc.analitic`.
Catatan: semua item analitic di tabel ini adalah volume dokumen (COUNT DISTINCT).

| kode_data | analitic | agg_type | agg_col | doc_no_col | status_col | status_rule | date_col | filter sumber_dana | filter kategori_plant | note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A001 | PR approve | COUNT DISTINCT | no_pr | no_pr | status_pr | status_pr = 'approve' | tgl_verifikasi_pr | sumber_dana IS NOT NULL AND sumber_dana <> '' | (all kategori_plant) |  |
| A002 | PR submit | COUNT DISTINCT | no_pr | no_pr | status_pr | status_pr = 'submit' | tgl_verifikasi_pr | sumber_dana IS NOT NULL AND sumber_dana <> '' | (all kategori_plant) |  |
| A1 | PR approve eksploitasi PG | COUNT DISTINCT | no_pr | no_pr | status_pr | status_pr = 'approve' | tgl_verifikasi_pr | sumber_dana = 'eksploitasi' | kategori_plant = 'PG' |  |
| A2 | PR approve eksploitasi MKSO | COUNT DISTINCT | no_pr | no_pr | status_pr | status_pr = 'approve' | tgl_verifikasi_pr | sumber_dana = 'eksploitasi' | kategori_plant = 'MKSO' |  |
| A3 | PR approve eksploitasi HO | COUNT DISTINCT | no_pr | no_pr | status_pr | status_pr = 'approve' | tgl_verifikasi_pr | sumber_dana = 'eksploitasi' | kategori_plant = 'HO' |  |
| A4 | PR approve investasi PG | COUNT DISTINCT | no_pr | no_pr | status_pr | status_pr = 'approve' | tgl_verifikasi_pr | sumber_dana = 'investasi' | kategori_plant = 'PG' |  |
| A5 | PR approve investasi MKSO | COUNT DISTINCT | no_pr | no_pr | status_pr | status_pr = 'approve' | tgl_verifikasi_pr | sumber_dana = 'investasi' | kategori_plant = 'MKSO' |  |
| A6 | PR approve investasi HO | COUNT DISTINCT | no_pr | no_pr | status_pr | status_pr = 'approve' | tgl_verifikasi_pr | sumber_dana = 'investasi' | kategori_plant = 'HO' |  |
| B001 | PK pengadaan | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'pengadaan' | tgl_submit_pk_ke_hps | sumber_dana IS NOT NULL AND sumber_dana <> '' | (all kategori_plant) |  |
| B002 | PK assign | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'assign' | tgl_submit_pk_ke_hps | sumber_dana IS NOT NULL AND sumber_dana <> '' | (all kategori_plant) |  |
| B003 | PK submit | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'submit' | tgl_submit_pk_ke_hps | sumber_dana IS NOT NULL AND sumber_dana <> '' | (all kategori_plant) |  |
| B004 | PK draft | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'draft' | tgl_submit_pk_ke_hps | sumber_dana IS NOT NULL AND sumber_dana <> '' | (all kategori_plant) |  |
| B1 | PK pengadaan eksploitasi PG | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'pengadaan' | tgl_submit_pk_ke_hps | sumber_dana = 'eksploitasi' | kategori_plant = 'PG' |  |
| B10 | PK assign investasi PG | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'assign' | tgl_submit_pk_ke_hps | sumber_dana = 'investasi' | kategori_plant = 'PG' |  |
| B11 | PK submit eksploitasi PG | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'submit' | tgl_submit_pk_ke_hps | sumber_dana = 'eksploitasi' | kategori_plant = 'PG' |  |
| B12 | PK submit investasi PG | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'submit' | tgl_submit_pk_ke_hps | sumber_dana = 'investasi' | kategori_plant = 'PG' |  |
| B13 | PK draft eksploitasi PG | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'draft' | tgl_submit_pk_ke_hps | sumber_dana = 'eksploitasi' | kategori_plant = 'PG' |  |
| B14 | PK draft eksploitasi MKSO | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'draft' | tgl_submit_pk_ke_hps | sumber_dana = 'eksploitasi' | kategori_plant = 'MKSO' |  |
| B15 | PK draft investasi PG | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'draft' | tgl_submit_pk_ke_hps | sumber_dana = 'investasi' | kategori_plant = 'PG' |  |
| B16 | PK draft investasi MKSO | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'draft' | tgl_submit_pk_ke_hps | sumber_dana = 'investasi' | kategori_plant = 'MKSO' |  |
| B2 | PK pengadaan eksploitasi MKSO | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'pengadaan' | tgl_submit_pk_ke_hps | sumber_dana = 'eksploitasi' | kategori_plant = 'MKSO' |  |
| B3 | PK pengadaan eksploitasi HO | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'pengadaan' | tgl_submit_pk_ke_hps | sumber_dana = 'eksploitasi' | kategori_plant = 'HO' |  |
| B4 | PK pengadaan investasi PG | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'pengadaan' | tgl_submit_pk_ke_hps | sumber_dana = 'investasi' | kategori_plant = 'PG' |  |
| B5 | PK pengadaan investasi MKSO | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'pengadaan' | tgl_submit_pk_ke_hps | sumber_dana = 'investasi' | kategori_plant = 'MKSO' |  |
| B6 | PK pengadaan investasi HO | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'pengadaan' | tgl_submit_pk_ke_hps | sumber_dana = 'investasi' | kategori_plant = 'HO' |  |
| B7 | PK assign eksploitasi PG | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'assign' | tgl_submit_pk_ke_hps | sumber_dana = 'eksploitasi' | kategori_plant = 'PG' |  |
| B8 | PK assign eksploitasi MKSO | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'assign' | tgl_submit_pk_ke_hps | sumber_dana = 'eksploitasi' | kategori_plant = 'MKSO' |  |
| B9 | PK assign eksploitasi HO | COUNT DISTINCT | no_pk | no_pk | status_pk | status_pk = 'assign' | tgl_submit_pk_ke_hps | sumber_dana = 'eksploitasi' | kategori_plant = 'HO' |  |
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
| D001 | PP finish | COUNT DISTINCT | no_pp | no_pp | status_pp_ | status_pp_ = 'finish' AND status_pp_ <> 'pengajuan pr' | tgl_approval_sppbj | sumber_dana IS NOT NULL AND sumber_dana <> '' | (all kategori_plant) |  |
| D002 | PP laksanakan | COUNT DISTINCT | no_pp | no_pp | status_pp_ | status_pp_ = 'laksanakan' AND status_pp_ <> 'pengajuan pr' | tgl_approval_sppbj | sumber_dana IS NOT NULL AND sumber_dana <> '' | (all kategori_plant) |  |
| D003 | PP draft | COUNT DISTINCT | no_pp | no_pp | status_pp_ | status_pp_ = 'draft' AND status_pp_ <> 'pengajuan pr' | tgl_approval_sppbj | sumber_dana IS NOT NULL AND sumber_dana <> '' | (all kategori_plant) |  |
| D1 | PP finish eksploitasi PG | COUNT DISTINCT | no_pp | no_pp | status_pp_ | status_pp_ = 'finish' AND status_pp_ <> 'pengajuan pr' | tgl_approval_sppbj | sumber_dana = 'eksploitasi' | kategori_plant = 'PG' |  |
| D10 | PP laksanakan investasi PG | COUNT DISTINCT | no_pp | no_pp | status_pp_ | status_pp_ = 'laksanakan' AND status_pp_ <> 'pengajuan pr' | tgl_approval_sppbj | sumber_dana = 'investasi' | kategori_plant = 'PG' |  |
| D11 | PP draft eksploitasi PG | COUNT DISTINCT | no_pp | no_pp | status_pp_ | status_pp_ = 'draft' AND status_pp_ <> 'pengajuan pr' | tgl_approval_sppbj | sumber_dana = 'eksploitasi' | kategori_plant = 'PG' |  |
| D2 | PP finish eksploitasi MKSO | COUNT DISTINCT | no_pp | no_pp | status_pp_ | status_pp_ = 'finish' AND status_pp_ <> 'pengajuan pr' | tgl_approval_sppbj | sumber_dana = 'eksploitasi' | kategori_plant = 'MKSO' |  |
| D3 | PP finish eksploitasi HO | COUNT DISTINCT | no_pp | no_pp | status_pp_ | status_pp_ = 'finish' AND status_pp_ <> 'pengajuan pr' | tgl_approval_sppbj | sumber_dana = 'eksploitasi' | kategori_plant = 'HO' |  |
| D4 | PP finish investasi PG | COUNT DISTINCT | no_pp | no_pp | status_pp_ | status_pp_ = 'finish' AND status_pp_ <> 'pengajuan pr' | tgl_approval_sppbj | sumber_dana = 'investasi' | kategori_plant = 'PG' |  |
| D5 | PP finish investasi MKSO | COUNT DISTINCT | no_pp | no_pp | status_pp_ | status_pp_ = 'finish' AND status_pp_ <> 'pengajuan pr' | tgl_approval_sppbj | sumber_dana = 'investasi' | kategori_plant = 'MKSO' |  |
| D6 | PP finish investasi HO | COUNT DISTINCT | no_pp | no_pp | status_pp_ | status_pp_ = 'finish' AND status_pp_ <> 'pengajuan pr' | tgl_approval_sppbj | sumber_dana = 'investasi' | kategori_plant = 'HO' |  |
| D7 | PP laksanakan eksploitasi PG | COUNT DISTINCT | no_pp | no_pp | status_pp_ | status_pp_ = 'laksanakan' AND status_pp_ <> 'pengajuan pr' | tgl_approval_sppbj | sumber_dana = 'eksploitasi' | kategori_plant = 'PG' |  |
| D8 | PP laksanakan eksploitasi MKSO | COUNT DISTINCT | no_pp | no_pp | status_pp_ | status_pp_ = 'laksanakan' AND status_pp_ <> 'pengajuan pr' | tgl_approval_sppbj | sumber_dana = 'eksploitasi' | kategori_plant = 'MKSO' |  |
| D9 | PP laksanakan eksploitasi HO | COUNT DISTINCT | no_pp | no_pp | status_pp_ | status_pp_ = 'laksanakan' AND status_pp_ <> 'pengajuan pr' | tgl_approval_sppbj | sumber_dana = 'eksploitasi' | kategori_plant = 'HO' |  |
| E001 | SPPBJ approved | COUNT DISTINCT | no_sppbj | no_sppbj | status_sppbj | status_sppbj = 'approved' | tgl_approval_sppbj | sumber_dana IS NOT NULL AND sumber_dana <> '' | (all kategori_plant) |  |
| E1 | SPPBJ approved eksploitasi PG | COUNT DISTINCT | no_sppbj | no_sppbj | status_sppbj | status_sppbj = 'approved' | tgl_approval_sppbj | sumber_dana = 'eksploitasi' | kategori_plant = 'PG' |  |
| E2 | SPPBJ approved eksploitasi MKSO | COUNT DISTINCT | no_sppbj | no_sppbj | status_sppbj | status_sppbj = 'approved' | tgl_approval_sppbj | sumber_dana = 'eksploitasi' | kategori_plant = 'MKSO' |  |
| E3 | SPPBJ approved eksploitasi HO | COUNT DISTINCT | no_sppbj | no_sppbj | status_sppbj | status_sppbj = 'approved' | tgl_approval_sppbj | sumber_dana = 'eksploitasi' | kategori_plant = 'HO' |  |
| E4 | SPPBJ approved investasi PG | COUNT DISTINCT | no_sppbj | no_sppbj | status_sppbj | status_sppbj = 'approved' | tgl_approval_sppbj | sumber_dana = 'investasi' | kategori_plant = 'PG' |  |
| E5 | SPPBJ approved investasi MKSO | COUNT DISTINCT | no_sppbj | no_sppbj | status_sppbj | status_sppbj = 'approved' | tgl_approval_sppbj | sumber_dana = 'investasi' | kategori_plant = 'MKSO' |  |
| E6 | SPPBJ approved investasi HO | COUNT DISTINCT | no_sppbj | no_sppbj | status_sppbj | status_sppbj = 'approved' | tgl_approval_sppbj | sumber_dana = 'investasi' | kategori_plant = 'HO' |  |

## KPI Nilai (mapping kolom dan agregasi)
Semua KPI nilai memakai sumber `v_cleansing_pk_vendor` dan tanggal acuan `tgl_verifikasi_pr`.
Filter dasar: `sumber_dana IS NOT NULL AND sumber_dana <> ''` (kategori_plant opsional).

| KPI nilai | agg_type | value_col / formula | date_col | note |
| --- | --- | --- | --- | --- |
| total_nilai | SUM | total_nilai_bersih | tgl_verifikasi_pr | - |
| anggaran | SUM | anggaran_bersih | tgl_verifikasi_pr | - |
| hps | SUM | hps_bersih | tgl_verifikasi_pr | - |
| realisasi | SUM | nilai_akhir_bersih | tgl_verifikasi_pr | jika butuh hanya selesai, tambah filter kategori_tahap = Selesai (pemilihan penyedia) |
| saving_nilai | SUM | (anggaran_bersih - nilai_akhir_bersih) | tgl_verifikasi_pr | - |
| saving_pct_anggaran | RATIO | SUM(anggaran_bersih - nilai_akhir_bersih) / SUM(anggaran_bersih) | tgl_verifikasi_pr | hanya hitung jika SUM(anggaran_bersih) > 0 |
| saving_pct_hps | RATIO | SUM(hps_bersih - nilai_akhir_bersih) / SUM(hps_bersih) | tgl_verifikasi_pr | hanya hitung jika SUM(hps_bersih) > 0 |
