/**
 * Procurement Dashboard - TradingView Style
 * Using Lightweight Charts + Procurement API
 * With Multi-Series Support (Compare Symbols)
 */
(() => {
  // API Base URL (chartsoftware backend)
  const API_BASE = 'http://localhost:8000';

  // Color palette for multiple series
  const SERIES_COLORS = [
    { line: '#0f766e', area: 'rgba(15, 118, 110, 0.3)' },  // Teal (primary)
    { line: '#e76f51', area: 'rgba(231, 111, 81, 0.3)' },  // Coral
    { line: '#2a9d8f', area: 'rgba(42, 157, 143, 0.3)' },  // Sea green
    { line: '#f4a261', area: 'rgba(244, 162, 97, 0.3)' },  // Sandy
    { line: '#264653', area: 'rgba(38, 70, 83, 0.3)' },    // Charcoal
    { line: '#9b59b6', area: 'rgba(155, 89, 182, 0.3)' },  // Purple
  ];

  // State
  const state = {
    symbols: [],           // Array of symbols (for multi-series)
    currentSymbol: null,   // Currently selected (main) symbol
    timeframe: '1W',
    periodType: 'calendar',
    chartType: 'line',
    year: 2025,
    seriesData: new Map(),
    autoScale: true,
    logScale: false,
    indicators: {
      sma: false,
      ema: false,
      rsi: false
    },
    drawingTool: 'none',
    drawings: [],
    pendingPoint: null
  };

  // Chart instance
  let chart = null;
  let seriesMap = new Map();  // Map of symbol -> series instance
  let smaSeries = null;
  let emaSeries = null;
  let rsiChart = null;
  let rsiSeries = null;
  let drawingCanvas = null;
  let drawingCtx = null;
  let symbolIndex = null;

  // DOM Elements
  const els = {
    symbolSearch: document.getElementById('symbolSearch'),
    searchDropdown: document.getElementById('searchDropdown'),
    chartContainer: document.getElementById('chartContainer'),
    chartTitle: document.getElementById('chartTitle'),
    chartSubtitle: document.getElementById('chartSubtitle'),
    selectedSymbolName: document.getElementById('selectedSymbolName'),
    selectedSymbolDesc: document.getElementById('selectedSymbolDesc'),
    yearSelect: document.getElementById('year'),
    summaryTotal: document.querySelector('[data-summary="total"]'),
    summaryPeak: document.querySelector('[data-summary="peak"]'),
    summaryPeakLabel: document.querySelector('[data-summary="peak-label"]'),
    summaryLatest: document.querySelector('[data-summary="latest"]'),
    summaryTrend: document.querySelector('[data-summary="trend"]'),
    summarySeriesList: document.getElementById('summarySeriesList'),
    badgePeriod: document.querySelector('[data-badge="period"]'),
    badgeYear: document.querySelector('[data-badge="year"]'),
    badgeTimeframe: document.querySelector('[data-badge="timeframe"]'),
    toolFit: document.getElementById('toolFit'),
    toolAutoScale: document.getElementById('toolAutoScale'),
    toolLogScale: document.getElementById('toolLogScale'),
    toolExport: document.getElementById('toolExport'),
    toolZoomIn: document.getElementById('toolZoomIn'),
    toolZoomOut: document.getElementById('toolZoomOut'),
    toolSMA: document.getElementById('toolSMA'),
    toolEMA: document.getElementById('toolEMA'),
    toolRSI: document.getElementById('toolRSI'),
    toolHLine: document.getElementById('toolHLine'),
    toolVLine: document.getElementById('toolVLine'),
    toolTrend: document.getElementById('toolTrend'),
    toolClearDraw: document.getElementById('toolClearDraw'),
    templateSelect: document.getElementById('templateSelect'),
    toolTemplateSave: document.getElementById('toolTemplateSave'),
    toolTemplateLoad: document.getElementById('toolTemplateLoad'),
    toolTemplateDelete: document.getElementById('toolTemplateDelete'),
    rsiPanel: document.getElementById('rsiPanel'),
    rsiContainer: document.getElementById('rsiContainer')
  };

  // ==================== Chart Functions ====================

  function initChart() {
    if (chart) {
      chart.remove();
    }

    seriesMap.clear();
    smaSeries = null;
    emaSeries = null;

    chart = LightweightCharts.createChart(els.chartContainer, {
      width: els.chartContainer.clientWidth,
      height: 360,
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#5b6b63',
        fontFamily: "'Source Sans 3', sans-serif"
      },
      grid: {
        vertLines: { color: 'rgba(20, 32, 25, 0.06)' },
        horzLines: { color: 'rgba(20, 32, 25, 0.06)' }
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
        vertLine: {
          color: '#0f766e',
          labelBackgroundColor: '#0f766e'
        },
        horzLine: {
          color: '#0f766e',
          labelBackgroundColor: '#0f766e'
        }
      },
      rightPriceScale: {
        borderColor: 'rgba(20, 32, 25, 0.12)',
        visible: true
      },
      leftPriceScale: {
        borderColor: 'rgba(20, 32, 25, 0.12)',
        visible: false  // Will be enabled when comparing symbols with different scales
      },
      timeScale: {
        borderColor: 'rgba(20, 32, 25, 0.12)',
        timeVisible: true,
        secondsVisible: false
      }
    });

    applyScaleOptions();

    initDrawingLayer();
    bindChartEvents();

    // Responsive resize
    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length > 0) {
        const { width } = entries[0].contentRect;
        chart.applyOptions({ width });
        resizeDrawingLayer();
        if (rsiChart && els.rsiContainer) {
          rsiChart.applyOptions({ width: els.rsiContainer.clientWidth });
        }
      }
    });
    resizeObserver.observe(els.chartContainer);
  }

  function bindChartEvents() {
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (rsiChart && range) {
        rsiChart.timeScale().setVisibleLogicalRange(range);
      }
      renderDrawings();
    });
  }

  function getPrimarySeries() {
    if (!state.currentSymbol) return null;
    return seriesMap.get(state.currentSymbol.symbol);
  }

  function createSeriesForSymbol(symbol, colorIndex = 0) {
    const colors = SERIES_COLORS[colorIndex % SERIES_COLORS.length];
    let series;

    if (state.chartType === 'candlestick') {
      if (colorIndex === 0) {
        // Candlestick only for primary series
        series = chart.addCandlestickSeries({
          upColor: colors.line,
          downColor: '#e76f51',
          borderUpColor: colors.line,
          borderDownColor: '#e76f51',
          wickUpColor: colors.line,
          wickDownColor: '#e76f51',
          priceScaleId: 'right'
        });
      } else {
        const scaleId = colorIndex === 1 ? 'left' : 'right';
        series = chart.addLineSeries({
          color: colors.line,
          lineWidth: 1,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 3,
          priceScaleId: scaleId,
          title: symbol.name.substring(0, 20)
        });
      }
    } else if (state.chartType === 'area') {
      const scaleId = colorIndex === 0 ? 'right' : (colorIndex === 1 ? 'left' : 'right');
      series = chart.addAreaSeries({
        lineColor: colors.line,
        topColor: colors.area,
        bottomColor: 'rgba(15, 118, 110, 0.05)',
        lineWidth: 2,
        priceScaleId: scaleId
      });

      if (colorIndex === 1) {
        chart.applyOptions({
          leftPriceScale: { visible: true }
        });
      }
    } else {
      // Line series (default, and for all compare series)
      const scaleId = colorIndex === 0 ? 'right' : (colorIndex === 1 ? 'left' : 'right');

      series = chart.addLineSeries({
        color: colors.line,
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        priceScaleId: scaleId,
        title: symbol.name.substring(0, 20)  // Short name for legend
      });

      // Enable left scale if we have compare series
      if (colorIndex === 1) {
        chart.applyOptions({
          leftPriceScale: { visible: true }
        });
      }
    }

    return series;
  }

  function ensureRsiChart() {
    if (!els.rsiContainer) return;
    if (rsiChart) return;

    els.rsiPanel.hidden = false;

    rsiChart = LightweightCharts.createChart(els.rsiContainer, {
      width: els.rsiContainer.clientWidth,
      height: 120,
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#5b6b63',
        fontFamily: "'Source Sans 3', sans-serif"
      },
      grid: {
        vertLines: { color: 'rgba(20, 32, 25, 0.06)' },
        horzLines: { color: 'rgba(20, 32, 25, 0.06)' }
      },
      rightPriceScale: {
        borderColor: 'rgba(20, 32, 25, 0.12)',
        visible: true
      },
      timeScale: {
        borderColor: 'rgba(20, 32, 25, 0.12)',
        timeVisible: true,
        secondsVisible: false
      }
    });

    rsiSeries = rsiChart.addLineSeries({
      color: '#264653',
      lineWidth: 2
    });

    rsiSeries.createPriceLine({
      price: 70,
      color: 'rgba(231, 111, 81, 0.6)',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: '70'
    });

    rsiSeries.createPriceLine({
      price: 30,
      color: 'rgba(42, 157, 143, 0.6)',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: '30'
    });
  }

  function destroyRsiChart() {
    if (rsiChart) {
      rsiChart.remove();
      rsiChart = null;
      rsiSeries = null;
    }
    if (els.rsiPanel) {
      els.rsiPanel.hidden = true;
    }
  }

  async function loadSymbolData(symbol, series, isPrimary = false) {
    try {
      const url = `${API_BASE}/api/procurement/data/${symbol.symbol}?timeframe=${state.timeframe}&limit=200&period_type=${state.periodType}&year=${state.year}`;
      const response = await fetch(url);
      const result = await response.json();

      if (result.status === 'success' && result.data.length > 0) {
        let chartData;

        if (state.chartType === 'candlestick' && isPrimary) {
          chartData = result.data.map(d => ({
            time: d.time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close
          }));
        } else {
          chartData = result.data.map(d => ({
            time: d.time,
            value: d.close
          }));
        }

        series.setData(chartData);
        return result.data;
      }
      return [];
    } catch (error) {
      console.error(`Error loading data for ${symbol.symbol}:`, error);
      return [];
    }
  }

  async function loadAllChartData() {
    if (state.symbols.length === 0) {
      return;
    }

    // Clear existing series
    seriesMap.forEach((series) => {
      chart.removeSeries(series);
    });
    seriesMap.clear();
    state.seriesData.clear();

    // Load data for each symbol
    let primaryData = null;

    for (let i = 0; i < state.symbols.length; i++) {
      const symbol = state.symbols[i];
      if (i === 0) {
        state.currentSymbol = symbol;
      }

      const series = createSeriesForSymbol(symbol, i);
      seriesMap.set(symbol.symbol, series);

      const data = await loadSymbolData(symbol, series, i === 0);
      state.seriesData.set(symbol.symbol, data);

      if (i === 0) {
        primaryData = data;
      }
    }

    chart.timeScale().fitContent();

    // Update summary for primary symbol
    if (primaryData && primaryData.length > 0) {
      updateSummary(primaryData);
    }

    updateIndicators();
    renderDrawings();

    // Update total list (per-series + combined)
    updateTotalsSummary();

    // Update chart title
    updateChartTitle();
  }

  function applyScaleOptions() {
    if (!chart) return;
    const scaleMode = (window.LightweightCharts && LightweightCharts.PriceScaleMode)
      ? (state.logScale ? LightweightCharts.PriceScaleMode.Logarithmic : LightweightCharts.PriceScaleMode.Normal)
      : undefined;

    const scaleOptions = {
      autoScale: state.autoScale
    };

    if (scaleMode !== undefined) {
      scaleOptions.mode = scaleMode;
    }

    chart.applyOptions({
      rightPriceScale: scaleOptions,
      leftPriceScale: scaleOptions
    });
  }

  function updateChartTitle() {
    if (state.symbols.length === 0) return;

    if (state.symbols.length === 1) {
      els.chartTitle.textContent = state.symbols[0].name;
    } else {
      const shortNames = state.symbols.map((s) => {
        let name = s.name || '';
        if (name.toLowerCase().startsWith('jumlah ')) {
          name = name.slice(7).trim();
        } else if (name.toLowerCase().startsWith('total ')) {
          name = name.slice(6).trim();
        }
        return name || s.name;
      });

      const counts = shortNames.reduce((acc, name) => {
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {});

      const display = shortNames.map((name, idx) => {
        if (counts[name] > 1) return state.symbols[idx].name;
        return name;
      });

      els.chartTitle.textContent = display.join(' vs ');
    }

    const unitText = state.currentSymbol?.unit || '';
    let subtitle = `${unitText} - ${getTimeframeLabel(state.timeframe)}`;
    if (state.chartType === 'candlestick' && state.symbols.length > 1) {
      subtitle += ' • Candle hanya untuk 1 series';
    }
    els.chartSubtitle.textContent = subtitle;
  }

  function updateSummary(data) {
    if (!data || data.length === 0) return;

    const values = data.map(d => d.close);
    const total = values.reduce((sum, v) => sum + v, 0);
    const peak = Math.max(...values);
    const peakIndex = values.indexOf(peak);
    const latest = values[values.length - 1];
    const previous = values.length > 1 ? values[values.length - 2] : latest;
    const change = previous ? ((latest - previous) / previous) * 100 : 0;

    const isRupiah = state.currentSymbol?.unit === 'Rp';

    if (els.summaryTotal && state.symbols.length <= 1) {
      els.summaryTotal.textContent = formatValue(total, isRupiah);
    }
    if (els.summaryPeak) {
      els.summaryPeak.textContent = formatValue(peak, isRupiah);
    }
    if (els.summaryPeakLabel) {
      const peakDate = new Date(data[peakIndex].time * 1000);
      els.summaryPeakLabel.textContent = peakDate.toLocaleDateString('id-ID', {
        month: 'short',
        year: 'numeric'
      });
    }
    if (els.summaryLatest) {
      els.summaryLatest.textContent = formatValue(latest, isRupiah);
    }
    if (els.summaryTrend) {
      els.summaryTrend.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
      els.summaryTrend.classList.toggle('trend-down', change < 0);
    }
  }

  function updateTotalsSummary() {
    if (!els.summaryTotal) return;

    if (!state.symbols || state.symbols.length === 0) {
      els.summaryTotal.textContent = '--';
      if (els.summarySeriesList) els.summarySeriesList.innerHTML = '';
      return;
    }

    const rows = state.symbols.map((symbol, index) => {
      const data = state.seriesData.get(symbol.symbol) || [];
      const total = data.reduce((sum, d) => sum + (d.close || 0), 0);
      return {
        symbol,
        total,
        color: SERIES_COLORS[index % SERIES_COLORS.length].line
      };
    });

    const units = new Set(rows.map(r => r.symbol.unit || ''));
    const sameUnit = units.size <= 1;
    const combinedTotal = sameUnit
      ? rows.reduce((sum, r) => sum + r.total, 0)
      : null;

    const combinedIsRupiah = rows[0]?.symbol.unit === 'Rp';
    els.summaryTotal.textContent = sameUnit
      ? formatValue(combinedTotal, combinedIsRupiah)
      : '--';

    if (!els.summarySeriesList) return;

    if (rows.length <= 1) {
      els.summarySeriesList.innerHTML = '';
      return;
    }

    const listHtml = rows.map((r) => `
      <div class="summary-series-row">
        <span class="summary-series-dot" style="background:${r.color}"></span>
        <span class="summary-series-name">${r.symbol.name}</span>
        <span class="summary-series-value">${formatValue(r.total, r.symbol.unit === 'Rp')}</span>
      </div>
    `).join('');

    const combinedLabel = sameUnit ? 'Gabungan' : 'Gabungan (beda unit)';
    const combinedValue = sameUnit ? formatValue(combinedTotal, combinedIsRupiah) : '--';

    els.summarySeriesList.innerHTML = `
      ${listHtml}
      <div class="summary-series-row summary-series-combined">
        <span class="summary-series-dot is-combined"></span>
        <span class="summary-series-name">${combinedLabel}</span>
        <span class="summary-series-value">${combinedValue}</span>
      </div>
    `;
  }

  function formatValue(value, isRupiah) {
    if (isRupiah) {
      if (value >= 1e12) return `Rp ${(value / 1e12).toFixed(1)}T`;
      if (value >= 1e9) return `Rp ${(value / 1e9).toFixed(1)}M`;
      if (value >= 1e6) return `Rp ${(value / 1e6).toFixed(1)}Jt`;
      return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
    }
    return Math.round(value).toLocaleString('id-ID');
  }

  function computeSMA(data, period = 14) {
    const result = [];
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i].close;
      if (i >= period) {
        sum -= data[i - period].close;
      }
      if (i >= period - 1) {
        result.push({ time: data[i].time, value: sum / period });
      }
    }
    return result;
  }

  function computeEMA(data, period = 14) {
    const result = [];
    if (data.length === 0) return result;
    const k = 2 / (period + 1);
    let ema = data[0].close;
    for (let i = 0; i < data.length; i++) {
      const price = data[i].close;
      ema = i === 0 ? price : (price - ema) * k + ema;
      if (i >= period - 1) {
        result.push({ time: data[i].time, value: ema });
      }
    }
    return result;
  }

  function computeRSI(data, period = 14) {
    const result = [];
    if (data.length <= period) return result;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = data[i].close - data[i - 1].close;
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;
    let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    let rsi = 100 - (100 / (1 + rs));
    result.push({ time: data[period].time, value: rsi });

    for (let i = period + 1; i < data.length; i++) {
      const diff = data[i].close - data[i - 1].close;
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi = 100 - (100 / (1 + rs));

      result.push({ time: data[i].time, value: rsi });
    }

    return result;
  }

  function updateIndicators() {
    const primaryData = state.currentSymbol ? (state.seriesData.get(state.currentSymbol.symbol) || []) : [];
    const primarySeries = getPrimarySeries();

    if (!primarySeries || primaryData.length === 0) {
      if (smaSeries) { chart.removeSeries(smaSeries); smaSeries = null; }
      if (emaSeries) { chart.removeSeries(emaSeries); emaSeries = null; }
      destroyRsiChart();
      return;
    }

    if (state.indicators.sma) {
      if (!smaSeries) {
        smaSeries = chart.addLineSeries({
          color: '#264653',
          lineWidth: 2,
          priceScaleId: 'right'
        });
      }
      smaSeries.setData(computeSMA(primaryData, 14));
    } else if (smaSeries) {
      chart.removeSeries(smaSeries);
      smaSeries = null;
    }

    if (state.indicators.ema) {
      if (!emaSeries) {
        emaSeries = chart.addLineSeries({
          color: '#e76f51',
          lineWidth: 2,
          priceScaleId: 'right'
        });
      }
      emaSeries.setData(computeEMA(primaryData, 14));
    } else if (emaSeries) {
      chart.removeSeries(emaSeries);
      emaSeries = null;
    }

    if (state.indicators.rsi) {
      ensureRsiChart();
      if (rsiSeries) {
        rsiSeries.setData(computeRSI(primaryData, 14));
      }
      if (rsiChart) {
        const range = chart.timeScale().getVisibleLogicalRange();
        if (range) rsiChart.timeScale().setVisibleLogicalRange(range);
      }
    } else {
      destroyRsiChart();
    }
  }

  function exportChartImage() {
    if (!chart) return;

    let canvas = null;
    if (typeof chart.takeScreenshot === 'function') {
      canvas = chart.takeScreenshot();
    } else {
      canvas = els.chartContainer ? els.chartContainer.querySelector('canvas') : null;
    }

    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'procurement-chart.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function getTemplateStore() {
    try {
      return JSON.parse(localStorage.getItem('procurementTemplates') || '{}');
    } catch (e) {
      return {};
    }
  }

  function saveTemplateStore(store) {
    localStorage.setItem('procurementTemplates', JSON.stringify(store));
  }

  function getTemplateNames() {
    return Object.keys(getTemplateStore()).sort();
  }

  function refreshTemplateOptions() {
    if (!els.templateSelect) return;
    const current = els.templateSelect.value;
    const names = getTemplateNames();
    const options = ['<option value="">-- pilih template --</option>']
      .concat(names.map(name => `<option value="${name}">${name}</option>`));
    els.templateSelect.innerHTML = options.join('');
    if (names.includes(current)) {
      els.templateSelect.value = current;
    }

    const hasTemplates = names.length > 0;
    if (els.toolTemplateLoad) els.toolTemplateLoad.disabled = !hasTemplates;
    if (els.toolTemplateDelete) els.toolTemplateDelete.disabled = !hasTemplates;
  }

  function getDefaultTemplateName() {
    const names = getTemplateNames();
    let i = 1;
    while (names.includes(`Template ${i}`)) i += 1;
    return `Template ${i}`;
  }

  async function ensureSymbolIndex() {
    if (symbolIndex) return symbolIndex;
    try {
      const response = await fetch(`${API_BASE}/api/procurement/symbols`);
      const result = await response.json();
      if (result.status === 'success') {
        symbolIndex = new Map(result.data.map(s => [s.symbol, s]));
      } else {
        symbolIndex = new Map();
      }
    } catch (e) {
      symbolIndex = new Map();
    }
    return symbolIndex;
  }

  async function applyTemplate(name) {
    const store = getTemplateStore();
    const template = store[name];
    if (!template || !Array.isArray(template.symbols)) return;

    const index = await ensureSymbolIndex();
    const symbols = template.symbols.map(code => index.get(code)).filter(Boolean);

    if (symbols.length === 0) {
      alert('Template tidak bisa dipakai (symbol tidak ditemukan).');
      return;
    }

    state.symbols = symbols;
    updateSelectedSymbolsDisplay();
    loadAllChartData();
  }

  function saveCurrentTemplate() {
    if (!state.symbols || state.symbols.length === 0) {
      alert('Pilih minimal 1 symbol sebelum menyimpan template.');
      return;
    }

    const defaultName = getDefaultTemplateName();
    const name = prompt('Nama template:', defaultName);
    if (!name) return;

    const store = getTemplateStore();
    store[name] = {
      symbols: state.symbols.map(s => s.symbol),
      createdAt: new Date().toISOString()
    };
    saveTemplateStore(store);
    refreshTemplateOptions();
    if (els.templateSelect) els.templateSelect.value = name;
  }

  function deleteCurrentTemplate() {
    if (!els.templateSelect) return;
    const name = els.templateSelect.value;
    if (!name) return;
    const ok = confirm(`Hapus template "${name}"?`);
    if (!ok) return;
    const store = getTemplateStore();
    delete store[name];
    saveTemplateStore(store);
    refreshTemplateOptions();
  }

  function zoomTimeScale(factor) {
    if (!chart) return;
    const range = chart.timeScale().getVisibleLogicalRange();
    if (!range) return;
    const mid = (range.from + range.to) / 2;
    const newRange = {
      from: mid + (range.from - mid) * factor,
      to: mid + (range.to - mid) * factor
    };
    chart.timeScale().setVisibleLogicalRange(newRange);
  }

  function initDrawingLayer() {
    if (!els.chartContainer || drawingCanvas) return;

    drawingCanvas = document.createElement('canvas');
    drawingCanvas.className = 'drawing-layer';
    els.chartContainer.appendChild(drawingCanvas);

    drawingCtx = drawingCanvas.getContext('2d');
    resizeDrawingLayer();

    drawingCanvas.addEventListener('click', handleDrawingClick);
  }

  function resizeDrawingLayer() {
    if (!drawingCanvas || !els.chartContainer) return;
    const rect = els.chartContainer.getBoundingClientRect();
    drawingCanvas.width = rect.width * window.devicePixelRatio;
    drawingCanvas.height = rect.height * window.devicePixelRatio;
    drawingCanvas.style.width = `${rect.width}px`;
    drawingCanvas.style.height = `${rect.height}px`;
    if (drawingCtx) {
      drawingCtx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    }
    renderDrawings();
  }

  function setDrawingTool(tool) {
    state.drawingTool = tool;
    state.pendingPoint = null;

    if (drawingCanvas) {
      drawingCanvas.style.pointerEvents = tool === 'none' ? 'none' : 'auto';
      drawingCanvas.style.cursor = tool === 'none' ? 'default' : 'crosshair';
    }

    const buttons = [
      { el: els.toolHLine, name: 'hline' },
      { el: els.toolVLine, name: 'vline' },
      { el: els.toolTrend, name: 'trend' }
    ];
    buttons.forEach(({ el, name }) => {
      if (el) el.classList.toggle('is-active', tool === name);
    });
  }

  function handleDrawingClick(event) {
    if (state.drawingTool === 'none') return;
    const primarySeries = getPrimarySeries();
    if (!primarySeries) return;

    const rect = drawingCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const time = chart.timeScale().coordinateToTime(x);
    const price = primarySeries.coordinateToPrice(y);
    if (time === null || price === null) return;

    if (state.drawingTool === 'hline') {
      state.drawings.push({ type: 'hline', price });
    } else if (state.drawingTool === 'vline') {
      state.drawings.push({ type: 'vline', time });
    } else if (state.drawingTool === 'trend') {
      if (!state.pendingPoint) {
        state.pendingPoint = { time, price };
      } else {
        state.drawings.push({
          type: 'trend',
          p1: state.pendingPoint,
          p2: { time, price }
        });
        state.pendingPoint = null;
      }
    }

    renderDrawings();
  }

  function clearDrawings() {
    state.drawings = [];
    state.pendingPoint = null;
    renderDrawings();
  }

  function renderDrawings() {
    if (!drawingCanvas || !drawingCtx || !chart) return;
    const primarySeries = getPrimarySeries();
    if (!primarySeries) {
      drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
      return;
    }

    drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    drawingCtx.lineWidth = 1;
    drawingCtx.strokeStyle = 'rgba(20, 32, 25, 0.7)';
    drawingCtx.setLineDash([4, 4]);

    const width = drawingCanvas.width / window.devicePixelRatio;
    const height = drawingCanvas.height / window.devicePixelRatio;

    state.drawings.forEach((draw) => {
      if (draw.type === 'hline') {
        const y = primarySeries.priceToCoordinate(draw.price);
        if (y === null) return;
        drawingCtx.beginPath();
        drawingCtx.moveTo(0, y);
        drawingCtx.lineTo(width, y);
        drawingCtx.stroke();
      } else if (draw.type === 'vline') {
        const x = chart.timeScale().timeToCoordinate(draw.time);
        if (x === null) return;
        drawingCtx.beginPath();
        drawingCtx.moveTo(x, 0);
        drawingCtx.lineTo(x, height);
        drawingCtx.stroke();
      } else if (draw.type === 'trend') {
        const x1 = chart.timeScale().timeToCoordinate(draw.p1.time);
        const y1 = primarySeries.priceToCoordinate(draw.p1.price);
        const x2 = chart.timeScale().timeToCoordinate(draw.p2.time);
        const y2 = primarySeries.priceToCoordinate(draw.p2.price);
        if (x1 === null || y1 === null || x2 === null || y2 === null) return;
        drawingCtx.beginPath();
        drawingCtx.moveTo(x1, y1);
        drawingCtx.lineTo(x2, y2);
        drawingCtx.stroke();
      }
    });

    if (state.pendingPoint) {
      const x = chart.timeScale().timeToCoordinate(state.pendingPoint.time);
      const y = primarySeries.priceToCoordinate(state.pendingPoint.price);
      if (x !== null && y !== null) {
        drawingCtx.setLineDash([]);
        drawingCtx.beginPath();
        drawingCtx.arc(x, y, 3, 0, Math.PI * 2);
        drawingCtx.fillStyle = 'rgba(20, 32, 25, 0.8)';
        drawingCtx.fill();
        drawingCtx.setLineDash([4, 4]);
      }
    }
  }

  function getTimeframeLabel(tf) {
    const labels = { '1D': 'Daily', '1W': 'Weekly', '1M': 'Monthly', '1Y': 'Yearly' };
    return labels[tf] || tf;
  }

  // ==================== Symbol Management ====================

  function addSymbol(symbol) {
    // Check if already added
    if (state.symbols.find(s => s.symbol === symbol.symbol)) {
      console.log('Symbol already added:', symbol.symbol);
      return;
    }

    // Limit to 5 symbols
    if (state.symbols.length >= 5) {
      alert('Maksimal 5 symbol dapat ditampilkan bersamaan');
      return;
    }

    state.symbols.push(symbol);

    // Update selected symbol display
    updateSelectedSymbolsDisplay();

    // Reload chart
    loadAllChartData();
  }

  function removeSymbol(symbolCode) {
    state.symbols = state.symbols.filter(s => s.symbol !== symbolCode);

    // Update display
    updateSelectedSymbolsDisplay();

    // Reload chart
    if (state.symbols.length > 0) {
      loadAllChartData();
    } else {
      // Clear chart
      seriesMap.forEach((series) => {
        chart.removeSeries(series);
      });
      seriesMap.clear();
      els.chartTitle.textContent = 'Pilih Symbol';
      els.chartSubtitle.textContent = 'Ketik di search untuk mencari';
    }
  }

  function clearAllSymbols() {
    state.symbols = [];
    state.currentSymbol = null;
    seriesMap.forEach((series) => {
      chart.removeSeries(series);
    });
    seriesMap.clear();
    updateSelectedSymbolsDisplay();
  }

  function updateSelectedSymbolsDisplay() {
    const container = document.getElementById('selectedSymbol');
    if (!container) return;

    if (state.symbols.length === 0) {
      container.innerHTML = `
        <div class="symbol-icon">📊</div>
        <div class="symbol-info">
          <div class="symbol-name">Pilih Symbol</div>
          <div class="symbol-desc">Ketik di search untuk mencari</div>
        </div>
      `;
      return;
    }

    // Show all selected symbols with color indicators
    const symbolsHtml = state.symbols.map((s, i) => {
      const color = SERIES_COLORS[i % SERIES_COLORS.length].line;
      return `
        <div class="selected-symbol-item" data-symbol="${s.symbol}">
          <span class="symbol-color-dot" style="background-color: ${color}"></span>
          <span class="symbol-item-name">${s.name}</span>
          <button class="symbol-remove-btn" data-symbol="${s.symbol}" title="Hapus">×</button>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="selected-symbols-list">
        ${symbolsHtml}
      </div>
      ${state.symbols.length > 1 ? '<button class="clear-all-btn" id="clearAllBtn">Hapus Semua</button>' : ''}
    `;

    // Add remove handlers
    container.querySelectorAll('.symbol-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeSymbol(btn.dataset.symbol);
      });
    });

    const clearBtn = document.getElementById('clearAllBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', clearAllSymbols);
    }
  }

  // ==================== Search Functions ====================

  let searchDebounce = null;

  async function searchSymbols(query) {
    if (query.length < 1) {
      closeSearchDropdown();
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/procurement/search?q=${encodeURIComponent(query)}&limit=15`);
      const result = await response.json();

      if (result.status === 'success') {
        renderSearchResults(result.data);
      }
    } catch (error) {
      console.error('Search error:', error);
      renderSearchError();
    }
  }

  function renderSearchResults(symbols) {
    if (symbols.length === 0) {
      els.searchDropdown.innerHTML = `
        <div class="search-empty">Tidak ditemukan</div>
      `;
    } else {
      // Check which symbols are already added
      const addedSymbols = new Set(state.symbols.map(s => s.symbol));

      els.searchDropdown.innerHTML = symbols.map((s, i) => {
        const isAdded = addedSymbols.has(s.symbol);
        return `
          <div class="search-item${i === 0 ? ' selected' : ''}${isAdded ? ' added' : ''}" data-index="${i}">
            <span class="search-item-icon">${getCategoryIcon(s.category)}</span>
            <div class="search-item-info">
              <div class="search-item-name">${s.name}</div>
              <div class="search-item-desc">${s.description || ''}</div>
            </div>
            <span class="search-item-badge">${formatCategory(s.category)}</span>
            ${isAdded ? '<span class="search-item-added">✓</span>' : ''}
          </div>
        `;
      }).join('');

      // Add click handlers
      els.searchDropdown.querySelectorAll('.search-item').forEach((item, index) => {
        item.addEventListener('click', () => {
          selectSymbol(symbols[index]);
        });
      });
    }

    openSearchDropdown();
  }

  function renderSearchError() {
    els.searchDropdown.innerHTML = `
      <div class="search-empty">Error loading results</div>
    `;
    openSearchDropdown();
  }

  function getCategoryIcon(category) {
    const icons = {
      'metric': 'M',
      'plant': 'P',
      'sumber_dana': '$',
      'kategori': 'K'
    };
    return icons[category] || '.';
  }

  function formatCategory(category) {
    const labels = {
      'metric': 'Metric',
      'plant': 'Plant',
      'sumber_dana': 'Dana',
      'kategori': 'Kategori'
    };
    return labels[category] || category;
  }

  function selectSymbol(symbol) {
    els.symbolSearch.value = '';
    closeSearchDropdown();
    addSymbol(symbol);
  }

  function openSearchDropdown() {
    els.searchDropdown.classList.add('open');
  }

  function closeSearchDropdown() {
    els.searchDropdown.classList.remove('open');
  }

  // ==================== Segmented Controls ====================

  function initSegmentedControl(controlName, onChange) {
    const control = document.querySelector(`[data-control="${controlName}"]`);
    if (!control) return;

    control.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        control.querySelectorAll('button').forEach(b => {
          b.classList.remove('is-active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');

        onChange(btn.dataset.value);
      });
    });
  }

  // ==================== Event Handlers ====================

  function attachEvents() {
    // Search input
    els.symbolSearch.addEventListener('input', (e) => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        searchSymbols(e.target.value.trim());
      }, 300);
    });

    els.symbolSearch.addEventListener('focus', () => {
      if (els.symbolSearch.value.length >= 1) {
        searchSymbols(els.symbolSearch.value.trim());
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!els.symbolSearch.contains(e.target) && !els.searchDropdown.contains(e.target)) {
        closeSearchDropdown();
      }
    });

    // Keyboard navigation for search
    els.symbolSearch.addEventListener('keydown', (e) => {
      if (!els.searchDropdown.classList.contains('open')) return;

      const items = els.searchDropdown.querySelectorAll('.search-item');
      const selected = els.searchDropdown.querySelector('.search-item.selected');
      const currentIndex = Array.from(items).indexOf(selected);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, items.length - 1);
        items.forEach((item, i) => item.classList.toggle('selected', i === nextIndex));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        items.forEach((item, i) => item.classList.toggle('selected', i === prevIndex));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selected) selected.click();
      } else if (e.key === 'Escape') {
        closeSearchDropdown();
      }
    });

    // Year select
    if (els.yearSelect) {
      els.yearSelect.addEventListener('change', (e) => {
        state.year = parseInt(e.target.value);
        if (els.badgeYear) els.badgeYear.textContent = state.year;
        loadAllChartData();
      });
    }

    // Period type (Kalender / Anggaran)
    initSegmentedControl('periodType', (value) => {
      state.periodType = value;
      if (els.badgePeriod) els.badgePeriod.textContent = value === 'calendar' ? 'Kalender' : 'Anggaran';
      loadAllChartData();
    });

    // Timeframe
    initSegmentedControl('timeframe', (value) => {
      state.timeframe = value;
      if (els.badgeTimeframe) els.badgeTimeframe.textContent = getTimeframeLabel(value);
      loadAllChartData();
    });

    // Chart type
    initSegmentedControl('chartType', (value) => {
      state.chartType = value;
      loadAllChartData();
    });

    // Chart tools
    if (els.toolFit) {
      els.toolFit.addEventListener('click', () => {
        if (chart) chart.timeScale().fitContent();
      });
    }

    if (els.toolAutoScale) {
      els.toolAutoScale.addEventListener('click', () => {
        state.autoScale = !state.autoScale;
        els.toolAutoScale.classList.toggle('is-active', state.autoScale);
        applyScaleOptions();
      });
    }

    if (els.toolLogScale) {
      els.toolLogScale.addEventListener('click', () => {
        state.logScale = !state.logScale;
        els.toolLogScale.classList.toggle('is-active', state.logScale);
        applyScaleOptions();
      });
    }

    if (els.toolExport) {
      els.toolExport.addEventListener('click', exportChartImage);
    }

    if (els.toolZoomIn) {
      els.toolZoomIn.addEventListener('click', () => zoomTimeScale(0.8));
    }

    if (els.toolZoomOut) {
      els.toolZoomOut.addEventListener('click', () => zoomTimeScale(1.25));
    }

    if (els.toolSMA) {
      els.toolSMA.addEventListener('click', () => {
        state.indicators.sma = !state.indicators.sma;
        els.toolSMA.classList.toggle('is-active', state.indicators.sma);
        updateIndicators();
      });
    }

    if (els.toolEMA) {
      els.toolEMA.addEventListener('click', () => {
        state.indicators.ema = !state.indicators.ema;
        els.toolEMA.classList.toggle('is-active', state.indicators.ema);
        updateIndicators();
      });
    }

    if (els.toolRSI) {
      els.toolRSI.addEventListener('click', () => {
        state.indicators.rsi = !state.indicators.rsi;
        els.toolRSI.classList.toggle('is-active', state.indicators.rsi);
        updateIndicators();
      });
    }

    if (els.toolHLine) {
      els.toolHLine.addEventListener('click', () => {
        setDrawingTool(state.drawingTool === 'hline' ? 'none' : 'hline');
      });
    }

    if (els.toolVLine) {
      els.toolVLine.addEventListener('click', () => {
        setDrawingTool(state.drawingTool === 'vline' ? 'none' : 'vline');
      });
    }

    if (els.toolTrend) {
      els.toolTrend.addEventListener('click', () => {
        setDrawingTool(state.drawingTool === 'trend' ? 'none' : 'trend');
      });
    }

    if (els.toolClearDraw) {
      els.toolClearDraw.addEventListener('click', clearDrawings);
    }

    if (els.toolTemplateSave) {
      els.toolTemplateSave.addEventListener('click', saveCurrentTemplate);
    }

    if (els.toolTemplateLoad) {
      els.toolTemplateLoad.addEventListener('click', () => {
        if (els.templateSelect && els.templateSelect.value) {
          applyTemplate(els.templateSelect.value);
        }
      });
    }

    if (els.toolTemplateDelete) {
      els.toolTemplateDelete.addEventListener('click', deleteCurrentTemplate);
    }
  }

  // ==================== Init ====================

  function init() {
    initChart();
    attachEvents();
    updateSelectedSymbolsDisplay();

    // Set initial badge values
    if (els.badgePeriod) els.badgePeriod.textContent = 'Kalender';
    if (els.badgeYear) els.badgeYear.textContent = '2025';
    if (els.badgeTimeframe) els.badgeTimeframe.textContent = 'Weekly';
    if (els.toolAutoScale) els.toolAutoScale.classList.toggle('is-active', state.autoScale);
    if (els.toolLogScale) els.toolLogScale.classList.toggle('is-active', state.logScale);
    if (els.toolSMA) els.toolSMA.classList.toggle('is-active', state.indicators.sma);
    if (els.toolEMA) els.toolEMA.classList.toggle('is-active', state.indicators.ema);
    if (els.toolRSI) els.toolRSI.classList.toggle('is-active', state.indicators.rsi);
    setDrawingTool('none');
    refreshTemplateOptions();
  }

  // Start when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
