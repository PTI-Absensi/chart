# Debugging: Error Koneksi Database Backend (`28P01`)

Dokumentasi ini merangkum incident backend `chart` saat API gagal mengakses PostgreSQL.

## Ringkasan Error

Gejala di log PM2:

```text
password authentication failed for user "postgres"
code: '28P01'
routine: 'auth_failed'
```

Dampak:
- Endpoint `/health` tetap `healthy`
- Endpoint berbasis query DB (contoh `/api/procurement/symbols`) gagal

## Akar Masalah

Ada beberapa faktor yang muncul bersamaan:

1. Kredensial user DB sempat tidak sinkron.
2. PM2 sempat menjalankan proses dengan environment lama.
3. Sumber utama: file `src/db.js` di server masih hardcoded:
   - `user: 'postgres'`
   - `password: 'postgres'`
   
Akibat poin (3), backend tidak membaca `.env` walaupun `.env` sudah benar.

## Langkah Perbaikan

## 1. Buat user aplikasi khusus

Di server PostgreSQL:

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'chartuser') THEN
    CREATE USER chartuser WITH PASSWORD 'chartpassword';
  ELSE
    ALTER USER chartuser WITH PASSWORD 'chartpassword';
  END IF;
END $$;

GRANT CONNECT ON DATABASE olahproc TO chartuser;
GRANT USAGE ON SCHEMA public TO chartuser;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO chartuser;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO chartuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO chartuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO chartuser;
```

Tes koneksi:

```bash
PGPASSWORD='chartpassword' psql -h localhost -p 5432 -U chartuser -d olahproc -c "select current_user, current_database();"
```

## 2. Pastikan `.env` backend benar

File: `chart/backend-node/.env`

```env
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=olahproc
DB_USER=chartuser
DB_PASSWORD=chartpassword
```

## 3. Perbaiki `src/db.js` agar pakai config

File: `chart/backend-node/src/db.js` harus mengambil dari `config.db`, bukan hardcoded.

```js
import pkg from 'pg'
import { config } from './config.js'

const { Pool } = pkg

export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password
})
```

## 4. Restart PM2 dengan env terbaru

```bash
cd /home/procurement/chart/backend-node
pm2 restart procurement-backend --update-env
pm2 save
```

Jika perlu reset total proses:

```bash
pm2 delete procurement-backend
DB_HOST=localhost DB_PORT=5432 DB_NAME=olahproc DB_USER=chartuser DB_PASSWORD=chartpassword PORT=4000 pm2 start src/index.js --name procurement-backend --cwd /home/procurement/chart/backend-node -i 1
pm2 save
```

## Verifikasi Akhir

```bash
pm2 env 0 | egrep 'DB_HOST|DB_PORT|DB_NAME|DB_USER|DB_PASSWORD|PORT'
curl -sS http://127.0.0.1:4000/health
curl -sS http://127.0.0.1:4000/api/procurement/symbols | head -c 400; echo
pm2 logs procurement-backend --lines 30 --nostream
```

Kondisi sukses:
- `pm2 env` menunjukkan `DB_USER=chartuser`
- `/health` mengembalikan status healthy
- `/api/procurement/symbols` mengembalikan data
- Tidak ada lagi error `28P01` di log

## Catatan Penting

- `psql -U postgres -d olahproc` tanpa `-h` bisa sukses walau password salah, karena koneksi `local` bisa `trust/peer`.
- Backend Node memakai koneksi TCP (`localhost`), sehingga tetap wajib password valid sesuai `pg_hba.conf`.
- Hindari memakai user `postgres` untuk aplikasi. Gunakan user khusus app (`chartuser`) dengan privilege minimal.
