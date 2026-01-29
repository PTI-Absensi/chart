# Procurement Charting Suite

Aplikasi charting untuk visualisasi data procurement perusahaan manufaktur. Dibangun dengan Vue 3 + Vite (frontend) dan Node.js + Express (backend).

## 🚀 Quick Start

```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend (terminal terpisah)
cd backend-node
npm install
npm run dev
```

Buka `http://localhost:5173/`

## 📁 Struktur Folder

```
chart/
├── frontend/           # Vue 3 + Vite SPA
│   ├── src/
│   │   ├── components/ # Vue components
│   │   ├── pages/      # Page components
│   │   ├── composables/# Vue composables
│   │   ├── legacy/     # Legacy chart-app.ts
│   │   └── styles/     # CSS styles
│   └── vite.config.ts
│
├── backend-node/       # Node.js + Express API
│   ├── src/
│   │   ├── services/   # Business logic
│   │   └── index.js    # API routes
│   └── storage/        # JSON file storage
│
└── legacy/             # FastAPI + static HTML (deprecated)
```

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vue 3, Vite, Vue Router, Lightweight Charts v5 |
| Backend | Node.js, Express, PostgreSQL |
| Database | PostgreSQL (olahproc) |
| Storage | JSON files (charts, dashboards, templates) |

## 📊 Fitur

### Procurement Charting (`/`)
- Multi-series time series chart
- Line, Area, Bar, Candlestick chart types
- Weekly data dari database procurement
- Filter: Kalender/Anggaran, Tahun
- Normalize, Log scale, Auto scale
- Export PNG/CSV
- Save/Load templates

### Dashboard Builder (`/dashboards`)
- Buat dashboard baru
- Tambah chart ke layout grid
- Export dashboard

### Data Sources (`/sources`)
- Upload CSV/JSON
- Preview data
- Column mapping

### Other Features
- Chart Builder (`/builder`)
- Templates (`/templates`)
- DFG Viewer (`/dfg`)
- Process Time (`/process-time`)

## 🌐 API Endpoints

```
GET  /api/symbols              # List kode data
GET  /api/ohlc/:symbol         # Data OHLC untuk chart
GET  /api/procurement/symbols  # Procurement symbols
GET  /api/procurement/data/:symbol # Time series data

GET  /api/charts               # List saved charts
POST /api/charts               # Create chart
GET  /api/dashboards           # List dashboards
POST /api/dashboards           # Create dashboard
GET  /api/templates            # List templates
POST /api/templates            # Save template
```

## ⚙️ Environment Variables

```env
# backend-node/.env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=olahproc
DB_USER=postgres
DB_PASSWORD=postgres
HOST=0.0.0.0
AUTH_ENABLED=false
```

## 📝 Notes

- Auth disabled by default untuk development
- Data disimpan di `backend-node/storage/*.json`
- Database PostgreSQL `olahproc` harus sudah ada dengan data procurement

## 📄 License

Internal use only.
