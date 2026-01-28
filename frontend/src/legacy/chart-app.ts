// @ts-nocheck
import { createChart, CrosshairMode, PriceScaleMode } from 'lightweight-charts'

let initialized = false

export function initChartApp() {
  if (initialized) return
  initialized = true
  const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

  const state = {
    symbols: [],
    selectedSymbols: [],
    periodType: 'calendar',
    year: 2025,
    chartType: 'line',
    seriesData: new Map(),
    seriesConfig: new Map(),
    normalize: false,
    autoScale: true,
    logScale: false,
    dockToolbar: true,
    appearance: {
      showGrid: true,
      showCrosshair: true,
      showLeftScale: false,
      lineWidth: 2,
      areaOpacity: 0.2
    },
    settings: {
      showHeader: true,
      showToolbar: true,
      showSummary: true,
      showDataWindow: true,
      showSeries: true,
      showIndicators: true,
      showDrawing: true,
      showRsiPanel: false,
      enableCandle: true,
      enableBar: true
    }
  };

  const els = {
    chartContainer: document.getElementById('chartContainer'),
    chartTitle: document.getElementById('chartTitle'),
    chartSubtitle: document.getElementById('chartSubtitle'),
    chartLoading: document.getElementById('chartLoading'),
    badgePeriod: document.querySelector('[data-badge="period"]'),
    badgeYear: document.querySelector('[data-badge="year"]'),
    badgeTimeframe: document.querySelector('[data-badge="timeframe"]'),
    dataWindow: document.getElementById('dataWindow'),
    summaryTotal: document.querySelector('[data-summary="total"]'),
    summaryPeak: document.querySelector('[data-summary="peak"]'),
    summaryPeakLabel: document.querySelector('[data-summary="peak-label"]'),
    summaryLatest: document.querySelector('[data-summary="latest"]'),
    summaryTrend: document.querySelector('[data-summary="trend"]'),
    selectedSeriesRow: document.getElementById('selectedSeriesRow'),
    addSeriesBtn: document.getElementById('addSeriesBtn'),
    chartHeader: document.querySelector('.chart-header'),
    chartToolbar: document.querySelector('.chart-toolbar'),
    summaryGrid: document.querySelector('.summary-grid'),
    chartTools: document.querySelector('.chart-tools'),
    chartDock: document.querySelector('.chart-dock'),
    indicatorDockPanel: document.getElementById('indicatorDockPanel'),
    drawingDockPanel: document.getElementById('drawingDockPanel'),
    drawingToolbar: document.getElementById('drawingToolbar'),
    rsiPanel: document.getElementById('rsiPanel'),
    settingsPanel: document.getElementById('settingsPanel'),
    settingsToggles: document.querySelectorAll('[data-setting]'),
    toolFit: document.getElementById('toolFit'),
    toolAutoScale: document.getElementById('toolAutoScale'),
    toolLogScale: document.getElementById('toolLogScale'),
    toolNormalize: document.getElementById('toolNormalize'),
    toolZoomIn: document.getElementById('toolZoomIn'),
    toolZoomOut: document.getElementById('toolZoomOut'),
    toolExport: document.getElementById('toolExport'),
    toolExportCsv: document.getElementById('toolExportCsv'),
    toolDock: document.getElementById('toolDock'),
    toolSettings: document.getElementById('toolSettings'),
    searchModal: document.getElementById('searchModal'),
    searchDropdown: document.getElementById('searchDropdown'),
    symbolSearch: document.getElementById('symbolSearch'),
    searchTrigger: document.getElementById('symbolSearchTrigger'),
    lineWidthInput: document.getElementById('lineWidth'),
    areaOpacityInput: document.getElementById('areaOpacity')
  };

  let chart = null;
  let seriesMap = new Map();
  let drawingLayer = null;
  const palette = ['#0f766e', '#e76f51', '#2a9d8f', '#f4a261', '#264653', '#8ecae6', '#ffb703'];

  function getCssVar(name, fallback = '') {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  }

  function setTheme(theme, persist = true) {
    document.body.dataset.theme = theme;
    if (persist) localStorage.setItem('theme', theme);
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
      toggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
      const label = toggle.querySelector('span');
      if (label) label.textContent = theme === 'dark' ? 'Dark' : 'Light';
    }
    applyChartAppearance();
  }

  function initChart() {
    if (!els.chartContainer) return;
    if (chart) chart.remove();

    const textColor = getCssVar('--chart-text', '#5b6b63');
    const gridColor = getCssVar('--chart-grid', 'rgba(20, 32, 25, 0.06)');
    const borderColor = getCssVar('--chart-grid-strong', 'rgba(20, 32, 25, 0.12)');
    const crosshairColor = getCssVar('--chart-crosshair', '#0f766e');

    chart = createChart(els.chartContainer, {
      width: els.chartContainer.clientWidth || 960,
      height: 360,
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor,
        fontFamily: "'Source Sans 3', sans-serif"
      },
      watermark: {
        visible: false
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor }
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: crosshairColor, labelBackgroundColor: crosshairColor },
        horzLine: { color: crosshairColor, labelBackgroundColor: crosshairColor }
      },
      rightPriceScale: { borderColor },
      leftPriceScale: { borderColor, visible: false },
      timeScale: {
        borderColor,
        timeVisible: true,
        secondsVisible: false
      }
    });

    bindChartEvents();
    applyScaleOptions();
    initDrawingLayer();

    const resizeObserver = new ResizeObserver(entries => {
      if (!entries.length) return;
      const { width } = entries[0].contentRect;
      chart.applyOptions({ width });
    });
    resizeObserver.observe(els.chartContainer);
  }

  function bindChartEvents() {
    if (!chart) return;
    chart.subscribeCrosshairMove((param) => {
      if (!els.dataWindow) return;
      if (!param.time || !param.seriesData) {
        updateDataWindow(null);
        return;
      }
      const primarySymbol = state.selectedSymbols[0];
      if (!primarySymbol) {
        updateDataWindow(null);
        return;
      }
      const series = seriesMap.get(primarySymbol.symbol);
      const point = series ? param.seriesData.get(series) : null;
      updateDataWindow(point, param.time);
    });
  }

  function createSeries(symbol, index) {
    const config = getSeriesConfig(symbol, index);
    const color = config.color;
    let series;

    if (state.chartType === 'candlestick' && index === 0) {
      series = chart.addCandlestickSeries({
        upColor: color,
        downColor: '#e76f51',
        borderUpColor: color,
        borderDownColor: '#e76f51',
        wickUpColor: color,
        wickDownColor: '#e76f51'
      });
    } else if (state.chartType === 'bar') {
      series = chart.addBarSeries({
        upColor: color,
        downColor: '#e76f51',
        priceScaleId: index === 0 ? 'right' : 'left'
      });
    } else if (state.chartType === 'area') {
      series = chart.addAreaSeries({
        lineColor: color,
        topColor: hexToRgba(color, state.appearance.areaOpacity),
        bottomColor: 'rgba(15, 118, 110, 0.05)',
        lineWidth: state.appearance.lineWidth,
        priceScaleId: index === 0 ? 'right' : 'left'
      });
    } else {
      series = chart.addLineSeries({
        color,
        lineWidth: state.appearance.lineWidth,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        priceScaleId: index === 0 ? 'right' : 'left'
      });
    }

    if (index === 1) {
      chart.applyOptions({ leftPriceScale: { visible: true } });
    }

    if (config.visible === false) {
      series.applyOptions({ visible: false });
    }

    return series;
  }

  function resetSeries() {
    seriesMap.forEach(series => chart.removeSeries(series));
    seriesMap.clear();
  }

  function getSeriesConfig(symbol, index) {
    const key = symbol.symbol;
    let config = state.seriesConfig.get(key);
    if (!config) {
      config = {
        color: palette[index % palette.length],
        visible: true
      };
      state.seriesConfig.set(key, config);
    }
    return config;
  }

  function applySeriesColor(series, color, index) {
    if (!series) return;
    if (state.chartType === 'candlestick' && index === 0) {
      series.applyOptions({
        upColor: color,
        borderUpColor: color,
        wickUpColor: color
      });
      return;
    }
    if (state.chartType === 'bar') {
      series.applyOptions({ upColor: color });
      return;
    }
    if (state.chartType === 'area') {
      series.applyOptions({
        lineColor: color,
        topColor: hexToRgba(color, state.appearance.areaOpacity),
        bottomColor: 'rgba(15, 118, 110, 0.05)',
        lineWidth: state.appearance.lineWidth
      });
      return;
    }
    series.applyOptions({ color, lineWidth: state.appearance.lineWidth });
  }

  function hexToRgba(hex, alpha) {
    if (!hex || typeof hex !== 'string') return hex;
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return hex;
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function setChartLoading(isLoading) {
    if (!els.chartContainer || !els.chartLoading) return;
    els.chartContainer.classList.toggle('is-loading', isLoading);
    els.chartLoading.setAttribute('aria-hidden', isLoading ? 'false' : 'true');
  }

  function applyChartType() {
    if (!chart) return;
    if ((state.chartType === 'candlestick' || state.chartType === 'bar') && state.normalize) {
      state.normalize = false;
      if (els.toolNormalize) els.toolNormalize.classList.remove('is-active');
    }
    resetSeries();
    state.seriesData.clear();
    loadAllChartData();
  }

  function normalizeSeries(data) {
    if (!data || data.length === 0) return [];
    let base = null;
    for (let i = 0; i < data.length; i++) {
      const val = data[i].close;
      if (val !== 0 && val !== null && val !== undefined) {
        base = val;
        break;
      }
    }
    if (!base) base = data[0].close || 1;
    return data.map(d => ({
      time: d.time,
      value: (d.close / base) * 100
    }));
  }

  function setSeriesData(symbol, data, index) {
    const series = seriesMap.get(symbol.symbol);
    if (!series) return;

    if (state.chartType === 'candlestick' && index === 0) {
      series.setData(data.map(d => ({
        time: d.time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close
      })));
    } else if (state.chartType === 'bar') {
      series.setData(data.map(d => ({
        time: d.time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close
      })));
    } else {
      const lineData = state.normalize ? normalizeSeries(data) : data.map(d => ({
        time: d.time,
        value: d.close
      }));
      series.setData(lineData);
    }
  }

  function updateSummary(data) {
    if (!data || data.length === 0) return;
    const values = data.map(d => d.close);
    const total = data.reduce((acc, d) => acc + (d.volume || d.close || 0), 0);
    const peak = Math.max(...values);
    const latest = values[values.length - 1];
    const prev = values.length > 1 ? values[values.length - 2] : latest;
    const change = prev ? ((latest - prev) / prev) * 100 : 0;

    if (els.summaryTotal) els.summaryTotal.textContent = formatNumber(total);
    if (els.summaryPeak) els.summaryPeak.textContent = formatNumber(peak);
    if (els.summaryPeakLabel) els.summaryPeakLabel.textContent = 'Puncak mingguan';
    if (els.summaryLatest) els.summaryLatest.textContent = formatNumber(latest);
    if (els.summaryTrend) {
      els.summaryTrend.textContent = `${change.toFixed(2)}%`;
      els.summaryTrend.classList.toggle('trend-up', change >= 0);
      els.summaryTrend.classList.toggle('trend-down', change < 0);
    }
  }

  function updateDataWindow(point, time) {
    if (!els.dataWindow) return;
    if (!point) {
      els.dataWindow.textContent = 'Hover chart untuk lihat data.';
      return;
    }
    const date = new Date(time * 1000);
    const dateStr = date.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });

    if (state.chartType === 'candlestick' || state.chartType === 'bar') {
      els.dataWindow.innerHTML = `
        <span class="data-date">${dateStr}</span>
        <span class="data-item">O: ${formatNumber(point.open)}</span>
        <span class="data-item">H: ${formatNumber(point.high)}</span>
        <span class="data-item">L: ${formatNumber(point.low)}</span>
        <span class="data-item">C: ${formatNumber(point.close)}</span>
      `;
    } else {
      els.dataWindow.innerHTML = `
        <span class="data-date">${dateStr}</span>
        <span class="data-item">Nilai: ${formatNumber(point.value)}</span>
      `;
    }
  }

  function formatNumber(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return '--';
    return Number(value).toLocaleString('id-ID');
  }

  async function fetchSymbols() {
    const res = await fetch(`${API_BASE}/api/symbols?with_data=true`);
    const json = await res.json();
    state.symbols = json.data || [];
  }

  function openSearchModal() {
    if (!els.searchModal) return;
    els.searchModal.classList.add('open');
    els.searchModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    renderSearchResults(state.symbols);
    setTimeout(() => els.symbolSearch && els.symbolSearch.focus(), 0);
  }

  function closeSearchModal() {
    if (!els.searchModal) return;
    els.searchModal.classList.remove('open');
    els.searchModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  function renderSearchResults(list) {
    if (!els.searchDropdown) return;
    if (!list || list.length === 0) {
      els.searchDropdown.innerHTML = `<div class="search-empty">Tidak ditemukan</div>`;
      return;
    }
    const added = new Set(state.selectedSymbols.map(s => s.symbol));
    els.searchDropdown.innerHTML = list.map((s, idx) => `
      <div class="search-item${idx === 0 ? ' selected' : ''}${added.has(s.symbol) ? ' added' : ''}" data-symbol="${s.symbol}">
        <span class="search-item-icon">S</span>
        <div class="search-item-info">
          <div class="search-item-name">${s.name || s.symbol}</div>
          <div class="search-item-desc">${s.symbol}</div>
        </div>
        ${added.has(s.symbol) ? '<span class="search-item-added">OK</span>' : ''}
      </div>
    `).join('');

    els.searchDropdown.querySelectorAll('.search-item').forEach(item => {
      item.addEventListener('click', () => {
        const symbol = item.dataset.symbol;
        const found = state.symbols.find(s => s.symbol === symbol);
        if (found) addSymbol(found);
        closeSearchModal();
      });
    });
  }

  function filterSymbols(query) {
    const q = query.trim().toLowerCase();
    if (!q) return state.symbols;
    return state.symbols.filter(s => {
      const name = (s.name || '').toLowerCase();
      return s.symbol.toLowerCase().includes(q) || name.includes(q);
    });
  }

  function renderSelectedSeries() {
    if (!els.selectedSeriesRow) return;
    if (state.selectedSymbols.length === 0) {
      els.selectedSeriesRow.innerHTML = `
        <div class="selected-series-placeholder">Pilih kode data untuk mulai.</div>
      `;
      if (els.searchTrigger) els.searchTrigger.value = '';
      return;
    }

    const chips = state.selectedSymbols.map((s, index) => {
      const config = getSeriesConfig(s, index);
      const chipClass = config.visible ? 'series-chip' : 'series-chip is-muted';
      const toggleTitle = config.visible ? 'Sembunyikan series' : 'Tampilkan series';
      return `
        <div class="${chipClass}" data-symbol="${s.symbol}" style="--chip-color:${config.color}">
          <span class="series-swatch" aria-hidden="true"></span>
          <span class="series-name">${s.name || s.symbol}</span>
          <span class="series-code">${s.symbol}</span>
          <input type="color" class="series-color-input" value="${config.color}" aria-label="Warna series ${s.symbol}">
          <button type="button" class="toggle-series" data-symbol="${s.symbol}" title="${toggleTitle}" aria-pressed="${config.visible ? 'true' : 'false'}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>
          </button>
          <button type="button" class="remove-series" data-symbol="${s.symbol}" title="Hapus">x</button>
        </div>
      `;
    }).join('');

    els.selectedSeriesRow.innerHTML = `${chips}`;

    els.selectedSeriesRow.querySelectorAll('.remove-series').forEach(btn => {
      btn.addEventListener('click', () => removeSymbol(btn.dataset.symbol));
    });
    els.selectedSeriesRow.querySelectorAll('.toggle-series').forEach(btn => {
      btn.addEventListener('click', () => {
        const symbol = btn.dataset.symbol;
        const config = state.seriesConfig.get(symbol);
        if (!config) return;
        config.visible = !config.visible;
        const series = seriesMap.get(symbol);
        if (series) series.applyOptions({ visible: config.visible });
        renderSelectedSeries();
      });
    });
    els.selectedSeriesRow.querySelectorAll('.series-color-input').forEach((input) => {
      input.addEventListener('input', (e) => {
        const chip = e.target.closest('.series-chip');
        if (!chip) return;
        const symbol = chip.dataset.symbol;
        const config = state.seriesConfig.get(symbol);
        if (!config) return;
        config.color = e.target.value;
        chip.style.setProperty('--chip-color', config.color);
        const series = seriesMap.get(symbol);
        const index = state.selectedSymbols.findIndex(s => s.symbol === symbol);
        applySeriesColor(series, config.color, index);
      });
    });
    if (els.searchTrigger) {
      const primary = state.selectedSymbols[0];
      els.searchTrigger.value = primary ? `${primary.symbol} - ${primary.name || ''}`.trim() : '';
    }
  }

  function bindAddSeriesButton() {
    if (els.addSeriesBtn) els.addSeriesBtn.addEventListener('click', openSearchModal);
  }

  function updateTitles() {
    if (state.selectedSymbols.length === 0) {
      if (els.chartTitle) els.chartTitle.textContent = 'Procurement Chart';
      if (els.chartSubtitle) els.chartSubtitle.textContent = 'Pilih kode data untuk melihat data';
      return;
    }
    const primary = state.selectedSymbols[0];
    if (els.chartTitle) els.chartTitle.textContent = primary.name || primary.symbol;
    if (els.chartSubtitle) els.chartSubtitle.textContent = `Kode: ${primary.symbol}`;
  }

  function applyScaleOptions() {
    if (!chart) return;
    const scaleMode = state.logScale ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal;
    const scaleOptions = { autoScale: state.autoScale };
    if (scaleMode !== undefined) scaleOptions.mode = scaleMode;
    const leftVisible = state.appearance.showLeftScale || state.selectedSymbols.length > 1;
    chart.applyOptions({
      rightPriceScale: scaleOptions,
      leftPriceScale: { ...scaleOptions, visible: leftVisible }
    });
  }

  function applyChartAppearance() {
    if (!chart) return;
    const gridBase = getCssVar('--chart-grid', 'rgba(20, 32, 25, 0.06)');
    const crosshairColor = getCssVar('--chart-crosshair', '#0f766e');
    const borderColor = getCssVar('--chart-grid-strong', 'rgba(20, 32, 25, 0.12)');
    const textColor = getCssVar('--chart-text', '#5b6b63');
    const gridColor = state.appearance.showGrid ? gridBase : 'transparent';
    chart.applyOptions({
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor,
        fontFamily: "'Source Sans 3', sans-serif"
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor }
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: crosshairColor,
          labelBackgroundColor: crosshairColor,
          visible: state.appearance.showCrosshair
        },
        horzLine: {
          color: crosshairColor,
          labelBackgroundColor: crosshairColor,
          visible: state.appearance.showCrosshair
        }
      },
      rightPriceScale: { borderColor },
      leftPriceScale: { borderColor },
      timeScale: { borderColor }
    });
    applyScaleOptions();
  }

  function applySeriesStyles() {
    state.selectedSymbols.forEach((symbol, index) => {
      const config = getSeriesConfig(symbol, index);
      const series = seriesMap.get(symbol.symbol);
      applySeriesColor(series, config.color, index);
    });
  }

  function zoomTimeScale(factor) {
    if (!chart) return;
    const timeScale = chart.timeScale();
    const range = timeScale.getVisibleLogicalRange();
    if (!range) return;
    const center = (range.from + range.to) / 2;
    const half = (range.to - range.from) / 2;
    const newHalf = half * factor;
    timeScale.setVisibleLogicalRange({ from: center - newHalf, to: center + newHalf });
  }

  function exportChartImage() {
    if (!chart) return;
    const canvas = chart.takeScreenshot();
    const link = document.createElement('a');
    const primary = state.selectedSymbols[0];
    const name = primary ? primary.symbol : 'chart';
    link.download = `${name}-${state.periodType}-${state.year}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function exportSeriesCsv() {
    if (state.selectedSymbols.length === 0) return;
    const timeSet = new Set();
    state.selectedSymbols.forEach(s => {
      const data = state.seriesData.get(s.symbol) || [];
      data.forEach(d => timeSet.add(d.time));
    });
    const times = Array.from(timeSet).sort((a, b) => a - b);
    const header = ['date'].concat(state.selectedSymbols.map(s => s.symbol));
    const rows = [header.join(',')];
    times.forEach(t => {
      const date = new Date(t * 1000).toISOString().slice(0, 10);
      const cols = [date];
      state.selectedSymbols.forEach(s => {
        const data = state.seriesData.get(s.symbol) || [];
        const match = data.find(d => d.time === t);
        cols.push(match ? String(match.close) : '');
      });
      rows.push(cols.join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const primary = state.selectedSymbols[0];
    const name = primary ? primary.symbol : 'series';
    link.download = `${name}-${state.periodType}-${state.year}.csv`;
    link.href = URL.createObjectURL(blob);
    link.click();
  }

  function applySettings() {
    if (els.chartHeader) els.chartHeader.classList.toggle('is-hidden', !state.settings.showHeader);
    if (els.chartToolbar) els.chartToolbar.classList.toggle('is-hidden', !state.settings.showToolbar);
    if (els.summaryGrid) els.summaryGrid.classList.toggle('is-hidden', !state.settings.showSummary);
    if (els.dataWindow) els.dataWindow.classList.toggle('is-hidden', !state.settings.showDataWindow);
    if (els.selectedSeriesRow) els.selectedSeriesRow.classList.toggle('is-hidden', !state.settings.showSeries);
    if (els.chartTools) els.chartTools.classList.toggle('is-hidden', !state.settings.showIndicators);
    if (els.drawingToolbar) els.drawingToolbar.classList.toggle('is-hidden', !state.settings.showDrawing);
    if (els.chartDock) {
      const showDock = state.settings.showIndicators || state.settings.showDrawing;
      els.chartDock.classList.toggle('is-hidden', !showDock);
    }
    if (els.indicatorDockPanel) els.indicatorDockPanel.classList.toggle('is-hidden', !state.settings.showIndicators);
    if (els.drawingDockPanel) els.drawingDockPanel.classList.toggle('is-hidden', !state.settings.showDrawing);
    if (els.rsiPanel) els.rsiPanel.hidden = !state.settings.showRsiPanel;
    if (els.chartToolbar) {
      els.chartToolbar.classList.toggle('is-undocked', !state.dockToolbar);
    }
    if (els.toolDock) els.toolDock.classList.toggle('is-active', !state.dockToolbar);
    if (els.toolNormalize) {
      els.toolNormalize.classList.toggle('is-muted', state.chartType === 'candlestick' || state.chartType === 'bar');
    }
  }

  async function fetchSeriesData(symbol) {
    const url = `${API_BASE}/api/ohlc/${symbol.symbol}?period_type=${state.periodType}&year=${state.year}&limit=500&cumulative=false`;
    const res = await fetch(url);
    const json = await res.json();
    return json.data || [];
  }

  async function loadAllChartData() {
    if (!chart || state.selectedSymbols.length === 0) {
      if (els.dataWindow) els.dataWindow.textContent = 'Data kosong.';
      setChartLoading(false);
      return;
    }

    setChartLoading(true);
    resetSeries();
    state.seriesData.clear();

    try {
      const list = state.selectedSymbols;
      const dataList = await Promise.all(list.map(fetchSeriesData));

      list.forEach((symbol, index) => {
        const series = createSeries(symbol, index);
        seriesMap.set(symbol.symbol, series);
        const data = dataList[index] || [];
        state.seriesData.set(symbol.symbol, data);
        setSeriesData(symbol, data, index);
      });

      chart.timeScale().fitContent();
      updateSummary(state.seriesData.get(list[0].symbol) || []);
    } catch (err) {
      console.error('Failed to load chart data', err);
    } finally {
      setChartLoading(false);
    }
  }

  function addSymbol(symbol) {
    if (state.selectedSymbols.find(s => s.symbol === symbol.symbol)) return;
    state.selectedSymbols.push(symbol);
    renderSelectedSeries();
    updateTitles();
    loadAllChartData();
  }

  function removeSymbol(symbolCode) {
    state.selectedSymbols = state.selectedSymbols.filter(s => s.symbol !== symbolCode);
    state.seriesConfig.delete(symbolCode);
    renderSelectedSeries();
    updateTitles();
    loadAllChartData();
  }

  function bindControls() {
    if (els.searchTrigger) {
      els.searchTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        openSearchModal();
      });
    }
    bindAddSeriesButton();

    if (els.symbolSearch) {
      els.symbolSearch.addEventListener('input', (e) => {
        const filtered = filterSymbols(e.target.value);
        renderSearchResults(filtered);
      });
    }

    if (els.searchModal) {
      els.searchModal.querySelectorAll('[data-action="close-search"]').forEach((btn) => {
        btn.addEventListener('click', closeSearchModal);
      });
    }

    document.addEventListener('click', (e) => {
      if (!els.searchModal || !els.searchModal.classList.contains('open')) return;
      const panel = els.searchModal.querySelector('.search-modal-panel');
      if (panel && panel.contains(e.target)) return;
      if (els.searchTrigger && els.searchTrigger.contains(e.target)) return;
      if (els.addSeriesBtn && els.addSeriesBtn.contains(e.target)) return;
      closeSearchModal();
    });

    document.querySelectorAll('[data-control="periodType"] button').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-control="periodType"] button').forEach(b => {
          b.classList.toggle('is-active', b === btn);
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        state.periodType = btn.dataset.value;
        if (els.badgePeriod) els.badgePeriod.textContent = state.periodType === 'calendar' ? 'Kalender' : 'Anggaran';
        loadAllChartData();
      });
    });

    const yearSelect = document.getElementById('year');
    if (yearSelect) {
      yearSelect.addEventListener('change', (e) => {
        state.year = parseInt(e.target.value, 10);
        if (els.badgeYear) els.badgeYear.textContent = state.year;
        loadAllChartData();
      });
    }

    document.querySelectorAll('[data-control="chartType"] button').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-control="chartType"] button').forEach(b => {
          b.classList.toggle('is-active', b === btn);
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        state.chartType = btn.dataset.value;
        applyChartType();
      });
    });

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
    if (els.toolNormalize) {
      els.toolNormalize.addEventListener('click', () => {
        if (state.chartType === 'candlestick' || state.chartType === 'bar') return;
        state.normalize = !state.normalize;
        els.toolNormalize.classList.toggle('is-active', state.normalize);
        loadAllChartData();
      });
    }
    if (els.toolZoomIn) {
      els.toolZoomIn.addEventListener('click', () => zoomTimeScale(0.8));
    }
    if (els.toolZoomOut) {
      els.toolZoomOut.addEventListener('click', () => zoomTimeScale(1.25));
    }
    if (els.toolExport) {
      els.toolExport.addEventListener('click', exportChartImage);
    }
    if (els.toolExportCsv) {
      els.toolExportCsv.addEventListener('click', exportSeriesCsv);
    }
    if (els.toolDock) {
      els.toolDock.addEventListener('click', () => {
        state.dockToolbar = !state.dockToolbar;
        applySettings();
      });
    }
    if (els.toolSettings) {
      els.toolSettings.addEventListener('click', () => {
        if (!els.settingsPanel) return;
        els.settingsPanel.hidden = !els.settingsPanel.hidden;
      });
    }

    if (els.settingsToggles && els.settingsToggles.length > 0) {
      els.settingsToggles.forEach((input) => {
        input.addEventListener('change', () => {
          const key = input.dataset.setting;
          if (!key) return;
          if (key === 'dockToolbar') {
            state.dockToolbar = input.checked;
          } else if (Object.prototype.hasOwnProperty.call(state.appearance, key)) {
            state.appearance[key] = input.checked;
            applyChartAppearance();
          } else if (Object.prototype.hasOwnProperty.call(state.settings, key)) {
            state.settings[key] = input.checked;
          }
          applySettings();
          if (key === 'enableCandle' && !state.settings.enableCandle && state.chartType === 'candlestick') {
            state.chartType = 'line';
            document.querySelector('[data-control="chartType"] button[data-value="line"]')?.click();
          }
          if (key === 'enableBar' && !state.settings.enableBar && state.chartType === 'bar') {
            state.chartType = 'line';
            document.querySelector('[data-control="chartType"] button[data-value="line"]')?.click();
          }
        });
      });
    }

    if (els.lineWidthInput) {
      els.lineWidthInput.addEventListener('input', (e) => {
        state.appearance.lineWidth = parseInt(e.target.value, 10) || 2;
        applySeriesStyles();
      });
    }
    if (els.areaOpacityInput) {
      els.areaOpacityInput.addEventListener('input', (e) => {
        state.appearance.areaOpacity = parseFloat(e.target.value) || 0.2;
        applySeriesStyles();
      });
    }

    document.querySelectorAll('.sidebar-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!drawingLayer) return;
        const tool = btn.dataset.tool;
        if (!tool) return;
        document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        if (tool === 'clear') {
          drawingLayer.clearAllDrawings();
          return;
        }
        drawingLayer.setTool(tool);
      });
    });
  }

  function initBadges() {
    if (els.badgePeriod) els.badgePeriod.textContent = 'Kalender';
    if (els.badgeYear) els.badgeYear.textContent = String(state.year);
    if (els.badgeTimeframe) els.badgeTimeframe.textContent = 'Weekly';
  }

  function applyIntroAnimations() {
    document.querySelectorAll('.animate-in').forEach((el, idx) => {
      el.style.setProperty('--i', idx);
      el.classList.add('fade-up');
    });
    if (els.chartToolbar) els.chartToolbar.classList.add('fade-up');
    if (els.dataWindow) els.dataWindow.classList.add('fade-up');
    if (els.summaryGrid) {
      els.summaryGrid.classList.add('stagger');
      Array.from(els.summaryGrid.children).forEach((card, idx) => {
        card.style.setProperty('--i', idx + 1);
      });
    }
  }

  async function init() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(savedTheme || (prefersDark ? 'dark' : 'light'), false);

    initChart();
    bindControls();
    initBadges();
    applyChartAppearance();
    applyIntroAnimations();
    await fetchSymbols();
    renderSelectedSeries();
    applySettings();
    if (els.lineWidthInput) els.lineWidthInput.value = state.appearance.lineWidth;
    if (els.areaOpacityInput) els.areaOpacityInput.value = state.appearance.areaOpacity;
    if (els.toolAutoScale) els.toolAutoScale.classList.toggle('is-active', state.autoScale);
    if (els.toolLogScale) els.toolLogScale.classList.toggle('is-active', state.logScale);
    if (els.toolNormalize) els.toolNormalize.classList.toggle('is-active', state.normalize);
    const crosshairBtn = document.querySelector('.sidebar-btn[data-tool="crosshair"]');
    if (crosshairBtn) crosshairBtn.classList.add('is-active');
    const sideNavToggle = document.getElementById('sideNavToggle');
    const sideNav = document.getElementById('sideNav');
    if (sideNavToggle && sideNav) {
      sideNavToggle.addEventListener('click', () => {
        sideNav.classList.toggle('is-collapsed');
      });
    }

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
      });
    }
  }

  init();

  function initDrawingLayer() {
    if (!els.chartContainer) return;
    drawingLayer = createDrawingLayer(els.chartContainer);
  }

  function createDrawingLayer(container) {
    const layer = {
      canvas: null,
      ctx: null,
      isDrawing: false,
      currentTool: 'crosshair',
      startPoint: null,
      drawings: [],
      tempDrawing: null,
      styles: {
        trendline: { color: '#e76f51', width: 2 },
        hline: { color: '#0f766e', width: 1, dash: [5, 5] },
        vline: { color: '#0f766e', width: 1, dash: [5, 5] },
        rectangle: { color: '#2a9d8f', width: 2, fill: 'rgba(42, 157, 143, 0.08)' }
      }
    };

    layer.canvas = document.createElement('canvas');
    layer.canvas.className = 'drawing-canvas';
    layer.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:9;';
    container.style.position = 'relative';
    container.appendChild(layer.canvas);
    layer.ctx = layer.canvas.getContext('2d');

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      layer.canvas.width = rect.width * dpr;
      layer.canvas.height = rect.height * dpr;
      layer.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      redraw();
    };

    const getPos = (e) => {
      const rect = container.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const redraw = () => {
      const rect = container.getBoundingClientRect();
      layer.ctx.clearRect(0, 0, rect.width, rect.height);
      layer.drawings.forEach(d => renderDrawing(d));
      if (layer.tempDrawing) renderDrawing(layer.tempDrawing, true);
    };

    const renderDrawing = (drawing, isPreview = false) => {
      const style = drawing.style || layer.styles[drawing.type];
      const ctx = layer.ctx;
      ctx.save();
      ctx.strokeStyle = isPreview ? 'rgba(231, 111, 81, 0.5)' : style.color;
      ctx.lineWidth = style.width || 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (style.dash) ctx.setLineDash(style.dash);
      switch (drawing.type) {
        case 'trendline':
          ctx.beginPath();
          ctx.moveTo(drawing.x1, drawing.y1);
          ctx.lineTo(drawing.x2, drawing.y2);
          ctx.stroke();
          break;
        case 'hline':
          ctx.beginPath();
          ctx.moveTo(0, drawing.y);
          ctx.lineTo(container.getBoundingClientRect().width, drawing.y);
          ctx.stroke();
          break;
        case 'vline':
          ctx.beginPath();
          ctx.moveTo(drawing.x, 0);
          ctx.lineTo(drawing.x, container.getBoundingClientRect().height);
          ctx.stroke();
          break;
        case 'rectangle': {
          const x = Math.min(drawing.x1, drawing.x2);
          const y = Math.min(drawing.y1, drawing.y2);
          const w = Math.abs(drawing.x2 - drawing.x1);
          const h = Math.abs(drawing.y2 - drawing.y1);
          if (style.fill) {
            ctx.fillStyle = style.fill;
            ctx.fillRect(x, y, w, h);
          }
          ctx.strokeRect(x, y, w, h);
          break;
        }
        default:
          break;
      }
      ctx.restore();
    };

    const addDrawing = (drawing) => {
      drawing.id = Date.now();
      drawing.style = { ...layer.styles[drawing.type] };
      layer.drawings.push(drawing);
      redraw();
    };

    const onMouseDown = (e) => {
      if (layer.currentTool === 'crosshair') return;
      if (e.button !== 0) return;
      const pos = getPos(e);
      if (layer.currentTool === 'hline') {
        addDrawing({ type: 'hline', y: pos.y });
        return;
      }
      if (layer.currentTool === 'vline') {
        addDrawing({ type: 'vline', x: pos.x });
        return;
      }
      if (!layer.isDrawing) {
        layer.isDrawing = true;
        layer.startPoint = pos;
      } else {
        completeDrawing(pos);
      }
    };

    const onMouseMove = (e) => {
      if (!layer.isDrawing || layer.currentTool === 'crosshair') return;
      const pos = getPos(e);
      if (layer.currentTool === 'trendline') {
        layer.tempDrawing = {
          type: 'trendline',
          x1: layer.startPoint.x,
          y1: layer.startPoint.y,
          x2: pos.x,
          y2: pos.y
        };
      } else if (layer.currentTool === 'rectangle') {
        layer.tempDrawing = {
          type: 'rectangle',
          x1: layer.startPoint.x,
          y1: layer.startPoint.y,
          x2: pos.x,
          y2: pos.y
        };
      }
      redraw();
    };

    const completeDrawing = (endPos) => {
      if (layer.currentTool === 'trendline') {
        addDrawing({
          type: 'trendline',
          x1: layer.startPoint.x,
          y1: layer.startPoint.y,
          x2: endPos.x,
          y2: endPos.y
        });
      } else if (layer.currentTool === 'rectangle') {
        addDrawing({
          type: 'rectangle',
          x1: layer.startPoint.x,
          y1: layer.startPoint.y,
          x2: endPos.x,
          y2: endPos.y
        });
      }
      layer.isDrawing = false;
      layer.startPoint = null;
      layer.tempDrawing = null;
    };

    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', resize);
    resize();

    return {
      setTool(tool) {
        layer.currentTool = tool;
        layer.isDrawing = false;
        layer.startPoint = null;
        layer.tempDrawing = null;
        layer.canvas.style.pointerEvents = tool === 'crosshair' ? 'none' : 'auto';
        redraw();
      },
      clearAllDrawings() {
        layer.drawings = [];
        layer.tempDrawing = null;
        redraw();
      }
    };
  }
}
