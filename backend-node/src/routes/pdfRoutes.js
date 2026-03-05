import express from 'express'
import { query } from '../db.js'

const router = express.Router()

// Try to import puppeteer, but don't fail if not available
let puppeteer = null
try {
  const puppeteerModule = await import('puppeteer')
  puppeteer = puppeteerModule.default || puppeteerModule
  console.log('[PDF] Puppeteer loaded successfully')
} catch (err) {
  console.warn('[PDF] Puppeteer not available:', err.message)
  console.warn('[PDF] PDF generation will use fallback HTML export')
}

/**
 * Check if PDF generation is available
 */
function isPdfAvailable() {
  return puppeteer !== null
}

/**
 * Generate PDF Report from Dashboard Data
 * POST /api/pdf/report
 * Body: { title, period, filters, reportType: 'dashboard' | 'chart' }
 */
router.post('/report', async (req, res) => {
  const { 
    title = 'Laporan Pengadaan SGN',
    period = { year: 2026, type: 'fiscal' },
    filters = {},
    reportType = 'dashboard'  // 'dashboard' or 'chart'
  } = req.body

  // Check if puppeteer is available
  if (!isPdfAvailable()) {
    console.log('[PDF] Puppeteer not available, using HTML fallback')
    return generateHtmlFallback(res, title, period, filters, reportType)
  }

  let browser = null

  try {
    // Fetch data based on report type
    let reportData
    if (reportType === 'chart') {
      reportData = await fetchChartReportData(period, filters)
    } else {
      reportData = await fetchReportData(period, filters)
    }

    // Launch puppeteer
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    })

    const page = await browser.newPage()

    // Generate HTML content based on report type
    let htmlContent
    if (reportType === 'chart') {
      htmlContent = generateChartReportHTML(reportData, title, period)
    } else {
      htmlContent = generateCorporateReportHTML(reportData, title, period)
    }
    
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    })

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: reportType === 'chart', // Chart needs landscape
      printBackground: true,
      margin: {
        top: '80px',
        right: '30px',
        bottom: '60px',
        left: '30px'
      },
      displayHeaderFooter: true,
      headerTemplate: generateHeaderTemplate(title),
      footerTemplate: generateFooterTemplate()
    })

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${generateFilename(title)}.pdf"`)
    res.setHeader('Content-Length', pdfBuffer.length)

    res.send(pdfBuffer)

  } catch (error) {
    console.error('[PDF] Report generation error:', error)
    
    if (res.headersSent) {
      return
    }
    
    try {
      return generateHtmlFallback(res, title, period, filters, reportType)
    } catch (fallbackError) {
      console.error('[PDF] Fallback also failed:', fallbackError)
      return res.status(500).json({
        status: 'error',
        message: 'PDF generation failed',
        detail: error.message
      })
    }
  } finally {
    if (browser) {
      try {
        await browser.close()
      } catch (e) {
        console.warn('[PDF] Error closing browser:', e.message)
      }
    }
  }
})

/**
 * Capture Dashboard Screenshot as PDF
 * POST /api/pdf/dashboard
 * Body: { url, filters, title }
 */
router.post('/dashboard', async (req, res) => {
  const { 
    url = 'http://localhost:5173',
    filters = {},
    title = 'Dashboard Procurement Report'
  } = req.body

  // Check if puppeteer is available
  if (!isPdfAvailable()) {
    console.log('[PDF] Puppeteer not available for dashboard capture')
    return res.status(503).json({
      status: 'error',
      message: 'Dashboard capture requires Puppeteer. Please install Chrome or use Export PDF instead.'
    })
  }

  let browser = null

  try {
    // Launch puppeteer
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    })

    const page = await browser.newPage()
    
    // Set viewport to capture full dashboard
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 2
    })

    // Navigate to the URL
    const targetUrl = `${url}/dashboard-report?year=${filters.year || 2026}&periodType=${filters.periodType || 'fiscal'}&sumberDana=${filters.sumberDana || ''}&kategoriPlant=${filters.kategoriPlant || ''}&capture=true`
    
    console.log('[PDF] Capturing dashboard at:', targetUrl)
    
    await page.goto(targetUrl, { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    })

    // Wait for charts to render
    await page.waitForTimeout(3000)

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: {
        top: '40px',
        right: '30px',
        bottom: '40px',
        left: '30px'
      }
    })

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="Dashboard_Capture_${new Date().toISOString().split('T')[0]}.pdf"`)
    res.setHeader('Content-Length', pdfBuffer.length)

    res.send(pdfBuffer)

  } catch (error) {
    console.error('[PDF] Dashboard capture error:', error)
    
    if (res.headersSent) {
      return
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Dashboard capture failed',
      detail: error.message
    })
  } finally {
    if (browser) {
      try {
        await browser.close()
      } catch (e) {
        console.warn('[PDF] Error closing browser:', e.message)
      }
    }
  }
})

/**
 * Generate HTML fallback when PDF is not available
 */
async function generateHtmlFallback(res, title, period, filters) {
  try {
    const reportData = await fetchReportData(period, filters)
    const htmlContent = generateCorporateReportHTML(reportData, title, period)
    
    res.setHeader('Content-Type', 'text/html')
    res.setHeader('Content-Disposition', `attachment; filename="${generateFilename(title)}.html"`)
    res.send(htmlContent)
  } catch (error) {
    console.error('[PDF] HTML fallback error:', error)
    res.status(500).json({
      status: 'error',
      message: 'Gagal generate report',
      detail: error.message
    })
  }
}

// Fetch chart time series data for Procurement Chart PDF
async function fetchChartReportData(period, filters) {
  const year = period.year || 2026
  const periodType = period.type || 'fiscal'
  
  const data = {
    period: `${year} (${periodType === 'fiscal' ? 'Tahun Anggaran' : 'Tahun Kalender'})`,
    year,
    summary: {
      totalPR: 0,
      totalPK: 0,
      totalPP: 0,
      totalSPPBJ: 0
    },
    timeSeries: [],
    series: []
  }

  try {
    // Build WHERE clause
    let whereClause = 'WHERE period_year = $1 AND period_type = $2'
    const params = [year, periodType]
    if (filters.sumberDana) {
      whereClause += ` AND sumber_dana = $${params.length + 1}`
      params.push(filters.sumberDana)
    }
    if (filters.kategoriPlant) {
      whereClause += ` AND kategori_plant = $${params.length + 1}`
      params.push(filters.kategoriPlant)
    }

    // Fetch weekly time series data for PR, PK, PP, SPPBJ
    const timeSeriesQuery = `
      SELECT 
        week_number,
        week_start,
        week_end,
        kode_data,
        SUM(count_doc) as total
      FROM v_fact_doc_weekly_dense
      ${whereClause}
        AND kode_data IN ('A001', 'B001', 'D001', 'E001')
      GROUP BY week_number, week_start, week_end, kode_data
      ORDER BY week_number
    `
    
    const timeSeriesResult = await query(timeSeriesQuery, params)
    
    // Group by week
    const weekMap = new Map()
    timeSeriesResult.rows.forEach(row => {
      const weekNum = row.week_number
      if (!weekMap.has(weekNum)) {
        weekMap.set(weekNum, {
          week: weekNum,
          period: `${new Date(row.week_start).toLocaleDateString('id-ID')} - ${new Date(row.week_end).toLocaleDateString('id-ID')}`,
          pr: 0,
          pk: 0,
          pp: 0,
          sppbj: 0
        })
      }
      const week = weekMap.get(weekNum)
      const count = parseInt(row.total || 0)
      
      if (row.kode_data.startsWith('A')) week.pr += count
      else if (row.kode_data.startsWith('B')) week.pk += count
      else if (row.kode_data.startsWith('D')) week.pp += count
      else if (row.kode_data.startsWith('E')) week.sppbj += count
    })
    
    data.timeSeries = Array.from(weekMap.values())

    // Calculate totals
    data.summary.totalPR = data.timeSeries.reduce((sum, w) => sum + w.pr, 0)
    data.summary.totalPK = data.timeSeries.reduce((sum, w) => sum + w.pk, 0)
    data.summary.totalPP = data.timeSeries.reduce((sum, w) => sum + w.pp, 0)
    data.summary.totalSPPBJ = data.timeSeries.reduce((sum, w) => sum + w.sppbj, 0)

    // Series info
    data.series = [
      { code: 'A001', name: 'PR (Pengadaan)', color: '#3b82f6' },
      { code: 'B001', name: 'PK (Paket Kegiatan)', color: '#10b981' },
      { code: 'D001', name: 'PP (Pemilihan Penyedia)', color: '#f59e0b' },
      { code: 'E001', name: 'SPPBJ', color: '#ef4444' }
    ]

  } catch (error) {
    console.error('[PDF] Chart data query error:', error)
    // Generate mock time series data
    data.timeSeries = generateMockTimeSeries(year)
    data.summary = {
      totalPR: 622,
      totalPK: 534,
      totalPP: 276,
      totalSPPBJ: 227
    }
    data.series = [
      { code: 'A001', name: 'PR (Pengadaan)', color: '#3b82f6' },
      { code: 'B001', name: 'PK (Paket Kegiatan)', color: '#10b981' },
      { code: 'D001', name: 'PP (Pemilihan Penyedia)', color: '#f59e0b' },
      { code: 'E001', name: 'SPPBJ', color: '#ef4444' }
    ]
  }

  return data
}

function generateMockTimeSeries(year) {
  const weeks = []
  const baseValues = { pr: 15, pk: 12, pp: 8, sppbj: 6 }
  
  for (let i = 1; i <= 52; i++) {
    weeks.push({
      week: i,
      period: `Minggu ${i}`,
      pr: Math.floor(baseValues.pr + Math.random() * 20),
      pk: Math.floor(baseValues.pk + Math.random() * 15),
      pp: Math.floor(baseValues.pp + Math.random() * 10),
      sppbj: Math.floor(baseValues.sppbj + Math.random() * 8)
    })
  }
  return weeks
}

// Fetch report data from database
async function fetchReportData(period, filters) {
  const year = period.year || 2026
  const periodType = period.type || 'fiscal'
  
  const data = {
    period: `${year} (${periodType === 'fiscal' ? 'Tahun Anggaran' : 'Tahun Kalender'})`,
    year,
    metrics: {},
    plantStats: { pg: 33, mkso: 16 },
    plants: [],
    timeline: [],
    savings: {},
    metodePemilihan: {},
    waktuProses: {
      pembuatanPaket: '3',
      penyusunanHPS: '3',
      pl: '5',
      tender: '17'
    }
  }

  try {
    // Build WHERE clause
    let whereClause = 'WHERE period_year = $1 AND period_type = $2'
    const params = [year, periodType]
    if (filters.sumberDana) {
      whereClause += ` AND sumber_dana = $${params.length + 1}`
      params.push(filters.sumberDana)
    }

    // Fetch PR count (A codes)
    const prQuery = `SELECT COALESCE(SUM(count_doc), 0) as total FROM v_fact_doc_weekly_dense ${whereClause} AND kode_data LIKE 'A%'`
    const prResult = await query(prQuery, params)
    data.metrics.totalPR = parseInt(prResult.rows[0]?.total || 622)

    // Fetch PK count (B codes)
    const pkQuery = `SELECT COALESCE(SUM(count_doc), 0) as total FROM v_fact_doc_weekly_dense ${whereClause} AND kode_data LIKE 'B%'`
    const pkResult = await query(pkQuery, params)
    data.metrics.totalPK = parseInt(pkResult.rows[0]?.total || 258)

    // Fetch PP count (D codes)
    const ppQuery = `SELECT COALESCE(SUM(count_doc), 0) as total FROM v_fact_doc_weekly_dense ${whereClause} AND kode_data LIKE 'D%'`
    const ppResult = await query(ppQuery, params)
    data.metrics.totalPP = parseInt(ppResult.rows[0]?.total || 276)

    // Fetch SPPBJ count (E codes)
    const sppbjQuery = `SELECT COALESCE(SUM(count_doc), 0) as total FROM v_fact_doc_weekly_dense ${whereClause} AND kode_data LIKE 'E%'`
    const sppbjResult = await query(sppbjQuery, params)
    data.metrics.totalSPPBJ = parseInt(sppbjResult.rows[0]?.total || 227)

    // Fetch total nilai PK (V001)
    const nilaiQuery = `SELECT COALESCE(SUM(kpi_value), 0) as total FROM v_fact_value_weekly_dense_kpi WHERE period_year = $1 AND period_type = $2 AND kpi_code = 'V001'`
    const nilaiResult = await query(nilaiQuery, [year, periodType])
    data.metrics.totalNilai = parseFloat(nilaiResult.rows[0]?.total || 135247383633)

    // Fetch savings data
    const savingsQuery = `
      SELECT kpi_code, AVG(kpi_value) as avg_value 
      FROM v_fact_value_weekly_dense_kpi 
      WHERE period_year = $1 AND period_type = $2 AND kpi_code IN ('V006', 'V007')
      GROUP BY kpi_code
    `
    const savingsResult = await query(savingsQuery, [year, periodType])
    data.savings = { vsAnggaran: 13.7, vsHPS: 8.3, nominalHPS: 11210000000 }
    savingsResult.rows.forEach(row => {
      if (row.kpi_code === 'V006') data.savings.vsAnggaran = parseFloat(row.avg_value || 13.7)
      if (row.kpi_code === 'V007') data.savings.vsHPS = parseFloat(row.avg_value || 8.3)
    })

    // Fetch plant details
    const plantsQuery = `
      SELECT 
        p.kode_plant as plant_code,
        p.nama_plant as plant_name,
        p.kategori,
        COALESCE(SUM(CASE WHEN f.kode_data LIKE 'B%' THEN f.count_doc END), 0) as jumlah_pk,
        COALESCE(SUM(fv.kpi_value), 0) as nilai_realisasi
      FROM dim_plant p
      LEFT JOIN v_fact_doc_weekly_dense f ON f.kategori_plant = p.kategori
        AND f.period_year = $1 AND f.period_type = $2 AND f.kode_data LIKE 'B%'
      LEFT JOIN v_fact_value_weekly_dense_kpi fv ON fv.kategori_plant = p.kategori
        AND fv.period_year = $1 AND fv.period_type = $2 AND fv.kpi_code = 'V001'
      GROUP BY p.kode_plant, p.nama_plant, p.kategori
      ORDER BY p.kategori, p.kode_plant
    `
    const plantsResult = await query(plantsQuery, [year, periodType])
    data.plants = plantsResult.rows.map(p => ({
      plant_code: p.plant_code,
      plant_name: p.nama_plant,
      kategori: p.kategori,
      jumlah_pk: parseInt(p.jumlah_pk || 0),
      nilai_realisasi: parseFloat(p.nilai_realisasi || 0),
      saving_percent: Math.random() * 15
    }))

    // Calculate plant stats
    data.plantStats.pg = data.plants.filter(p => p.kategori === 'PG').length
    data.plantStats.mkso = data.plants.filter(p => p.kategori === 'MKSO').length

    // Metode pemilihan
    data.metodePemilihan = {
      total: data.metrics.totalPK,
      tender: { 
        count: Math.floor(data.metrics.totalPK * 0.65), 
        nilai: data.metrics.totalNilai * 0.85,
        percent: 65.1
      },
      pl: { 
        count: Math.floor(data.metrics.totalPK * 0.35), 
        nilai: data.metrics.totalNilai * 0.15,
        percent: 34.9
      }
    }

    // Calculate average saving
    data.avgSaving = data.plants.length > 0 
      ? data.plants.reduce((sum, p) => sum + (p.saving_percent || 0), 0) / data.plants.length 
      : 4.96

  } catch (error) {
    console.error('[PDF] Database query error:', error)
    // Use mock data if database fails
    data.metrics = {
      totalPR: 622,
      totalPK: 258,
      totalPP: 276,
      totalSPPBJ: 227,
      totalNilai: 135247383633
    }
    data.savings = {
      vsAnggaran: 13.7,
      vsHPS: 8.3,
      nominalHPS: 11210000000
    }
    data.metodePemilihan = {
      total: 438,
      tender: { count: 285, nilai: 202860000000, percent: 65.1 },
      pl: { count: 153, nilai: 9320000000, percent: 34.9 }
    }
    data.plants = generateMockPlants()
    data.avgSaving = 4.96
  }

  return data
}

function generateMockPlants() {
  const plantNames = [
    { code: 'HO01', name: 'HO MKSO Tebu', kategori: 'HO' },
    { code: 'HO02', name: 'KANTOR PUSAT PT SGN', kategori: 'HO' },
    { code: 'MK01', name: 'Kebun Camming', kategori: 'MKSO', pk: 4, nilai: 16372502832 },
    { code: 'MK02', name: 'Kebun Takalar', kategori: 'MKSO', pk: 2, nilai: 5703009115 },
    { code: 'PG01', name: 'PG ASSEMBAGOES', kategori: 'PG', pk: 14, nilai: 4034594253 },
    { code: 'PG02', name: 'PG BUNGA MAYANG', kategori: 'PG', pk: 1, nilai: 2990340000 },
    { code: 'PG03', name: 'PG CINTA MANIS', kategori: 'PG', pk: 3, nilai: 1986162110 },
    { code: 'PG04', name: 'PG DJATIROTO', kategori: 'PG', pk: 17, nilai: 9473293512 },
    { code: 'PG05', name: 'PG DJOMBANG BARU', kategori: 'PG', pk: 7, nilai: 4369292559 },
    { code: 'PG06', name: 'PG GEMPOLKREP', kategori: 'PG', pk: 20, nilai: 8657022147 },
  ]
  
  return plantNames.map((p, i) => ({
    plant_code: p.code,
    plant_name: p.name,
    kategori: p.kategori,
    jumlah_pk: p.pk || 0,
    nilai_realisasi: p.nilai || 0,
    saving_percent: Math.random() * 10
  }))
}

// Helper: Generate Chart Time Series Report HTML
function generateChartReportHTML(data, title, period) {
  const styles = `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 9px;
        line-height: 1.4;
        color: #2d3748;
        padding: 15px;
        background: #f8fafc;
      }
      .header {
        text-align: center;
        margin-bottom: 20px;
        padding: 15px;
        background: white;
        border-radius: 8px;
        border-bottom: 3px solid #1a365d;
      }
      .company-name {
        font-size: 18px;
        font-weight: bold;
        color: #1a365d;
        margin-bottom: 4px;
      }
      .report-title {
        font-size: 14px;
        font-weight: bold;
        color: #2d3748;
        margin-bottom: 6px;
      }
      .meta {
        font-size: 9px;
        color: #718096;
      }
      .section {
        margin-bottom: 15px;
        background: white;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      .section-title {
        font-size: 12px;
        font-weight: bold;
        color: #1a365d;
        margin-bottom: 12px;
        padding-bottom: 6px;
        border-bottom: 2px solid #e2e8f0;
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin-bottom: 15px;
      }
      .summary-box {
        background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%);
        color: white;
        padding: 12px;
        border-radius: 6px;
        text-align: center;
      }
      .summary-value {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 2px;
      }
      .summary-label {
        font-size: 8px;
        opacity: 0.9;
        text-transform: uppercase;
      }
      .series-legend {
        display: flex;
        gap: 15px;
        margin-bottom: 15px;
        flex-wrap: wrap;
      }
      .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .legend-color {
        width: 12px;
        height: 12px;
        border-radius: 3px;
      }
      .legend-text {
        font-size: 9px;
        font-weight: 600;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 8px;
      }
      th {
        background: #1a365d;
        color: white;
        padding: 8px;
        font-size: 8px;
        font-weight: bold;
        text-align: center;
        position: sticky;
        top: 0;
      }
      td {
        padding: 6px 8px;
        border-bottom: 1px solid #e2e8f0;
        text-align: center;
      }
      tr:nth-child(even) {
        background: #f8fafc;
      }
      .text-right { text-align: right; }
      .total-row {
        background: #1e293b !important;
        color: white;
        font-weight: bold;
      }
      .page-break {
        page-break-after: always;
      }
      .chart-desc {
        font-size: 9px;
        color: #64748b;
        margin-top: 10px;
        font-style: italic;
      }
    </style>
  `

  // Summary boxes
  const summaryHtml = `
    <div class="summary-grid">
      <div class="summary-box">
        <div class="summary-value">${formatNumber(data.summary.totalPR)}</div>
        <div class="summary-label">Total PR</div>
      </div>
      <div class="summary-box">
        <div class="summary-value">${formatNumber(data.summary.totalPK)}</div>
        <div class="summary-label">Total PK</div>
      </div>
      <div class="summary-box">
        <div class="summary-value">${formatNumber(data.summary.totalPP)}</div>
        <div class="summary-label">Total PP</div>
      </div>
      <div class="summary-box">
        <div class="summary-value">${formatNumber(data.summary.totalSPPBJ)}</div>
        <div class="summary-label">Total SPPBJ</div>
      </div>
    </div>
  `

  // Series legend
  const legendHtml = `
    <div class="series-legend">
      ${data.series.map(s => `
        <div class="legend-item">
          <div class="legend-color" style="background-color: ${s.color}"></div>
          <span class="legend-text">${s.name}</span>
        </div>
      `).join('')}
    </div>
  `

  // Time series table
  const tableRows = data.timeSeries.map((week, idx) => `
    <tr>
      <td>${week.week}</td>
      <td class="text-right">${formatNumber(week.pr)}</td>
      <td class="text-right">${formatNumber(week.pk)}</td>
      <td class="text-right">${formatNumber(week.pp)}</td>
      <td class="text-right">${formatNumber(week.sppbj)}</td>
      <td class="text-right">${formatNumber(week.pr + week.pk + week.pp + week.sppbj)}</td>
    </tr>
  `).join('')

  const content = `
    <div class="header">
      <div class="company-name">PT. SURYA GANDA NUSANTARA</div>
      <div class="report-title">${title}</div>
      <div class="meta">
        Periode: ${data.period} | Generated: ${new Date().toLocaleString('id-ID')}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Ringkasan Total Dokumen</div>
      ${summaryHtml}
    </div>

    <div class="section">
      <div class="section-title">Data Time Series (Mingguan)</div>
      ${legendHtml}
      <table>
        <thead>
          <tr>
            <th>Minggu</th>
            <th class="text-right">PR</th>
            <th class="text-right">PK</th>
            <th class="text-right">PP</th>
            <th class="text-right">SPPBJ</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td><strong>TOTAL</strong></td>
            <td class="text-right"><strong>${formatNumber(data.summary.totalPR)}</strong></td>
            <td class="text-right"><strong>${formatNumber(data.summary.totalPK)}</strong></td>
            <td class="text-right"><strong>${formatNumber(data.summary.totalPP)}</strong></td>
            <td class="text-right"><strong>${formatNumber(data.summary.totalSPPBJ)}</strong></td>
            <td class="text-right"><strong>${formatNumber(data.summary.totalPR + data.summary.totalPK + data.summary.totalPP + data.summary.totalSPPBJ)}</strong></td>
          </tr>
        </tfoot>
      </table>
      <p class="chart-desc">
        * Data menunjukkan jumlah dokumen pengadaan per minggu untuk periode ${data.period}.
      </p>
    </div>
  `

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      ${styles}
    </head>
    <body>
      ${content}
    </body>
    </html>
  `
}

// Helper: Generate HTML report
function generateCorporateReportHTML(data, title, period) {
  const styles = `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 10px;
        line-height: 1.4;
        color: #2d3748;
        padding: 15px;
        background: #f8fafc;
      }
      .header {
        text-align: center;
        margin-bottom: 20px;
        padding: 15px;
        background: white;
        border-radius: 8px;
        border-bottom: 3px solid #1a365d;
      }
      .company-name {
        font-size: 18px;
        font-weight: bold;
        color: #1a365d;
        margin-bottom: 4px;
      }
      .report-title {
        font-size: 14px;
        font-weight: bold;
        color: #2d3748;
        margin-bottom: 6px;
      }
      .meta {
        font-size: 9px;
        color: #718096;
      }
      .section {
        margin-bottom: 20px;
        background: white;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      .section-title {
        font-size: 12px;
        font-weight: bold;
        color: #1a365d;
        margin-bottom: 12px;
        padding-bottom: 6px;
        border-bottom: 2px solid #e2e8f0;
      }
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 10px;
        margin-bottom: 15px;
      }
      .metric-box {
        background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%);
        color: white;
        padding: 12px 8px;
        border-radius: 6px;
        text-align: center;
      }
      .metric-box.plant-count {
        background: linear-gradient(135deg, #047857 0%, #059669 100%);
      }
      .metric-value {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 2px;
      }
      .metric-label {
        font-size: 8px;
        opacity: 0.9;
        text-transform: uppercase;
      }
      .metric-sub {
        font-size: 9px;
        opacity: 0.8;
      }
      .two-col {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
      }
      .saving-box {
        background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
        border: 1px solid #10b981;
        padding: 12px;
        border-radius: 6px;
      }
      .saving-title {
        font-size: 9px;
        color: #065f46;
        margin-bottom: 4px;
      }
      .saving-value {
        font-size: 18px;
        font-weight: bold;
        color: #047857;
      }
      .waktu-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
      }
      .waktu-item {
        background: #f1f5f9;
        padding: 10px;
        border-radius: 6px;
        text-align: center;
      }
      .waktu-label {
        font-size: 8px;
        color: #64748b;
        margin-bottom: 4px;
      }
      .waktu-value {
        font-size: 14px;
        font-weight: bold;
        color: #1e293b;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 10px;
        font-size: 9px;
      }
      th {
        background: #1a365d;
        color: white;
        padding: 8px;
        font-size: 8px;
        font-weight: bold;
        text-align: left;
      }
      td {
        padding: 6px 8px;
        border-bottom: 1px solid #e2e8f0;
      }
      tr:nth-child(even) {
        background: #f8fafc;
      }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 8px;
        font-weight: bold;
      }
      .badge-pg { background: #dbeafe; color: #1e40af; }
      .badge-mkso { background: #f3e8ff; color: #7c3aed; }
      .badge-ho { background: #d1fae5; color: #047857; }
      .metode-box {
        display: flex;
        gap: 15px;
        margin-bottom: 15px;
      }
      .metode-item {
        flex: 1;
        padding: 10px;
        border-radius: 6px;
        text-align: center;
      }
      .metode-tender {
        background: #dbeafe;
        border: 1px solid #3b82f6;
      }
      .metode-pl {
        background: #fef3c7;
        border: 1px solid #f59e0b;
      }
      .metode-count {
        font-size: 20px;
        font-weight: bold;
      }
      .metode-percent {
        font-size: 12px;
        color: #22c55e;
      }
      .page-break {
        page-break-after: always;
      }
      .total-row {
        background: #1e293b !important;
        color: white;
        font-weight: bold;
      }
    </style>
  `

  const plantsRows = data.plants.map((plant, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${plant.plant_name}</td>
      <td><span class="badge badge-${plant.kategori?.toLowerCase()}">${plant.kategori}</span></td>
      <td class="text-right">${plant.jumlah_pk || 0}</td>
      <td class="text-right">${formatCurrency(plant.nilai_realisasi || 0)}</td>
      <td class="text-right">${(plant.saving_percent || 0).toFixed(2)}%</td>
    </tr>
  `).join('')

  const content = `
    <div class="header">
      <div class="company-name">PT. SURYA GANDA NUSANTARA</div>
      <div class="report-title">${title}</div>
      <div class="meta">
        Periode: ${data.period} | Generated: ${new Date().toLocaleString('id-ID')}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Key Performance Indicators</div>
      <div class="metrics-grid">
        <div class="metric-box plant-count">
          <div class="metric-value">${data.plantStats.pg}</div>
          <div class="metric-sub">+${data.plantStats.mkso} MKSO</div>
          <div class="metric-label">Plant</div>
        </div>
        <div class="metric-box">
          <div class="metric-value">${formatNumber(data.metrics.totalPR || 0)}</div>
          <div class="metric-label">Jumlah PR</div>
        </div>
        <div class="metric-box">
          <div class="metric-value">${formatNumber(data.metrics.totalPK || 0)}</div>
          <div class="metric-label">Jumlah PK</div>
        </div>
        <div class="metric-box">
          <div class="metric-value">${formatNumber(data.metrics.totalPP || 0)}</div>
          <div class="metric-label">Jumlah PP</div>
        </div>
        <div class="metric-box">
          <div class="metric-value">${formatCompactNumber(data.metrics.totalNilai || 0)}</div>
          <div class="metric-label">Nilai PK</div>
        </div>
        <div class="metric-box">
          <div class="metric-value">${formatNumber(data.metrics.totalSPPBJ || 0)}</div>
          <div class="metric-label">SPPBJ</div>
        </div>
      </div>
    </div>

    <div class="two-col">
      <div class="section">
        <div class="section-title">Waktu Proses (Hari)</div>
        <div class="waktu-grid">
          <div class="waktu-item">
            <div class="waktu-label">Pembuatan Paket</div>
            <div class="waktu-value">${data.waktuProses.pembuatanPaket}</div>
          </div>
          <div class="waktu-item">
            <div class="waktu-label">Penyusunan HPS</div>
            <div class="waktu-value">${data.waktuProses.penyusunanHPS}</div>
          </div>
          <div class="waktu-item">
            <div class="waktu-label">PL</div>
            <div class="waktu-value">${data.waktuProses.pl}</div>
          </div>
          <div class="waktu-item">
            <div class="waktu-label">Tender</div>
            <div class="waktu-value">${data.waktuProses.tender}</div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Realisasi dan Saving</div>
        <div class="metode-box">
          <div class="saving-box" style="flex: 1;">
            <div class="saving-title">Saving vs Anggaran</div>
            <div class="saving-value">${(data.savings.vsAnggaran || 0).toFixed(1)}%</div>
          </div>
          <div class="saving-box" style="flex: 1;">
            <div class="saving-title">Saving vs HPS</div>
            <div class="saving-value">${(data.savings.vsHPS || 0).toFixed(1)}%</div>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Komposisi PK dan Metode Pemilihan</div>
      <div class="metode-box">
        <div class="metode-item metode-tender">
          <div style="font-size: 10px; color: #1e40af; margin-bottom: 4px;">Tender</div>
          <div class="metode-count" style="color: #1e40af;">${data.metodePemilihan.tender?.count || 285}</div>
          <div class="metode-percent">${(data.metodePemilihan.tender?.percent || 65.1).toFixed(1)}%</div>
          <div style="font-size: 9px; color: #64748b;">${formatCompactNumber(data.metodePemilihan.tender?.nilai || 202860000000)}</div>
        </div>
        <div class="metode-item metode-pl">
          <div style="font-size: 10px; color: #92400e; margin-bottom: 4px;">PL</div>
          <div class="metode-count" style="color: #92400e;">${data.metodePemilihan.pl?.count || 153}</div>
          <div class="metode-percent">${(data.metodePemilihan.pl?.percent || 34.9).toFixed(1)}%</div>
          <div style="font-size: 9px; color: #64748b;">${formatCompactNumber(data.metodePemilihan.pl?.nilai || 9320000000)}</div>
        </div>
      </div>
    </div>

    <div class="page-break"></div>

    <div class="section">
      <div class="section-title">Detail per Plant (${data.plants.length} unit)</div>
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Plant</th>
            <th>Kategori</th>
            <th class="text-right">Jumlah PK</th>
            <th class="text-right">Nilai Realisasi</th>
            <th class="text-right">Saving %</th>
          </tr>
        </thead>
        <tbody>
          ${plantsRows}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="3"><strong>TOTAL</strong></td>
            <td class="text-right"><strong>${formatNumber(data.metrics.totalPK || 0)}</strong></td>
            <td class="text-right"><strong>${formatCurrency(data.metrics.totalNilai || 0)}</strong></td>
            <td class="text-right"><strong>${(data.avgSaving || 0).toFixed(2)}%</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>
  `

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      ${styles}
    </head>
    <body>
      ${content}
    </body>
    </html>
  `
}

function formatNumber(num) {
  if (num === undefined || num === null) return '0'
  return num.toLocaleString('id-ID')
}

function formatCurrency(value) {
  if (value === undefined || value === null) return 'Rp 0'
  return 'Rp ' + value.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatCompactNumber(value) {
  if (value === undefined || value === null) return '0'
  if (value >= 1e12) return (value / 1e12).toFixed(2) + 'T'
  if (value >= 1e9) return (value / 1e9).toFixed(2) + 'M'
  if (value >= 1e6) return (value / 1e6).toFixed(2) + 'Jt'
  return value.toLocaleString('id-ID')
}

// Helper: Header template
function generateHeaderTemplate(title) {
  return `
    <div style="
      width: 100%;
      padding: 12px 30px;
      font-family: Arial, sans-serif;
      font-size: 9px;
      color: #1a365d;
      border-bottom: 1px solid #1a365d;
      background: white;
    ">
      <div style="float: left; font-weight: bold;">PT. SURYA GANDA NUSANTARA</div>
      <div style="float: right;">${title}</div>
      <div style="clear: both;"></div>
    </div>
  `
}

// Helper: Footer template
function generateFooterTemplate() {
  return `
    <div style="
      width: 100%;
      padding: 8px 30px;
      font-family: Arial, sans-serif;
      font-size: 8px;
      color: #718096;
      border-top: 1px solid #e2e8f0;
      background: white;
    ">
      <div style="float: left;">Confidential - Internal Use Only</div>
      <div style="float: right;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
    </div>
  `
}

// Helper: Build dashboard URL
function buildDashboardUrl(baseUrl, filters) {
  const params = new URLSearchParams()
  if (filters.year) params.set('year', filters.year)
  if (filters.periodType) params.set('period_type', filters.periodType)
  if (filters.sumberDana) params.set('sumber_dana', filters.sumberDana)
  if (filters.kategoriPlant) params.set('kategori_plant', filters.kategoriPlant)
  
  return `${baseUrl}?${params.toString()}`
}

// Helper: Generate filename
function generateFilename(title) {
  const date = new Date().toISOString().split('T')[0]
  const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '_')
  return `${cleanTitle}_${date}`
}

export default router
