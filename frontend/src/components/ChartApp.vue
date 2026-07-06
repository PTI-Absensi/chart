<template>
  <!-- Compact TradingView-style Header -->
  <header class="tv-header">
    <div class="tv-header-left">
      <div class="tv-logo">
        <span class="tv-title">Charting</span>
      </div>
    </div>
    
    <div class="tv-header-center">
      <div class="tv-source-switch" role="tablist" aria-label="Data source">
        <button
          type="button"
          class="tv-btn"
          :class="{ active: sourceMode === 'yahoo' }"
          @click="sourceMode = 'yahoo'"
        >
          Yahoo
        </button>
        <button
          type="button"
          class="tv-btn"
          :class="{ active: sourceMode === 'research' }"
          @click="sourceMode = 'research'"
        >
          Research
        </button>
        <button
          type="button"
          class="tv-btn"
          :class="{ active: sourceMode === 'economy' }"
          @click="sourceMode = 'economy'"
        >
          Ekonomi
        </button>
      </div>

      <select v-model="timezoneOption" class="tv-select" title="Timezone">
        <option v-for="tz in timezoneOptions" :key="tz.value" :value="tz.value">
          {{ tz.label }}
        </option>
      </select>
        
        <!-- Max Series Limit -->
        <select v-if="sourceMode === 'yahoo'" v-model="maxSeries" class="tv-select" title="Maximum series to display">
          <option :value="3">Max 3</option>
          <option :value="5">Max 5</option>
          <option :value="10">Max 10</option>
        </select>
        
        <!-- Mode Buttons -->
        <button v-if="sourceMode === 'yahoo'" :class="['tv-btn', { active: rawMode }]" @click="rawMode = !rawMode" title="Raw data">Raw</button>
        <button v-if="sourceMode === 'yahoo'" :class="['tv-btn', { active: cumulative }]" @click="cumulative = !cumulative" title="Kumulatif">Σ</button>
        <button :class="['tv-btn', { active: singleScale }]" @click="singleScale = !singleScale" title="Single Y scale">1 Skala</button>
        <button class="tv-btn" @click="scaleSide = scaleSide === 'left' ? 'right' : 'left'" title="Posisi Skala">
          {{ scaleSide === 'left' ? 'Skala Kiri' : 'Skala Kanan' }}
        </button>
        
      <!-- Chart Type -->
      <select v-if="sourceMode !== 'research'" v-model="chartType" class="tv-select" title="Chart type">
        <option
          v-for="type in chartTypes"
          :key="type.value"
          :value="type.value"
        >
          {{ type.label }}
        </option>
      </select>
      <div v-else class="tv-chart-type-lock" title="Research mode uses candlestick chart">
        Candle
      </div>

      <div class="tv-indicator-wrap">
        <button ref="indicatorButtonRef" class="tv-btn" type="button" @click="toggleIndicatorMenu">Indicators</button>
        <div v-if="indicatorMenuOpen" class="tv-indicator-menu" :style="indicatorMenuStyle" @click.stop>
          <div class="tv-indicator-head">
            <span class="tv-indicator-storage">Pane presets saved on server</span>
            <button class="tv-indicator-add-btn" type="button" @click="showIndicatorCreateForm = !showIndicatorCreateForm">
              {{ showIndicatorCreateForm ? 'Close' : 'New Pane Custom' }}
            </button>
          </div>

          <div v-if="indicatorRegistryError" class="tv-indicator-error">{{ indicatorRegistryError }}</div>
          <div v-else-if="indicatorRegistryLoading" class="tv-indicator-loading">Loading indicators...</div>
          <template v-else>
            <div class="tv-indicator-title">Overlay</div>
            <div
              v-for="item in technicalOverlayIndicators"
              :key="item.id"
              class="tv-indicator-item"
              :class="{ active: activeOverlayIndicatorIds.includes(item.id) }"
              @click="selectOverlayIndicator(item.id)"
            >
              <span class="tv-indicator-item-main">
                <span>{{ item.label }}</span>
                <span
                  v-if="item.engine !== 'none' && activeOverlayIndicatorIds.includes(item.id)"
                  class="tv-indicator-meta"
                >
                  {{ getOverlayIndicatorSettings(item).period }} / {{ getOverlayIndicatorSettings(item).sourceField }}
                </span>
              </span>
              <span class="tv-indicator-actions">
                <button
                  v-if="['sma', 'ema'].includes(item.engine) && activeOverlayIndicatorIds.includes(item.id)"
                  class="tv-indicator-settings"
                  type="button"
                  title="Indicator settings"
                  @click.stop="toggleOverlaySettings(item.id)"
                >
                  ⚙
                </button>
                <button
                  v-if="item.source === 'user'"
                  class="tv-indicator-delete"
                  type="button"
                  title="Delete custom indicator"
                  @click.stop="deleteIndicator(item.id)"
                >
                  ×
                </button>
              </span>
            </div>
            <template v-if="sourceMode === 'research' && predictionOverlayIndicators.length">
              <div class="tv-indicator-title">Prediction</div>
              <div
                v-for="item in predictionOverlayIndicators"
                :key="item.id"
                class="tv-indicator-item"
                :class="{ active: activeOverlayIndicatorIds.includes(item.id) }"
                @click="selectOverlayIndicator(item.id)"
              >
                <span class="tv-indicator-item-main">
                  <span class="tv-indicator-label">
                    <span class="tv-indicator-badge" :style="{ background: getPredictionIndicatorColor(item.engine) }"></span>
                    <span>{{ item.label }}</span>
                  </span>
                  <span
                    v-if="activeOverlayIndicatorIds.includes(item.id)"
                    class="tv-indicator-meta"
                  >
                    {{ getPredictionIndicatorNote(item.engine) }}
                  </span>
                </span>
              </div>
            </template>
            <div
              v-if="activeOverlaySettingsId && overlayIndicators.some((item) => item.id === activeOverlaySettingsId && ['sma', 'ema'].includes(item.engine))"
              class="tv-indicator-settings-panel"
            >
              <div class="tv-indicator-title">Overlay Settings</div>
              <div
                v-for="item in overlayIndicators.filter((entry) => entry.id === activeOverlaySettingsId && ['sma', 'ema'].includes(entry.engine))"
                :key="`${item.id}-settings`"
                class="tv-indicator-settings-grid"
              >
                <label class="tv-indicator-field">
                  <span>Length</span>
                  <input
                    class="tv-indicator-input"
                    type="number"
                    min="2"
                    max="500"
                    :value="getOverlayIndicatorSettings(item).period"
                    @input="updateOverlayIndicatorPeriod(item.id, Number(($event.target as HTMLInputElement).value))"
                  />
                </label>
                <label class="tv-indicator-field">
                  <span>Source</span>
                  <select
                    class="tv-select tv-select-compact"
                    :value="getOverlayIndicatorSettings(item).sourceField"
                    @change="updateOverlayIndicatorSource(item.id, ($event.target as HTMLSelectElement).value as PriceSource)"
                  >
                    <option v-for="option in overlaySourceOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </label>
              </div>
            </div>

            <div class="tv-indicator-title">New Pane</div>
            <div
              v-for="item in paneIndicators"
              :key="item.id"
              class="tv-indicator-item"
              :class="{ active: activePaneIndicatorIds.includes(item.id) }"
              @click="togglePaneIndicator(item.id)"
            >
              <span>{{ item.label }}</span>
              <button
                v-if="item.source === 'user'"
                class="tv-indicator-delete"
                type="button"
                title="Delete custom indicator"
                @click.stop="deleteIndicator(item.id)"
              >
                ×
              </button>
            </div>
          </template>

          <form v-if="showIndicatorCreateForm" class="tv-indicator-form" @submit.prevent="createIndicator">
            <div class="tv-indicator-title">Add Custom Pane</div>
            <input v-model="newIndicatorForm.label" class="tv-indicator-input" type="text" placeholder="Name" />
            <div class="tv-indicator-form-row">
              <select v-model="newIndicatorForm.engine" class="tv-select tv-select-compact">
                <option v-for="engine in availableNewIndicatorEngines" :key="engine.value" :value="engine.value">
                  {{ engine.label }}
                </option>
              </select>
              <input v-model.number="newIndicatorForm.period" class="tv-indicator-input" type="number" min="2" max="500" placeholder="Period" />
            </div>
            <div v-if="indicatorCreateError" class="tv-indicator-error">{{ indicatorCreateError }}</div>
            <div class="tv-indicator-form-actions">
              <button class="tv-btn" type="submit" :disabled="indicatorCreateSubmitting">
                {{ indicatorCreateSubmitting ? 'Saving...' : 'Save' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    
    <div class="tv-header-right">
      <button class="tv-btn icon" title="Undo (Ctrl/Cmd+Z)" @click="drawingRef?.undo?.()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M3 12a9 9 0 1 0 3-6.7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M3 5v4h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <button class="tv-btn icon" title="Redo (Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z)" @click="drawingRef?.redo?.()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M21 12a9 9 0 1 1-3-6.7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M21 5v4h-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <button class="tv-btn icon" title="Zoom In" @click="zoomAllIn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M11 8v6M8 11h6M20 20l-4-4" stroke="currentColor" stroke-width="2"/></svg>
      </button>
      <button class="tv-btn icon" title="Zoom Out" @click="zoomAllOut">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M8 11h6M20 20l-4-4" stroke="currentColor" stroke-width="2"/></svg>
      </button>
      <button class="tv-btn icon" title="Fit" @click="fitAllCharts">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" stroke-width="2"/></svg>
      </button>
      <button class="tv-btn icon" title="Export" @click="chartRef?.exportPng()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3v12M8 7l4-4 4 4M5 14v6h14v-6" stroke="currentColor" stroke-width="2"/></svg>
      </button>
    </div>
  </header>

  <!-- Main Layout: Drawing Sidebar + Chart Area -->
  <main class="tv-main">
    <!-- Left Sidebar: Hamburger + Theme + Drawing Tools -->
    <aside class="tv-sidebar">
      <!-- Hamburger Menu Button -->
      <button class="tv-sidebar-btn" @click="navMenuOpen = !navMenuOpen" title="Navigation">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      
      <!-- Theme Toggle -->
      <button class="tv-sidebar-btn" @click="toggleTheme" :title="theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'">
        <svg v-if="theme === 'dark'" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/>
          <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2"/>
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2"/>
        </svg>
      </button>
      
      <div class="tv-sidebar-divider"></div>
      
      <!-- Drawing Tools -->
      <button 
        v-for="tool in drawingTools" 
        :key="tool.id"
        class="tv-sidebar-btn" 
        :class="{ active: activeDrawingTool === tool.id }"
        :title="tool.label"
        @click="setDrawingTool(tool.id)"
      >
        <span v-html="tool.icon"></span>
      </button>
      
      <div class="tv-sidebar-divider"></div>
      
      <!-- Clear drawings -->
      <button class="tv-sidebar-btn danger" title="Clear drawings" @click="clearDrawings">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M4 7h16M8 7V5h8v2M7 7l1 12h8l1-12" stroke="currentColor" stroke-width="2"/>
        </svg>
      </button>
      
      <div class="tv-sidebar-divider"></div>
      
      <!-- Navigation Popup -->
      <div v-if="navMenuOpen" class="tv-nav-popup">
        <div class="tv-nav-header">
          <span>Apps</span>
          <button @click="navMenuOpen = false" aria-label="Close apps menu">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="tv-nav-items">
          <a class="tv-nav-item" href="/" target="_blank" @click="navMenuOpen = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3c3.5 4 3.5 14 0 18M12 3c-3.5 4-3.5 14 0 18" stroke="currentColor" stroke-width="2"/></svg>
            <span>Charting</span>
          </a>
          <a class="tv-nav-item" href="/sources" target="_blank" @click="navMenuOpen = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="2"/><path d="M8 9h8M8 13h6" stroke="currentColor" stroke-width="2"/></svg>
            <span>Data Sources</span>
          </a>
          <a class="tv-nav-item" href="/builder" target="_blank" @click="navMenuOpen = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 5h14v14H5z" stroke="currentColor" stroke-width="2"/><path d="M8 9h8M8 12h5M8 15h6" stroke="currentColor" stroke-width="2"/></svg>
            <span>Chart Builder</span>
          </a>
          <a class="tv-nav-item" href="/dashboards" target="_blank" @click="navMenuOpen = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 4h7v7H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 13h7v7H4z" stroke="currentColor" stroke-width="2"/></svg>
            <span>Dashboards</span>
          </a>
          <a class="tv-nav-item" href="/dashboard-report" target="_blank" @click="navMenuOpen = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 5h18v16H3z" stroke="currentColor" stroke-width="2"/><path d="M8 10h8M8 14h6M8 18h4" stroke="currentColor" stroke-width="2"/><circle cx="6" cy="10" r="1" fill="currentColor"/><circle cx="6" cy="14" r="1" fill="currentColor"/><circle cx="6" cy="18" r="1" fill="currentColor"/></svg>
            <span>Laporan</span>
          </a>
          <a class="tv-nav-item" href="/templates" target="_blank" @click="navMenuOpen = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 4h9l3 3v13H6z" stroke="currentColor" stroke-width="2"/><path d="M9 10h6M9 13h6M9 16h4" stroke="currentColor" stroke-width="2"/></svg>
            <span>Templates</span>
          </a>
          <a class="tv-nav-item" href="/admin" target="_blank" @click="navMenuOpen = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" stroke="currentColor" stroke-width="2"/><path d="M4 20c1.5-3.5 6-5 8-5s6.5 1.5 8 5" stroke="currentColor" stroke-width="2"/></svg>
            <span>Admin</span>
          </a>
          <a class="tv-nav-item" href="/dfg" target="_blank" @click="navMenuOpen = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 19h16M6 17V9M12 17V5M18 17v-6" stroke="currentColor" stroke-width="2"/></svg>
            <span>DFG</span>
          </a>
          <a class="tv-nav-item" href="/process-time" target="_blank" @click="navMenuOpen = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="13" r="7" stroke="currentColor" stroke-width="2"/><path d="M12 13l3-2M9 4h6M12 4V2" stroke="currentColor" stroke-width="2"/></svg>
            <span>Process Time</span>
          </a>
        </div>
      </div>
    </aside>
    
    <!-- Chart Area -->
    <div class="tv-chart-area" ref="chartAreaRef">
      <!-- Chart Canvas with Drawing Overlay -->
      <div class="tv-chart-canvas" :class="{ 'is-empty': !categoryTabs.length }">
        <div v-if="!categoryTabs.length" class="tv-empty-tabs">
          <div class="tv-empty-tabs-visual">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
              <path d="M7 8h10M7 12h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M12 18v3M9 21h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="tv-empty-tabs-text">No tab activated. Create a new one.</div>
          <div class="tv-empty-tabs-actions">
            <button
              class="tv-add-tab-btn"
              type="button"
              @click="addCategoryTab('all', false)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              Add New Tab
            </button>
          </div>
        </div>
        <div
          class="tv-chart-scroll"
          ref="chartScrollRef"
        >
          <div class="tv-chart-scroll-inner">
            <div
              v-for="(pane, paneIndex) in paneLayout"
              :key="pane.id"
              class="tv-chart-frame tv-chart-pane"
              :class="{ 'is-subpane': !pane.isMain, 'is-resizing': resizePaneId === pane.id }"
              :style="{ height: pane.height + 'px', position: 'relative' }"
            >
              <ProcurementChart
                :key="`${pane.id}-${pane.mode || 'main'}-${pane.indicatorId || pane.symbols.join(',')}-${sourceMode}-${timeframe}-${interval}-${chartType}`"
                :ref="setPaneChartRef(pane.id)"
                :chart-type="chartType"
                :data-source="sourceMode"
                :timeframe="timeframe"
                :interval="interval"
                :period-type="periodType"
                :timezone="timezoneOption"
                :year="year"
                :symbols="pane.symbols"
                :symbol-meta="buildSymbolMeta(pane.symbols)"
                :hidden-series="pane.isMain ? hiddenSeries : emptyHiddenSet"
                :color-overrides="pane.isMain ? legendColors : {}"
          :raw-mode="rawMode"
          :cumulative="cumulative"
          :single-scale="singleScale"
          :scale-side="scaleSide"
          :y-axis-override="pane.isMain ? activeYAxisOverride : undefined"
          :y-axis-by-symbol-override="pane.isMain ? activeYAxisBySymbolOverride : undefined"
          :sumber-dana="sumberDana"
          :kategori-plant="kategoriPlant"
          :theme="theme"
          :hidden-pred-ids="hiddenPredIds"
          :overlay-indicators="pane.mode === 'indicator' ? [] : overlayIndicatorConfigs"
          :indicator-pane="pane.mode === 'indicator' && pane.indicatorEngine
            ? { engine: pane.indicatorEngine, period: pane.indicatorPeriod || 14, id: pane.indicatorId || pane.id }
            : null"
                :height="pane.height"
                @data-loaded="(data) => onPaneDataLoaded(pane.id, data)"
                @error="(msg) => onPaneError(pane.id, msg)"
              />
              <!-- Drawing Layer Overlay (canvas only, no toolbar) -->
            <DrawingLayer 
              v-if="pane.isMain"
              :ref="(el) => { if (el) drawingRef = el }"
              :height="pane.height" 
              :show-toolbar="false"
              :active-tool="activeDrawingTool"
              class="tv-drawing-overlay"
              :class="{ 'is-interactive': drawingOverlayInteractive, 'is-drawing-tool': activeDrawingTool !== 'select' }"
              @selection="onDrawingSelection"
              @drawings-changed="onDrawingsChanged"
            />
            <!-- Resize Handle - only show if not the last pane -->
            <div
              v-if="paneIndex < paneLayout.length - 1"
              class="tv-pane-resize-handle"
              :class="{ 'is-active': resizePaneId === pane.id }"
              @pointerdown="startResize($event, pane.id)"
              @dblclick.stop="resetPaneHeights"
              title="Drag to resize (double-click to reset)"
            >
              <div class="tv-pane-resize-line"></div>
              <div class="tv-pane-resize-grip">
                <svg width="14" height="10" viewBox="0 0 12 8" fill="none">
                  <path d="M2 3h8M2 5h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="tv-range-bar">
        <div class="tv-range-preset">
          <button
            v-for="opt in rangeOptions"
            :key="opt.value"
            type="button"
            class="tv-range-btn"
            :class="{ active: timeframe === opt.value }"
            @click="applyRangeChange(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
        <div class="tv-range-interval">
          <span class="tv-range-label">Interval:</span>
          <select v-model="interval" class="tv-select tv-select-interval" title="Interval" @change="applyIntervalChange(interval)">
            <option
              v-for="opt in effectiveIntervalOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
          <button type="button" class="tv-range-btn" @click="resetAllChartsToAutoViewport">Auto</button>
          <button type="button" class="tv-range-btn" @click="fitAllCharts">Fit</button>
        </div>
      </div>
        
        <!-- Collapsible Legend + Tabs Group -->
        <div class="tv-legend-group">
          <div class="tv-legend-overlay" :class="{ 'is-collapsed': legendCollapsed }">
            <button class="tv-legend-toggle" @click="legendCollapsed = !legendCollapsed" title="Toggle Legend">
              <svg 
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                :class="{ 'chevron-rotated': !legendCollapsed }"
              >
                <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            
            <div class="tv-legend-content" v-show="!legendCollapsed">
              <div 
                v-for="(symbol, idx) in allPaneSymbols" 
                :key="symbol" 
                class="tv-legend-row"
                :class="{ 'tv-legend-row--hidden': hiddenSeries.has(symbol) }"
                :title="formatLegendTooltip(symbol)"
              >
                <span 
                  class="tv-legend-color-dot" 
                  :style="{ backgroundColor: getLegendColor(symbol, idx), borderColor: getLegendColor(symbol, idx) }"
                ></span>
                <span class="tv-legend-symbol">
                  {{ formatLegendText(symbol) }}
                </span>
                <div class="tv-legend-actions">
                  <button
                    class="tv-legend-action"
                    :class="{ 'is-active': !hiddenSeries.has(symbol) }"
                    type="button"
                    @click.stop="toggleSeriesVisibility(symbol)"
                    :title="hiddenSeries.has(symbol) ? 'Show series' : 'Hide series'"
                  >
                    <svg v-if="hiddenSeries.has(symbol)" width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M3 3l18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      <path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      <path d="M9.88 5.08A10.94 10.94 0 0 1 12 5c6.5 0 10 7 10 7a18.53 18.53 0 0 1-3.3 4.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      <path d="M6.1 6.1C3.7 7.9 2 10 2 10s3.5 7 10 7c1.2 0 2.3-.2 3.3-.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" stroke="currentColor" stroke-width="2"/>
                      <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                    </svg>
                  </button>
                  <button
                    class="tv-legend-action is-trash"
                    type="button"
                    @click.stop="removeSymbol(symbol)"
                    title="Remove series"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M3 6h18" stroke="currentColor" stroke-width="2"/>
                      <path d="M8 6V4h8v2" stroke="currentColor" stroke-width="2"/>
                      <path d="M6 6l1 14h10l1-14" stroke="currentColor" stroke-width="2"/>
                      <path d="M10 10v8M14 10v8" stroke="currentColor" stroke-width="2"/>
                    </svg>
                  </button>
                  <button
                    class="tv-legend-action is-cog"
                    type="button"
                    @click.stop="toggleLegendSettings(symbol)"
                    title="Legend settings"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" stroke="currentColor" stroke-width="2"/>
                      <path d="M19.4 15a7.8 7.8 0 0 0 .1-1 7.8 7.8 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-1.7-1l-.3-2.6H9l-.3 2.6a7.6 7.6 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.8 7.8 0 0 0-.1 1 7.8 7.8 0 0 0 .1 1l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 1.7 1l.3 2.6h6l.3-2.6a7.6 7.6 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6z" stroke="currentColor" stroke-width="2"/>
                    </svg>
                  </button>
                </div>
                <div
                  v-if="activeLegendSettings === symbol"
                  class="tv-legend-settings"
                  @click.stop
                >
                  <div class="tv-legend-settings-row">
                    <label class="tv-legend-settings-label">Name</label>
                    <input
                      class="tv-legend-settings-input"
                      type="text"
                      :value="legendNames[symbol] ?? symbol"
                      @input="updateLegendName(symbol, ($event.target as HTMLInputElement).value)"
                      placeholder="Legend name"
                    />
                  </div>
                  <div class="tv-legend-settings-row">
                    <label class="tv-legend-settings-label">Color</label>
                    <input
                      class="tv-legend-settings-color"
                      type="color"
                      :value="legendColors[symbol] ?? getLegendColor(symbol, idx)"
                      @input="updateLegendColor(symbol, ($event.target as HTMLInputElement).value)"
                    />
                  </div>
                </div>
              </div>
              <div class="tv-legend-empty" v-if="!allPaneSymbols.length">
                No series selected
              </div>
              <div v-if="activePredictionIndicators.length" class="tv-prediction-legend">
                <div class="tv-prediction-legend-title">Prediction Overlays</div>
                <div
                  v-for="item in activePredictionIndicators"
                  :key="item.id"
                  class="tv-prediction-legend-row"
                  :class="{ 'is-hidden': hiddenPredIds.has(item.id) }"
                >
                  <span class="tv-prediction-legend-badge" :style="{ background: item.color }"></span>
                  <span class="tv-prediction-legend-label">{{ item.label }}</span>
                  <span class="tv-prediction-legend-note">{{ item.note }}</span>
                  <span class="tv-prediction-legend-actions">
                    <button
                      class="tv-legend-action"
                      type="button"
                      :title="hiddenPredIds.has(item.id) ? 'Show' : 'Hide'"
                      @click.stop="toggleHidePred(item.id)"
                    >
                      <svg v-if="!hiddenPredIds.has(item.id)" width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2"/>
                        <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                      </svg>
                      <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      </svg>
                    </button>
                    <button
                      class="tv-legend-action is-trash"
                      type="button"
                      title="Remove overlay"
                      @click.stop="selectOverlayIndicator(item.id)"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      </svg>
                    </button>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div class="tv-category-bar">
            <button class="tv-new-tab-btn is-tab" type="button" @click="openSearchModal" title="Tambah data">
              <span class="tv-new-tab-plus">+</span>
              <span class="tv-new-tab-balloon">Tambah data</span>
            </button>
            <button class="tv-new-tab-btn is-tab" type="button" @click="addCategoryTab('all', false)" title="Tab baru">
              <span class="tv-new-tab-plus">+</span>
              <span class="tv-new-tab-balloon">Tab baru</span>
            </button>
            <div class="tv-category-tabs">
              <div
                v-for="tab in categoryTabs"
                :key="tab.id"
                :class="['tv-category-tab', { active: activeCategoryTabId === tab.id }]"
                @click="activeCategoryTabId = tab.id"
                @dblclick.stop="startRenameTab(tab)"
              >
                <span class="tv-category-indicator" :class="{ 'is-active': activeCategoryTabId === tab.id }"></span>
                <span v-if="editingTabId !== tab.id">{{ tab.label }}</span>
                <input
                  v-else
                  v-model="editingTabLabel"
                  class="tv-category-tab-input"
                  type="text"
                  @click.stop
                  @keydown.enter.prevent="commitRenameTab(tab)"
                  @keydown.esc.prevent="cancelRenameTab"
                  @blur="commitRenameTab(tab)"
                />
                <button class="tv-category-cog" type="button" title="Tab settings" @click.stop="toggleTabSettings(tab)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" stroke="currentColor" stroke-width="2"/>
                    <path d="M19.4 15a7.8 7.8 0 0 0 .1-1 7.8 7.8 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-1.7-1l-.3-2.6H9l-.3 2.6a7.6 7.6 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.8 7.8 0 0 0-.1 1 7.8 7.8 0 0 0 .1 1l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 1.7 1l.3 2.6h6l.3-2.6a7.6 7.6 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6z" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </button>
                <button class="tv-category-close" type="button" title="Close tab" @click.stop="closeCategoryTab(tab.id)" aria-label="Close tab">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </button>
                <div
                  v-if="activeTabSettingsId === tab.id"
                  class="tv-tab-settings"
                  @click.stop
                >
                  <div class="tv-tab-settings-row">
                    <label class="tv-tab-settings-label">Name</label>
                    <input
                      class="tv-tab-settings-input"
                      type="text"
                      v-model="tabSettingsName"
                      @keydown.enter.prevent="commitTabSettingsName(tab)"
                      @keydown.esc.prevent="closeTabSettings"
                    />
                  </div>
                  <button class="tv-tab-settings-save" type="button" @click="commitTabSettingsName(tab)">
                    Save
                  </button>
                </div>
              </div>
            </div>
            <!-- Menu removed: New button now directly creates a tab -->
          </div>
        </div>
      </div>
      
      <!-- Object Tree Panel -->
      <div class="tv-panel tv-object-tree" v-if="showObjectTree" :style="objectTreePanelStyle">
        <div class="tv-panel-header">
          <span>Drawing Objects</span>
          <button class="tv-panel-close" @click="showObjectTree = false" aria-label="Close drawing objects">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="tv-panel-body">
          <div v-if="drawingRef" class="tv-object-list">
            <div class="tv-object-empty" v-if="drawingCount === 0">
              No drawings yet
            </div>
            <template v-else>
              <div 
                v-for="(drawing, idx) in drawingList" 
                :key="idx"
                class="tv-object-item"
              >
                <span class="tv-object-color" :style="{ backgroundColor: drawing.color }"></span>
                <span class="tv-object-name">{{ drawing.type }}</span>
                <button class="tv-object-delete" @click="deleteDrawing(idx)" aria-label="Delete drawing">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M3 6h18" stroke="currentColor" stroke-width="2"/>
                    <path d="M8 6V4h8v2" stroke="currentColor" stroke-width="2"/>
                    <path d="M6 6l1 14h10l1-14" stroke="currentColor" stroke-width="2"/>
                    <path d="M10 10v8M14 10v8" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Layers Panel -->
      <div class="tv-panel tv-layers-panel" :class="{ 'is-shifted': showObjectTree }" v-if="showLayersPanel" :style="layersPanelStyle">
        <div class="tv-panel-header">
          <span>Layers</span>
          <button class="tv-panel-close" @click="showLayersPanel = false" aria-label="Close layers">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="tv-panel-body">
          <div class="tv-layer-tabs" role="tablist" aria-label="Layer views">
            <button
              type="button"
              class="tv-layer-tab"
              :class="{ active: activeLayersTab === 'objects' }"
              @click="activeLayersTab = 'objects'"
            >
              Objects
            </button>
            <button
              type="button"
              class="tv-layer-tab"
              :class="{ active: activeLayersTab === 'dataWindow' }"
              @click="activeLayersTab = 'dataWindow'"
            >
              Data Window
            </button>
          </div>

          <div v-if="activeLayersTab === 'objects'" class="tv-layer-tab-panel">
            <div class="tv-layer-section">
              <div class="tv-layer-title">Data Series</div>
              <div class="tv-layer-empty" v-if="!allPaneSymbols.length">No series selected</div>
              <template v-for="symbol in allPaneSymbols" :key="symbol">
                <div 
                  class="tv-layer-item tv-layer-item-interactive"
                  @click="toggleLayerDetails(symbol)"
                >
                  <span class="tv-layer-icon" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M4 19h16" stroke="currentColor" stroke-width="2"/>
                      <path d="M7 15l3-3 3 2 4-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </span>
                  <span class="tv-layer-name">{{ symbol }}</span>
                  <button class="tv-layer-delete" @click.stop="removeSymbol(symbol)" title="Remove series" aria-label="Remove series">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M3 6h18" stroke="currentColor" stroke-width="2"/>
                      <path d="M8 6V4h8v2" stroke="currentColor" stroke-width="2"/>
                      <path d="M6 6l1 14h10l1-14" stroke="currentColor" stroke-width="2"/>
                      <path d="M10 10v8M14 10v8" stroke="currentColor" stroke-width="2"/>
                    </svg>
                  </button>
                </div>
              </template>
            </div>
            <div class="tv-layer-section">
              <div class="tv-layer-title">Drawings</div>
              <div 
                class="tv-layer-item tv-layer-item-interactive" 
                v-if="drawingCount > 0"
                @click="clearDrawings"
              >
                <span class="tv-layer-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M4 20l4.5-1 9.5-9.5-3.5-3.5L5 15.5 4 20z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M13.5 6.5l3.5 3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </span>
                <span class="tv-layer-name">Drawing Layer ({{ drawingCount }} objects)</span>
                <span class="tv-layer-action">Clear</span>
              </div>
              <div class="tv-layer-empty" v-else>No drawings</div>
            </div>
          </div>

          <div v-else class="tv-layer-tab-panel">
            <div class="tv-layer-section">
              <div class="tv-layer-title">Data Window</div>
              <div class="tv-layer-empty" v-if="!currentLayerSymbol">No series selected</div>
              <template v-else>
                <div class="tv-data-window-symbols" v-if="allPaneSymbols.length > 1">
                  <button
                    v-for="symbol in allPaneSymbols"
                    :key="symbol"
                    type="button"
                    class="tv-data-window-symbol-btn"
                    :class="{ active: currentLayerSymbol === symbol }"
                    @click="activeLayerSymbol = symbol"
                  >
                    {{ symbol }}
                  </button>
                </div>
                <div class="tv-data-window-card">
                  <div class="tv-data-window-row">
                    <span>Name</span>
                    <strong>{{ selectedSymbolMeta[currentLayerSymbol]?.name || currentLayerSymbol }}</strong>
                  </div>
                  <div class="tv-data-window-row">
                    <span>Description</span>
                    <strong>{{ selectedSymbolMeta[currentLayerSymbol]?.description || '-' }}</strong>
                  </div>
                  <div class="tv-data-window-row">
                    <span>Unit</span>
                    <strong>{{ selectedSymbolMeta[currentLayerSymbol]?.unit || '-' }}</strong>
                  </div>
                  <div class="tv-data-window-row">
                    <span>Open</span>
                    <strong>{{ getLayerValue(currentLayerSymbol, 'open') }}</strong>
                  </div>
                  <div class="tv-data-window-row">
                    <span>High</span>
                    <strong>{{ getLayerValue(currentLayerSymbol, 'high') }}</strong>
                  </div>
                  <div class="tv-data-window-row">
                    <span>Low</span>
                    <strong>{{ getLayerValue(currentLayerSymbol, 'low') }}</strong>
                  </div>
                  <div class="tv-data-window-row">
                    <span>Last</span>
                    <strong>{{ getLayerLastValue(currentLayerSymbol) }}</strong>
                  </div>
                  <div class="tv-data-window-row">
                    <span>Prev Close</span>
                    <strong>{{ getLayerValue(currentLayerSymbol, 'previous') }}</strong>
                  </div>
                  <div class="tv-data-window-row">
                    <span>Change</span>
                    <strong>{{ getLayerValue(currentLayerSymbol, 'change') }}</strong>
                  </div>
                  <div class="tv-data-window-row">
                    <span>Change %</span>
                    <strong>{{ getLayerValue(currentLayerSymbol, 'changePct') }}</strong>
                  </div>
                  <div class="tv-data-window-row">
                    <span>Volume</span>
                    <strong>{{ getLayerValue(currentLayerSymbol, 'volume') }}</strong>
                  </div>
                  <div class="tv-data-window-row">
                    <span>Date</span>
                    <strong>{{ getLayerLastDate(currentLayerSymbol) }}</strong>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Compact Summary Bar - Always visible -->
      <div class="tv-summary-bar">
        <template v-if="summaryData">
          <div class="tv-summary-item">
            <span class="tv-summary-label">Watchlist:</span>
            <span class="tv-summary-value">{{ summaryData.series.length }} symbols</span>
          </div>
          <div class="tv-summary-series">
            <div
              v-for="series in summaryData.series"
              :key="series.symbol"
              class="tv-summary-series-item"
            >
              <span class="tv-summary-dot" :style="{ backgroundColor: series.color }"></span>
              <span class="tv-summary-series-name">{{ getLegendName(series.symbol) }}</span>
              <span class="tv-summary-series-metric">Last {{ formatValue(series.latest, series.unit) }}</span>
              <span class="tv-summary-series-metric" :class="series.change >= 0 ? 'is-up' : 'is-down'">
                Chg {{ formatSignedValue(series.change, series.unit) }}
              </span>
              <span class="tv-summary-series-metric" :class="series.changePct >= 0 ? 'is-up' : 'is-down'">
                {{ formatPercent(series.changePct) }}
              </span>
              <span class="tv-summary-date">{{ series.latestDate || '' }}</span>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="tv-summary-item">
            <span class="tv-summary-label">Data tidak tersedia untuk filter ini</span>
          </div>
        </template>
      </div>
    </div>
    
    <div class="tv-right-stack">
      <!-- Right Sidebar: Drawing Properties (only when selected) -->
      <aside class="tv-sidebar tv-drawing-sidebar" v-if="selectedDrawing">
        <button class="tv-drawing-close" type="button" title="Close properties" @click="clearSelectedDrawing" aria-label="Close properties">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        <div class="tv-drawing-prop">
          <div class="tv-drawing-label">Line</div>
          <input
            class="tv-drawing-input"
            type="text"
            v-model="selectedDrawingName"
            @keydown.enter.prevent="commitSelectedDrawingName"
            @blur="commitSelectedDrawingName"
            :placeholder="selectedDrawing.type"
          />
        </div>
        <button class="tv-drawing-trash" type="button" title="Delete drawing" @click="deleteSelectedDrawing">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18" stroke="currentColor" stroke-width="2"/>
            <path d="M8 6V4h8v2" stroke="currentColor" stroke-width="2"/>
            <path d="M6 6l1 14h10l1-14" stroke="currentColor" stroke-width="2"/>
            <path d="M10 10v8M14 10v8" stroke="currentColor" stroke-width="2"/>
          </svg>
          Delete
        </button>
        <div class="tv-sidebar-divider"></div>
        <div class="tv-drawing-prop">
          <div class="tv-drawing-label">Color</div>
          <label class="tv-drawing-color-picker">
            <input
              type="color"
              class="tv-drawing-color-input"
              :value="selectedDrawing.color"
              @input="updateSelectedDrawingColor(($event.target as HTMLInputElement).value)"
            />
            <span class="tv-drawing-color" :style="{ backgroundColor: selectedDrawing.color }"></span>
          </label>
        </div>
      </aside>

      <!-- Right Navbar -->
      <aside class="tv-sidebar tv-sidebar-right">
      <button class="tv-sidebar-btn" ref="objectTreeBtnRef" :class="{ active: showObjectTree }" @click="showObjectTree = !showObjectTree" title="Object Tree">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 3h18v18H3z" stroke="currentColor" stroke-width="2"/>
            <path d="M7 12h10M7 8h6M7 16h8" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
      <button class="tv-sidebar-btn" ref="layersBtnRef" :class="{ active: showLayersPanel }" @click="showLayersPanel = !showLayersPanel" title="Layers">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" stroke-width="2"/>
            <path d="M2 17l10 5 10-5" stroke="currentColor" stroke-width="2"/>
            <path d="M2 12l10 5 10-5" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
      </aside>
    </div>
  </main>

  <!-- Search Modal with TradingView-style Filters -->
  <div class="search-modal" :class="{ 'is-open': searchModalOpen }" :aria-hidden="!searchModalOpen">
    <div class="search-modal-backdrop" @click="closeSearchModal"></div>
    <div class="search-modal-panel" role="dialog" aria-modal="true" :aria-label="searchModalLabel">
      <div class="search-modal-header">
        <div class="search-modal-title">{{ searchModalLabel }}</div>
        <button type="button" class="search-modal-close" @click="closeSearchModal" aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      
      <!-- Search Input -->
      <div class="search-modal-input">
        <input 
          ref="searchInput"
          v-model="searchQuery" 
          type="text" 
          class="search-input" 
          :placeholder="searchPlaceholder" 
          @input="filterSymbols"
        />
      </div>
      
      <!-- Category Filter Tabs (Search only) -->
      <div class="search-filter-tabs">
        <button
          v-for="opt in categoryOptions"
          :key="opt.value"
          :class="['filter-tab', { active: activeSearchCategory === opt.value }]"
          @click="activeSearchCategory = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
      
      <!-- Search Results -->
      <div class="search-dropdown search-results">
        <div v-if="loadingSymbols" class="search-loading">Loading...</div>
        <div v-else-if="filteredSymbols.length === 0" class="search-empty">Tidak ada hasil.</div>
        
        <!-- Symbol Items with Scale Options -->
        <div 
          v-for="sym in filteredSymbols" 
          :key="sym.symbol"
          class="search-item-wrapper"
          :class="{ 'show-scale-options': hoveredSymbol === sym.symbol }"
          @mouseenter="hoveredSymbol = sym.symbol"
          @mouseleave="hoveredSymbol = null"
        >
          <button 
            type="button"
            class="search-item"
            :class="{ 
              'is-selected': allPaneSymbolsSet.has(sym.symbol),
              'is-nilai': sym.symbolType === 'nilai',
              'is-dokumen': sym.symbolType === 'dokumen'
            }"
            @click="selectSymbolWithScale(sym, 'same')"
          >
            <!-- Type Icon -->
            <span class="search-item-icon" :class="sym.symbolType">
              <svg v-if="sym.symbolType === 'dokumen'" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 2h9l5 5v15H6z" stroke="currentColor" stroke-width="2"/><path d="M14 2v5h5" stroke="currentColor" stroke-width="2"/><path d="M8 10h8M8 14h6" stroke="currentColor" stroke-width="2"/></svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2v20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M16.5 6.5c0-1.9-1.6-3.5-4.5-3.5s-4.5 1.2-4.5 3.2c0 1.9 1.8 2.7 4.6 3.3 2.8.6 4.4 1.3 4.4 3.2 0 2.2-2 3.3-4.5 3.3s-4.5-1.1-4.5-3.3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </span>
            <span class="search-item-content">
              <span class="search-item-code">{{ sym.symbol }}</span>
              <span class="search-item-desc" v-if="sym.description">{{ sym.description }}</span>
            </span>
            <span class="search-item-unit">{{ sym.unit }}</span>
          </button>
          
          <!-- Scale Options (shown on hover) -->
          <div class="scale-options" v-if="hoveredSymbol === sym.symbol">
            <button 
              v-if="!allPaneSymbolsSet.has(sym.symbol)"
              class="scale-btn" 
              title="Same scale"
              @click.stop="selectSymbolWithScale(sym, 'percent')"
            >Same</button>
            <button 
              v-if="!allPaneSymbolsSet.has(sym.symbol)"
              class="scale-btn" 
              title="New price scale (separate Y-axis)"
              @click.stop="selectSymbolWithScale(sym, 'scale')"
            >New scale</button>
            <button 
              class="scale-btn" 
              title="New pane (separate chart)"
              @click.stop="selectSymbolWithScale(sym, 'pane')"
            >{{ allPaneSymbolsSet.has(sym.symbol) ? 'Move to new pane' : 'New pane' }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { authFetch } from '../utils/auth'
import ProcurementChart from './ProcurementChart.vue'
import DrawingLayer from './DrawingLayer.vue'

// Types
interface SymbolItem {
  symbol: string
  name: string
  category: string
  description: string
  unit: string
  symbolType?: 'dokumen' | 'nilai' | 'filter'  // NEW: type differentiation
  baseSymbol?: string  // NEW: reference to original symbol for -N variants
  sumber_dana?: string
  kategori_plant?: string
  provider?: 'yahoo-finance' | 'research' | 'economy'
}

interface SummarySeries {
  symbol: string
  total: number
  latest: number
  previous: number
  change: number
  changePct: number
  open?: number
  high?: number
  low?: number
  volume?: number
  latestTimestamp?: number
  latestDate?: string
  color: string
  unit: string
}

interface SummaryData {
  totalAll: number
  unit: string | null
  totalByUnit: Record<string, number>
  series: SummarySeries[]
}

interface IndicatorDefinition {
  id: string
  label: string
  kind: 'overlay' | 'pane'
  engine: 'none' | 'sma' | 'ema' | 'atr6' | 'atr12' | 'pred_bilstm' | 'pred_lstm' | 'pred_arima' | 'rsi' | 'macd' | 'stoch' | 'volume'
  period: number
  sourceField?: 'open' | 'high' | 'low' | 'close'
  source: 'system' | 'user'
  builtin?: boolean
}

type PriceSource = 'open' | 'high' | 'low' | 'close'
type DataSourceMode = 'yahoo' | 'research' | 'economy'

// Chart types
const chartTypes = [
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
  { value: 'bar', label: 'Bar' },
  { value: 'candlestick', label: 'Candle' }
] as const

const rangeOptions = [
  { value: '1D', label: '1D' },
  { value: '5D', label: '5D' },
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '6M', label: '6M' },
  { value: 'YTD', label: 'YTD' },
  { value: '1Y', label: '1Y' },
  { value: '2Y', label: '2Y' },
  { value: '3Y', label: '3Y' },
  { value: '5Y', label: '5Y' },
  { value: '72M', label: '6Y' },
  { value: 'ALL', label: 'ALL' }
] as const

const intervalOptions = [
  { value: '15m', label: '15 min' },
  { value: '30m', label: '30 min' },
  { value: '1h', label: '1 hour' },
  { value: '4h', label: '4 hour' },
  { value: '1D', label: '1 day' },
  { value: '5D', label: '5 day' },
  { value: '1W', label: '1 week' },
  { value: '1M', label: '1 month' },
  { value: '3M', label: '3 month' }
] as const

const economyIntervalOptions = [
  { value: '1Y', label: '1 year' }
] as const

const timezoneOptions = [
  { value: 'auto', label: 'TZ Auto' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'New York' },
  { value: 'Asia/Jakarta', label: 'Jakarta' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Asia/Tokyo', label: 'Tokyo' }
] as const

// Colors for series
const colors = [
  '#2962ff', '#26a69a', '#ef5350', '#ab47bc', '#ff9800',
  '#00bcd4', '#8bc34a', '#e91e63', '#3f51b5', '#009688'
]

// Theme state
type Theme = 'light' | 'dark'
const theme = ref<Theme>((localStorage.getItem('theme') as Theme) || 'dark')

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.body.dataset.theme = theme.value
  localStorage.setItem('theme', theme.value)
}

// Drawing tools definition - MUST match DrawingLayer tool IDs
const drawingTools = [
  { id: 'select', label: 'Select', icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 4l7 18 2-7 7-2z" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
  { id: 'hline', label: 'Horizontal Line', icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 12h16" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
  { id: 'vline', label: 'Vertical Line', icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 4v16" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
  { id: 'trendline', label: 'Trendline', icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 20L20 4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="4" cy="20" r="2" fill="currentColor"/><circle cx="20" cy="4" r="2" fill="currentColor"/></svg>' },
  { id: 'freedraw', label: 'Free Draw', icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M3 17c3-3 6-2 9-5s3-6 6-6" fill="none" stroke="currentColor" stroke-width="2"/></svg>' }
]

const activeDrawingTool = ref('select')

function setDrawingTool(toolId: string) {
  activeDrawingTool.value = toolId
  // TODO: Communicate with DrawingLayer if needed
}

function clearDrawings() {
  console.log('[ChartApp] clearDrawings called, drawingRef:', drawingRef)
  if (drawingRef && typeof drawingRef?.clearAll === 'function') {
    drawingRef?.clearAll()
  } else {
    console.warn('[ChartApp] clearAll not available on drawingRef')
  }
}

// Chart ref
const chartRef = ref<InstanceType<typeof ProcurementChart> | null>(null)
const paneChartRefs = new Map<string, InstanceType<typeof ProcurementChart> | null>()

function setPaneChartRef(paneId: string) {
  return (el: InstanceType<typeof ProcurementChart> | null) => {
    if (paneId === 'main') chartRef.value = el
    if (!el) {
      paneChartRefs.delete(paneId)
    } else {
      paneChartRefs.set(paneId, el)
    }
  }
}

function applyToCharts(fn: (chart: InstanceType<typeof ProcurementChart>) => void) {
  paneChartRefs.forEach((chart) => {
    if (chart) fn(chart)
  })
}

function zoomAllIn() {
  applyToCharts((chart) => chart.zoomIn?.())
}

function zoomAllOut() {
  applyToCharts((chart) => chart.zoomOut?.())
}

function refreshAllCharts() {
  applyToCharts((chart) => chart.refresh?.())
}

function fitAllCharts() {
  applyToCharts((chart) => chart.fitContent?.())
}

function resetAllChartsToAutoViewport() {
  const activeId = activeCategoryTabId.value
  if (activeId) {
    clearYAxisOverrides(activeId)
  }
  nextTick(() => {
    applyToCharts((chart) => {
      chart.resetPriceScale?.()
      chart.resetViewport?.()
    })
  })
}
let drawingRef: InstanceType<typeof DrawingLayer> | null = null
const selectedDrawing = ref<{ type: string; points: number[]; color: string; name?: string } | null>(null)
const selectedDrawingIndex = ref<number | null>(null)
const selectedDrawingName = ref('')

// Computed properties for drawings to ensure reactivity
const drawingList = computed(() => {
  return drawingRef?.drawings || []
})

const drawingCount = computed(() => {
  return drawingRef?.drawings?.length || 0
})

const drawingOverlayInteractive = computed(() => {
  if (activeDrawingTool.value !== 'select') return true
  return drawingCount.value > 0
})

// Panel visibility state
const showObjectTree = ref(false)
const showLayersPanel = ref(false)
const activeLayersTab = ref<'objects' | 'dataWindow'>('objects')
const legendCollapsed = ref(false)
const indicatorMenuOpen = ref(false)
const indicatorMenuStyle = ref<Record<string, string>>({})
const chartAreaRef = ref<HTMLElement | null>(null)
const objectTreeBtnRef = ref<HTMLElement | null>(null)
const layersBtnRef = ref<HTMLElement | null>(null)
const indicatorButtonRef = ref<HTMLElement | null>(null)
const objectTreePanelStyle = ref<Record<string, string>>({})
const layersPanelStyle = ref<Record<string, string>>({})

// Get symbol value from summary data
function getSymbolValue(symbol: string): number | undefined {
  if (!summaryData.value?.series) return undefined
  const series = summaryData.value.series.find(s => s.symbol === symbol)
  return series?.latest
}

// Delete drawing by index
function deleteDrawing(idx: number) {
  if (drawingRef?.deleteDrawing) {
    drawingRef?.deleteDrawing(idx)
    // The drawingRef's deleteDrawing will emit drawingsChanged event
    // which triggers onDrawingsChanged to update selection state
  }
}

function onDrawingSelection(payload: { drawing: { type: string; points: number[]; color: string; name?: string }; index: number } | null) {
  selectedDrawing.value = payload?.drawing || null
  selectedDrawingIndex.value = payload?.index ?? null
  selectedDrawingName.value = payload?.drawing?.name || ''
}

// Handler for when drawings change (added/deleted)
function onDrawingsChanged(count: number) {
  console.log('Drawings changed, count:', count)
  // If no drawings left, clear selection
  if (count === 0) {
    selectedDrawing.value = null
    selectedDrawingIndex.value = null
    selectedDrawingName.value = ''
  } else if (selectedDrawingIndex.value !== null && selectedDrawingIndex.value >= count) {
    // Selected index is now out of bounds, clear it
    selectedDrawing.value = null
    selectedDrawingIndex.value = null
    selectedDrawingName.value = ''
  }
}

function commitSelectedDrawingName() {
  if (!drawingRef || !selectedDrawing.value) return
  const drawings = drawingRef?.drawings
  if (selectedDrawingIndex.value === null) return
  const matchIndex = selectedDrawingIndex.value
  const nextName = selectedDrawingName.value.trim()
  drawingRef?.pushHistory?.()
  drawings[matchIndex].name = nextName || undefined
  selectedDrawing.value = { ...drawings[matchIndex] }
  drawingRef?.redraw?.()
}

function updateSelectedDrawingColor(nextColor: string) {
  if (!drawingRef || !selectedDrawing.value) return
  if (selectedDrawingIndex.value === null) return
  const drawings = drawingRef?.drawings
  const matchIndex = selectedDrawingIndex.value
  drawingRef?.pushHistory?.()
  drawings[matchIndex].color = nextColor
  selectedDrawing.value = { ...drawings[matchIndex] }
  drawingRef?.redraw?.()
}

function clearYAxisOverrides(tabId?: string) {
  if (!tabId) {
    yAxisOverrideByTab.value = {}
    yAxisBySymbolOverrideByTab.value = {}
    return
  }
  const next = { ...yAxisOverrideByTab.value }
  const nextBySymbol = { ...yAxisBySymbolOverrideByTab.value }
  delete next[tabId]
  delete nextBySymbol[tabId]
  yAxisOverrideByTab.value = next
  yAxisBySymbolOverrideByTab.value = nextBySymbol
}

function deleteSelectedDrawing() {
  if (selectedDrawingIndex.value === null) return
  deleteDrawing(selectedDrawingIndex.value)
  selectedDrawing.value = null
  selectedDrawingIndex.value = null
  selectedDrawingName.value = ''
}

function clearSelectedDrawing() {
  selectedDrawing.value = null
  selectedDrawingIndex.value = null
  selectedDrawingName.value = ''
}

// Chart state
const sourceMode = ref<DataSourceMode>('yahoo')
const chartType = ref<'line' | 'area' | 'bar' | 'candlestick' | 'ohlc'>('line')
const timeframe = ref<'1D' | '5D' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | '2Y' | '3Y' | '5Y' | '72M' | 'ALL'>('1Y')
const interval = ref<'15m' | '30m' | '1h' | '4h' | '1D' | '5D' | '1W' | '1M' | '3M' | '1Y'>('1D')
const timezoneOption = ref<'auto' | 'UTC' | 'America/New_York' | 'Asia/Jakarta' | 'Europe/London' | 'Asia/Tokyo'>('auto')
const periodType = ref<'calendar' | 'fiscal'>('calendar')
const year = ref(2025)
const rawMode = ref(false)
const cumulative = ref(false)
const singleScale = ref(false)
const scaleSide = ref<'left' | 'right'>('left')
const sumberDana = ref('')
const kategoriPlant = ref('')
const maxSeries = ref(5) // Default max 5 series
const selectedSymbols = ref<string[]>([])
const selectedSymbolsByTab = ref<Record<string, string[]>>({})
const switchingTab = ref(false)
const hiddenSeries = ref<Set<string>>(new Set())
const hiddenPredIds = ref<Set<string>>(new Set())
const legendColors = ref<Record<string, string>>({})
const legendNames = ref<Record<string, string>>({})
const activeLegendSettings = ref<string | null>(null)
const extraPanesByTab = ref<Record<string, PaneState[]>>({})
const indicatorRegistry = ref<IndicatorDefinition[]>([])
const indicatorRegistryLoading = ref(false)
const indicatorRegistryError = ref('')
const activeOverlayIndicatorIds = ref<string[]>(['overlay-none'])
const activePaneIndicatorIds = ref<string[]>([])
const overlayIndicatorSettingsById = ref<Record<string, { period: number; sourceField: PriceSource }>>({})
const activeOverlayIndicatorIdsByTab = ref<Record<string, string[]>>({})
const activePaneIndicatorIdsByTab = ref<Record<string, string[]>>({})
const overlayIndicatorSettingsByTab = ref<Record<string, Record<string, { period: number; sourceField: PriceSource }>>>({})
const activeOverlaySettingsId = ref<string | null>(null)
const showIndicatorCreateForm = ref(false)
const indicatorCreateSubmitting = ref(false)
const indicatorCreateError = ref('')
const newIndicatorForm = ref<{
  label: string
  kind: 'pane'
  engine: 'rsi' | 'stoch'
  period: number
  sourceField: PriceSource
}>({
  label: '',
  kind: 'pane',
  engine: 'rsi',
  period: 14,
  sourceField: 'close'
})
const activeLayerSymbol = ref<string | null>(null)
const emptyHiddenSet = new Set<string>()
const currentLayerSymbol = computed(() => {
  if (activeLayerSymbol.value && allPaneSymbols.value.includes(activeLayerSymbol.value)) {
    return activeLayerSymbol.value
  }
  return allPaneSymbols.value[0] || null
})

const overlayIndicators = computed(() => indicatorRegistry.value.filter((item) => item.kind === 'overlay'))
const technicalOverlayIndicators = computed(() => overlayIndicators.value.filter((item) => !String(item.engine).startsWith('pred_')))
const predictionOverlayIndicators = computed(() => overlayIndicators.value.filter((item) => String(item.engine).startsWith('pred_')))
const paneIndicators = computed(() => indicatorRegistry.value.filter((item) => item.kind === 'pane'))
const predictionIndicatorPalette: Record<'pred_bilstm' | 'pred_lstm' | 'pred_arima', { color: string; note: string }> = {
  pred_bilstm: { color: 'linear-gradient(135deg, #42a5f5, #90caf9)', note: 'Biru = BiLSTM forecast' },
  pred_lstm: { color: 'linear-gradient(135deg, #ffb300, #ffd54f)', note: 'Emas = LSTM forecast' },
  pred_arima: { color: 'linear-gradient(135deg, #66bb6a, #a5d6a7)', note: 'Hijau = ARIMA forecast' }
}
const activeOverlayIndicators = computed(() => {
  const selected = overlayIndicators.value.filter((item) => activeOverlayIndicatorIds.value.includes(item.id))
  return selected.filter((item) => item.engine !== 'none')
})
const activePaneIndicators = computed(() => paneIndicators.value.filter((item) => activePaneIndicatorIds.value.includes(item.id)))
const activePredictionIndicators = computed(() => {
  return activeOverlayIndicators.value
    .filter((item) => String(item.engine).startsWith('pred_'))
    .map((item) => ({
      id: item.id,
      label: item.label,
      color: getPredictionIndicatorColor(item.engine),
      note: getPredictionIndicatorNote(item.engine)
    }))
})

const overlayIndicatorConfigs = computed(() => activeOverlayIndicators.value.map((item) => {
  const settings = getOverlayIndicatorSettings(item)
  return {
    id: item.id,
    label: item.label,
    type: item.engine as 'sma' | 'ema' | 'atr6' | 'atr12' | 'pred_bilstm' | 'pred_lstm' | 'pred_arima',
    period: settings.period,
    sourceField: settings.sourceField
  }
}))

function getPredictionIndicatorColor(engine: IndicatorDefinition['engine']) {
  if (engine === 'pred_bilstm' || engine === 'pred_lstm' || engine === 'pred_arima') {
    return predictionIndicatorPalette[engine].color
  }
  return 'linear-gradient(135deg, #64748b, #cbd5e1)'
}

function getPredictionIndicatorNote(engine: IndicatorDefinition['engine']) {
  if (engine === 'pred_bilstm' || engine === 'pred_lstm' || engine === 'pred_arima') {
    return predictionIndicatorPalette[engine].note
  }
  return 'Forecast overlay'
}

const effectiveIntervalOptions = computed(() => {
  if (sourceMode.value === 'research') {
    return intervalOptions.filter((option) => ['4h', '1D'].includes(option.value))
  }
  if (sourceMode.value === 'economy') {
    return economyIntervalOptions
  }
  return intervalOptions
})

const validIntervalsByRange: Record<typeof timeframe.value, Array<typeof interval.value>> = {
  '1D': ['15m', '30m', '1h', '4h', '1D'],
  '5D': ['15m', '30m', '1h', '4h', '1D'],
  '1M': ['15m', '30m', '1h', '4h', '1D', '5D'],
  '3M': ['1h', '4h', '1D', '5D'],
  '6M': ['1D', '5D', '1W'],
  'YTD': ['1D', '5D', '1W'],
  '1Y': ['1D', '5D', '1W', '1Y'],
  '2Y': ['1D', '5D', '1W', '1M', '1Y'],
  '3Y': ['1D', '5D', '1W', '1M', '1Y'],
  '5Y': ['1D', '5D', '1W', '1M', '3M', '1Y'],
  '72M': ['1D', '5D', '1W', '1M', '3M', '1Y'],
  'ALL': ['1D', '5D', '1W', '1M', '3M', '1Y']
}

const defaultIntervalByRange: Record<typeof timeframe.value, typeof interval.value> = {
  '1D': '15m',
  '5D': '30m',
  '1M': '1h',
  '3M': '1D',
  '6M': '1D',
  'YTD': '1D',
  '1Y': '1D',
  '2Y': '1D',
  '3Y': '1W',
  '5Y': '1W',
  '72M': '1W',
  'ALL': '1M'
}

const defaultRangeByInterval: Record<typeof interval.value, typeof timeframe.value> = {
  '15m': '1D',
  '30m': '5D',
  '1h': '1M',
  '4h': '1M',
  '1D': '1Y',
  '5D': '2Y',
  '1W': '5Y',
  '1M': 'ALL',
  '3M': 'ALL',
  '1Y': 'ALL'
}

const overlaySourceOptions: Array<{ value: PriceSource; label: string }> = [
  { value: 'close', label: 'Close' },
  { value: 'open', label: 'Open' },
  { value: 'high', label: 'High' },
  { value: 'low', label: 'Low' }
]

function isIntervalValidForRange(rangeValue: typeof timeframe.value, intervalValue: typeof interval.value): boolean {
  return validIntervalsByRange[rangeValue].includes(intervalValue)
}

function applyRangeChange(nextRange: typeof timeframe.value) {
  timeframe.value = nextRange
  if (sourceMode.value === 'research') return
  if (sourceMode.value === 'economy') {
    interval.value = '1Y'
    return
  }
  interval.value = defaultIntervalByRange[nextRange]
}

function applyIntervalChange(nextInterval: typeof interval.value) {
  if (sourceMode.value === 'research') {
    chartType.value = 'candlestick'
    interval.value = nextInterval
    return
  }
  if (sourceMode.value === 'economy') {
    interval.value = '1Y'
    return
  }
  if (isIntervalValidForRange(timeframe.value, nextInterval)) {
    interval.value = nextInterval
    return
  }
  interval.value = nextInterval
  const nextRange = defaultRangeByInterval[nextInterval]
  timeframe.value = nextRange
  if (!isIntervalValidForRange(nextRange, nextInterval)) {
    interval.value = defaultIntervalByRange[nextRange]
  }
}

const availableNewIndicatorEngines = computed(() => [
  { value: 'rsi' as const, label: 'RSI' },
  { value: 'stoch' as const, label: 'Stochastic' }
])

function getOverlayIndicatorSettings(item: IndicatorDefinition): { period: number; sourceField: PriceSource } {
  if (['atr6', 'atr12', 'pred_bilstm', 'pred_lstm', 'pred_arima'].includes(item.engine)) {
    return {
      period: Math.max(1, item.period || 1),
      sourceField: 'close'
    }
  }
  const current = overlayIndicatorSettingsById.value[item.id]
  if (current && current.period > 1) return current
  return {
    period: item.period > 1 ? item.period : 20,
    sourceField: (item.sourceField || 'close') as PriceSource
  }
}

function ensureOverlayIndicatorSettings(item: IndicatorDefinition) {
  if (item.engine === 'none') return
  const current = overlayIndicatorSettingsById.value[item.id]
  if (current && current.period > 1) return
  overlayIndicatorSettingsById.value = {
    ...overlayIndicatorSettingsById.value,
    [item.id]: getOverlayIndicatorSettings(item)
  }
}

function updateOverlayIndicatorPeriod(indicatorId: string, value: number) {
  const item = overlayIndicators.value.find((entry) => entry.id === indicatorId)
  if (!item || item.engine === 'none') return
  const current = getOverlayIndicatorSettings(item)
  overlayIndicatorSettingsById.value = {
    ...overlayIndicatorSettingsById.value,
    [indicatorId]: {
      ...current,
      period: Math.min(500, Math.max(2, Math.round(Number(value) || current.period)))
    }
  }
}

function updateOverlayIndicatorSource(indicatorId: string, value: PriceSource) {
  const item = overlayIndicators.value.find((entry) => entry.id === indicatorId)
  if (!item || item.engine === 'none') return
  const current = getOverlayIndicatorSettings(item)
  overlayIndicatorSettingsById.value = {
    ...overlayIndicatorSettingsById.value,
    [indicatorId]: {
      ...current,
      sourceField: value
    }
  }
}

function toggleHidePred(predId: string) {
  const next = new Set(hiddenPredIds.value)
  if (next.has(predId)) next.delete(predId)
  else next.add(predId)
  hiddenPredIds.value = next
}

function selectOverlayIndicator(indicatorId: string) {
  if (indicatorId === 'overlay-none') {
    activeOverlayIndicatorIds.value = ['overlay-none']
    activeOverlaySettingsId.value = null
    return
  }
  const item = overlayIndicators.value.find((entry) => entry.id === indicatorId)
  if (item) ensureOverlayIndicatorSettings(item)
  const predIds = ['overlay-pred-bilstm', 'overlay-pred-lstm', 'overlay-pred-arima']
  const isPred = predIds.includes(indicatorId)
  const current = activeOverlayIndicatorIds.value.filter((id) => id !== 'overlay-none')
  if (isPred) {
    // radio: toggle off if already active, else activate only this pred (deactivate other preds)
    if (current.includes(indicatorId)) {
      const filtered = current.filter((id) => id !== indicatorId)
      activeOverlayIndicatorIds.value = filtered.length ? filtered : ['overlay-none']
      if (activeOverlaySettingsId.value === indicatorId) activeOverlaySettingsId.value = null
    } else {
      const withoutOtherPreds = current.filter((id) => !predIds.includes(id))
      activeOverlayIndicatorIds.value = [...withoutOtherPreds, indicatorId]
    }
    return
  }
  // non-pred: multi-select toggle as before
  if (current.includes(indicatorId)) {
    const filtered = current.filter((id) => id !== indicatorId)
    activeOverlayIndicatorIds.value = filtered.length ? filtered : ['overlay-none']
    if (activeOverlaySettingsId.value === indicatorId) activeOverlaySettingsId.value = null
    return
  }
  activeOverlayIndicatorIds.value = [...current, indicatorId]
}

function toggleOverlaySettings(indicatorId: string) {
  activeOverlaySettingsId.value = activeOverlaySettingsId.value === indicatorId ? null : indicatorId
}

function togglePaneIndicator(indicatorId: string) {
  if (activePaneIndicatorIds.value.includes(indicatorId)) {
    activePaneIndicatorIds.value = activePaneIndicatorIds.value.filter((id) => id !== indicatorId)
    return
  }
  activePaneIndicatorIds.value = [...activePaneIndicatorIds.value, indicatorId]
}

function isValidRange(value: string): value is typeof timeframe.value {
  return rangeOptions.some((opt) => opt.value === value)
}

function isValidInterval(value: string): value is typeof interval.value {
  return intervalOptions.some((opt) => opt.value === value)
}

function toggleLayerDetails(symbol: string) {
  activeLayerSymbol.value = symbol
}

function updateIndicatorMenuPosition() {
  const button = indicatorButtonRef.value
  if (!button) return
  const rect = button.getBoundingClientRect()
  const maxWidth = 280
  const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - maxWidth - 8))
  indicatorMenuStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 6}px`,
    left: `${left}px`,
    zIndex: '3000'
  }
}

function toggleIndicatorMenu() {
  indicatorMenuOpen.value = !indicatorMenuOpen.value
  if (indicatorMenuOpen.value) {
    nextTick(() => {
      updateIndicatorMenuPosition()
    })
  }
}

function getLayerLastValue(symbol: string): string {
  const s = summaryData.value?.series.find((x) => x.symbol === symbol)
  if (!s) return '--'
  return Number.isFinite(s.latest) ? formatValue(s.latest, s.unit) : '--'
}

function getLayerLastDate(symbol: string): string {
  const s = summaryData.value?.series.find((x) => x.symbol === symbol)
  return s?.latestDate || '--'
}

function getLayerSummary(symbol: string): SummarySeries | undefined {
  return summaryData.value?.series.find((item) => item.symbol === symbol)
}

function getLayerValue(symbol: string, key: 'open' | 'high' | 'low' | 'volume' | 'previous' | 'change' | 'changePct'): string {
  const series = getLayerSummary(symbol)
  if (!series) return '--'
  if (key === 'changePct') return formatPercent(series.changePct)
  if (key === 'volume') return Number.isFinite(series.volume) ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(series.volume) : '--'
  const value = series[key]
  return Number.isFinite(value) ? formatValue(value, series.unit) : '--'
}

function getDefaultOverlayIndicatorIds(): string[] {
  return ['overlay-none']
}

async function loadIndicators() {
  indicatorRegistryLoading.value = true
  indicatorRegistryError.value = ''
  try {
    const res = await authFetch('/api/indicators')
    const payload = await res.json()
    const list = Array.isArray(payload?.data) ? payload.data as IndicatorDefinition[] : []
    indicatorRegistry.value = list
    const nextOverlaySettings: Record<string, { period: number; sourceField: PriceSource }> = {}
    list.forEach((item) => {
      if (item.kind !== 'overlay' || item.engine === 'none') return
      nextOverlaySettings[item.id] = overlayIndicatorSettingsById.value[item.id] || getOverlayIndicatorSettings(item)
    })
    overlayIndicatorSettingsById.value = nextOverlaySettings
    const validOverlayIds = new Set(overlayIndicators.value.map((item) => item.id))
    const nextOverlayIds = activeOverlayIndicatorIds.value.filter((id) => validOverlayIds.has(id))
    activeOverlayIndicatorIds.value = nextOverlayIds.length ? nextOverlayIds : ['overlay-none']

    const nextOverlayIdsByTab: Record<string, string[]> = {}
    Object.entries(activeOverlayIndicatorIdsByTab.value).forEach(([tabId, ids]) => {
      const filtered = ids.filter((id) => validOverlayIds.has(id))
      nextOverlayIdsByTab[tabId] = filtered.length ? filtered : getDefaultOverlayIndicatorIds()
    })
    activeOverlayIndicatorIdsByTab.value = nextOverlayIdsByTab

    const validPaneIds = new Set(paneIndicators.value.map((item) => item.id))
    activePaneIndicatorIds.value = activePaneIndicatorIds.value.filter((id) => validPaneIds.has(id))
    const nextPaneIdsByTab: Record<string, string[]> = {}
    Object.entries(activePaneIndicatorIdsByTab.value).forEach(([tabId, ids]) => {
      nextPaneIdsByTab[tabId] = ids.filter((id) => validPaneIds.has(id))
    })
    activePaneIndicatorIdsByTab.value = nextPaneIdsByTab

    const nextSettingsByTab: Record<string, Record<string, { period: number; sourceField: PriceSource }>> = {}
    Object.entries(overlayIndicatorSettingsByTab.value).forEach(([tabId, settingsMap]) => {
      const filteredEntries = Object.entries(settingsMap).filter(([id]) => validOverlayIds.has(id))
      nextSettingsByTab[tabId] = Object.fromEntries(filteredEntries)
    })
    overlayIndicatorSettingsByTab.value = nextSettingsByTab
    syncIndicatorPanesForActiveTab()
  } catch (err) {
    indicatorRegistryError.value = err instanceof Error ? err.message : 'Failed to load indicators'
  } finally {
    indicatorRegistryLoading.value = false
  }
}

async function createIndicator() {
  indicatorCreateSubmitting.value = true
  indicatorCreateError.value = ''
  try {
    const payload = {
      label: newIndicatorForm.value.label.trim(),
      kind: newIndicatorForm.value.kind,
      engine: newIndicatorForm.value.engine,
      period: Number(newIndicatorForm.value.period),
      sourceField: newIndicatorForm.value.sourceField
    }
    const res = await authFetch('/api/indicators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json?.detail || 'Failed to save indicator')

    const created = json?.data as IndicatorDefinition
    indicatorRegistry.value = [...indicatorRegistry.value, created]
    if (created.kind === 'overlay') {
      ensureOverlayIndicatorSettings(created)
      activeOverlayIndicatorIds.value = [
        ...activeOverlayIndicatorIds.value.filter((id) => id !== 'overlay-none'),
        created.id
      ]
    } else {
      activePaneIndicatorIds.value = [...activePaneIndicatorIds.value, created.id]
    }
    newIndicatorForm.value = {
      label: '',
      kind: 'pane',
      engine: 'rsi',
      period: 14,
      sourceField: 'close'
    }
    showIndicatorCreateForm.value = false
  } catch (err) {
    indicatorCreateError.value = err instanceof Error ? err.message : 'Failed to save indicator'
  } finally {
    indicatorCreateSubmitting.value = false
  }
}

async function deleteIndicator(indicatorId: string) {
  try {
    const res = await authFetch(`/api/indicators/${encodeURIComponent(indicatorId)}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json?.detail || 'Failed to delete indicator')
    }
    indicatorRegistry.value = indicatorRegistry.value.filter((item) => item.id !== indicatorId)
    if (overlayIndicatorSettingsById.value[indicatorId]) {
      const nextSettings = { ...overlayIndicatorSettingsById.value }
      delete nextSettings[indicatorId]
      overlayIndicatorSettingsById.value = nextSettings
    }
    if (activeOverlayIndicatorIds.value.includes(indicatorId)) {
      const next = activeOverlayIndicatorIds.value.filter((id) => id !== indicatorId)
      activeOverlayIndicatorIds.value = next.length ? next : ['overlay-none']
    }
    if (activePaneIndicatorIds.value.includes(indicatorId)) {
      activePaneIndicatorIds.value = activePaneIndicatorIds.value.filter((id) => id !== indicatorId)
    }
  } catch (err) {
    indicatorRegistryError.value = err instanceof Error ? err.message : 'Failed to delete indicator'
  }
}

// ===== RESIZABLE PANES STATE =====
// Store pane heights by tab and pane id: { [tabId]: { [paneId]: height } }
const paneHeightsByTab = ref<Record<string, Record<string, number>>>({})
const isResizing = ref(false)
const resizePaneId = ref<string | null>(null)
const resizeStartY = ref(0)
const resizeStartHeight = ref(0)
const resizeNextPaneId = ref<string | null>(null)
const resizeNextStartHeight = ref(0)
const MIN_PANE_HEIGHT = 100 // Minimum height for a pane in pixels

const activeExtraPanes = computed(() => {
  const id = activeCategoryTabId.value
  return id ? extraPanesByTab.value[id] || [] : []
})

const allPaneSymbols = computed(() => {
  const symbols = new Set<string>(selectedSymbols.value)
  activeExtraPanes.value.forEach((pane) => {
    pane.symbols.forEach((symbol) => symbols.add(symbol))
  })
  return Array.from(symbols)
})
const allPaneSymbolsSet = computed(() => new Set(allPaneSymbols.value))


const hiddenSeriesByTab = ref<Record<string, string[]>>({})
const legendColorsByTab = ref<Record<string, Record<string, string>>>({})
const legendNamesByTab = ref<Record<string, Record<string, string>>>({})
const yAxisOverrideByTab = ref<Record<string, { min?: number; max?: number }>>({})
const yAxisBySymbolOverrideByTab = ref<Record<string, Record<string, { min?: number; max?: number }>>>({})

const activeYAxisOverride = computed(() => {
  const id = activeCategoryTabId.value
  return id ? yAxisOverrideByTab.value[id] : undefined
})
const activeYAxisBySymbolOverride = computed(() => {
  const id = activeCategoryTabId.value
  return id ? yAxisBySymbolOverrideByTab.value[id] : undefined
})

// Navigation menu state
const navMenuOpen = ref(false)

// Dynamic chart height - based on chart viewport (adds padding for axis labels)
const windowHeight = ref(window.innerHeight)
const chartScrollRef = ref<HTMLElement | null>(null)
let chartResizeObserver: ResizeObserver | null = null
const chartViewportHeight = ref(0)
let viewportUpdatePending = false
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0, left: 0, top: 0 })

const paneLayout = computed(() => {
  const panes: (PaneState & { isMain: boolean; height: number })[] = [
    { id: 'main', symbols: selectedSymbols.value, isMain: true, height: 0 }
  ]
  activeExtraPanes.value.forEach((pane) => panes.push({ ...pane, isMain: false, height: 0 }))

  let totalHeight = Math.max(0, chartViewportHeight.value)
  const count = Math.max(1, panes.length)
  const activeId = activeCategoryTabId.value
  
  // Fallback: if viewport height is 0 (not measured yet), use default height
  if (totalHeight === 0) {
    totalHeight = 450 // Default chart area height
  }
  
  // Get stored heights for current tab
  const storedHeights = activeId ? paneHeightsByTab.value[activeId] : undefined
  
  if (storedHeights && count > 1) {
    // Calculate total stored height for panes that have stored heights
    const storedPaneIds = panes.filter(p => storedHeights[p.id] !== undefined).map(p => p.id)
    
    if (storedPaneIds.length > 0) {
      // Check if all panes have stored heights
      const allHaveHeights = panes.every(p => storedHeights[p.id] !== undefined)
      
      if (allHaveHeights) {
        // Use stored heights directly
        return panes.map((pane) => ({
          ...pane,
          height: Math.max(MIN_PANE_HEIGHT, storedHeights[pane.id])
        }))
      } else {
        // Some panes don't have heights - distribute remaining space
        const usedHeight = storedPaneIds.reduce((sum, id) => sum + storedHeights[id], 0)
        const remainingPanes = panes.filter(p => storedHeights[p.id] === undefined)
        const remainingHeight = Math.max(0, totalHeight - usedHeight)
        const heightPerRemaining = remainingPanes.length > 0 
          ? Math.max(MIN_PANE_HEIGHT, Math.floor(remainingHeight / remainingPanes.length))
          : MIN_PANE_HEIGHT
        
        return panes.map((pane) => ({
          ...pane,
          height: storedHeights[pane.id] !== undefined 
            ? Math.max(MIN_PANE_HEIGHT, storedHeights[pane.id])
            : heightPerRemaining
        }))
      }
    }
  }
  
  // Default: equal distribution
  const base = Math.max(MIN_PANE_HEIGHT, Math.floor(totalHeight / count))
  let remainder = Math.max(0, totalHeight - base * count)
  
  return panes.map((pane) => {
    const height = base + (remainder > 0 ? 1 : 0)
    if (remainder > 0) remainder -= 1
    return { ...pane, height }
  })
})

// Initialize pane heights when tab or pane count changes
function initializePaneHeights() {
  const activeId = activeCategoryTabId.value
  if (!activeId) return
  
  let totalHeight = Math.max(0, chartViewportHeight.value)
  // Fallback: if viewport height is 0 (not measured yet), use default height
  if (totalHeight === 0) {
    totalHeight = 450
  }
  
  const panes = paneLayout.value
  const count = panes.length
  
  if (count === 0) return
  
  // Check if we need to initialize
  const currentHeights = paneHeightsByTab.value[activeId] || {}
  const hasAllHeights = panes.every(pane => currentHeights[pane.id] !== undefined)
  
  if (!hasAllHeights) {
    // Calculate how much height is already used by panes with stored heights
    const storedPanes = panes.filter(p => currentHeights[p.id] !== undefined)
    const usedHeight = storedPanes.reduce((sum, p) => sum + currentHeights[p.id], 0)
    
    // Distribute remaining height among new panes
    const newPanes = panes.filter(p => currentHeights[p.id] === undefined)
    const remainingHeight = Math.max(0, totalHeight - usedHeight)
    const heightForNew = newPanes.length > 0 
      ? Math.max(MIN_PANE_HEIGHT, Math.floor(remainingHeight / newPanes.length))
      : MIN_PANE_HEIGHT
    
    const newHeights: Record<string, number> = { ...currentHeights }
    
    // If this is the first initialization (no stored heights), distribute equally
    if (storedPanes.length === 0) {
      const baseHeight = Math.max(MIN_PANE_HEIGHT, Math.floor(totalHeight / count))
      panes.forEach((pane) => {
        newHeights[pane.id] = baseHeight
      })
    } else {
      // Only set heights for new panes
      newPanes.forEach((pane) => {
        newHeights[pane.id] = heightForNew
      })
    }
    
    paneHeightsByTab.value = {
      ...paneHeightsByTab.value,
      [activeId]: newHeights
    }
  }
}

// Get client Y from mouse or touch event
function getClientY(event: MouseEvent | TouchEvent): number {
  if ('touches' in event) {
    return event.touches[0]?.clientY ?? event.changedTouches[0]?.clientY ?? 0
  }
  return (event as MouseEvent).clientY
}

// Start resizing a pane
function startResize(event: PointerEvent, paneId: string) {
  console.log('[startResize] paneId:', paneId)
  
  // Capture pointer for better tracking across the entire resize operation
  if (event.target && 'setPointerCapture' in event.target) {
    (event.target as Element).setPointerCapture(event.pointerId)
  }
  
  // Prevent default to avoid text selection and scrolling
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
  
  const activeId = activeCategoryTabId.value
  if (!activeId) {
    console.log('[startResize] No active tab')
    return
  }
  
  const panes = paneLayout.value
  const paneIndex = panes.findIndex(p => p.id === paneId)
  console.log('[startResize] paneIndex:', paneIndex, 'total panes:', panes.length)
  
  if (paneIndex === -1 || paneIndex >= panes.length - 1) {
    console.log('[startResize] Invalid pane index')
    return
  }
  
  const nextPane = panes[paneIndex + 1]
  const currentHeights = paneHeightsByTab.value[activeId] || {}
  
  isResizing.value = true
  resizePaneId.value = paneId
  resizeStartY.value = event.clientY
  resizeStartHeight.value = currentHeights[paneId] || panes[paneIndex].height
  resizeNextPaneId.value = nextPane.id
  resizeNextStartHeight.value = currentHeights[nextPane.id] || nextPane.height
  
  console.log('[startResize] Starting resize - pane:', paneId, 'height:', resizeStartHeight.value, 'nextPane:', nextPane.id, 'nextHeight:', resizeNextStartHeight.value)
  
  // Add resize cursor to body
  document.body.style.cursor = 'ns-resize'
  document.body.style.userSelect = 'none'
  
  // Disable pointer events on iframes/elements during resize
  document.body.classList.add('is-resizing-panes')
}

// Handle resize move
function onResizeMove(event: MouseEvent | TouchEvent) {
  if (!isResizing.value || !resizePaneId.value || !resizeNextPaneId.value) {
    return
  }
  
  // Prevent default to stop scrolling on touch devices and text selection
  event.preventDefault()
  event.stopPropagation()
  
  const activeId = activeCategoryTabId.value
  if (!activeId) return
  
  const clientY = getClientY(event)
  const deltaY = clientY - resizeStartY.value
  const newHeight = resizeStartHeight.value + deltaY
  const newNextHeight = resizeNextStartHeight.value - deltaY
  
  console.log('[onResizeMove] deltaY:', deltaY, 'newHeight:', newHeight, 'newNextHeight:', newNextHeight)
  
  // Enforce minimum heights
  if (newHeight < MIN_PANE_HEIGHT || newNextHeight < MIN_PANE_HEIGHT) {
    console.log('[onResizeMove] Below minimum height, skipping')
    return
  }
  
  const currentHeights = paneHeightsByTab.value[activeId] || {}
  
  // Direct update without requestAnimationFrame for better responsiveness
  paneHeightsByTab.value = {
    ...paneHeightsByTab.value,
    [activeId]: {
      ...currentHeights,
      [resizePaneId.value!]: newHeight,
      [resizeNextPaneId.value!]: newNextHeight
    }
  }
}

// Stop resizing
function stopResize() {
  console.log('[stopResize] Stopping resize')
  if (isResizing.value) {
    isResizing.value = false
    resizePaneId.value = null
    resizeNextPaneId.value = null
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    document.body.classList.remove('is-resizing-panes')
  }
}

// Get resize handle style (visible when hovering over pane boundary)
function getResizeHandleStyle(paneId: string): Record<string, string> {
  return {
    position: 'absolute',
    left: '0',
    right: '0',
    bottom: '-4px',
    height: '8px',
    cursor: 'ns-resize',
    zIndex: '100',
    backgroundColor: isResizing.value && resizePaneId.value === paneId ? 'var(--accent)' : 'transparent'
  }
}

// Reset all pane heights to equal distribution (double-click on resize handle)
function resetPaneHeights() {
  const activeId = activeCategoryTabId.value
  if (!activeId) return
  
  const panes = paneLayout.value
  let totalHeight = Math.max(0, chartViewportHeight.value)
  // Fallback: if viewport height is 0 (not measured yet), use default height
  if (totalHeight === 0) {
    totalHeight = 450
  }
  
  const count = panes.length
  
  if (count <= 1) return
  
  const baseHeight = Math.max(MIN_PANE_HEIGHT, Math.floor(totalHeight / count))
  let remainder = Math.max(0, totalHeight - baseHeight * count)
  
  const newHeights: Record<string, number> = {}
  panes.forEach((pane) => {
    newHeights[pane.id] = baseHeight + (remainder > 0 ? 1 : 0)
    if (remainder > 0) remainder -= 1
  })
  
  paneHeightsByTab.value = {
    ...paneHeightsByTab.value,
    [activeId]: newHeights
  }
}

// Search modal state
const searchModalOpen = ref(false)
const searchQuery = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const allSymbols = ref<SymbolItem[]>([])
const loadingSymbols = ref(false)
const symbolMetaLookup = computed(() => new Map(allSymbols.value.map((s) => [s.symbol, s])))
let symbolSearchTimer: ReturnType<typeof window.setTimeout> | null = null
const yahooModeSnapshot = ref<null | {
  selectedSymbols: string[]
  extraPanes: PaneState[]
  hiddenSeries: string[]
  legendColors: Record<string, string>
  legendNames: Record<string, string>
  activeOverlayIndicatorIds: string[]
  activePaneIndicatorIds: string[]
  overlayIndicatorSettings: Record<string, { period: number; sourceField: PriceSource }>
  timeframe: typeof timeframe.value
  interval: typeof interval.value
  chartType: typeof chartType.value
}>(null)

function buildSymbolMeta(symbols: string[]) {
  const meta: Record<string, { name: string; description: string; unit?: string }> = {}
  symbols.forEach((symbol) => {
    const item = symbolMetaLookup.value.get(symbol)
    if (item) {
      meta[symbol] = { name: item.name, description: item.description, unit: item.unit }
    }
  })
  return meta
}

const selectedSymbolMeta = computed(() => buildSymbolMeta(allPaneSymbols.value))
const searchModalLabel = computed(() => {
  if (sourceMode.value === 'research') return 'Research Symbol Search'
  if (sourceMode.value === 'economy') return 'Economic Data Search'
  return 'Yahoo Symbol Search'
})
const searchPlaceholder = computed(() => {
  if (sourceMode.value === 'research') return 'Cari dataset research, contoh EURUSD...'
  if (sourceMode.value === 'economy') return 'Cari data ekonomi, contoh JTRGDPGFY, JTCS, JTUFY...'
  return 'Cari ticker Yahoo, contoh BBCA.JK, AAPL, BTC-USD...'
})

function captureYahooModeSnapshot() {
  yahooModeSnapshot.value = {
    selectedSymbols: [...selectedSymbols.value],
    extraPanes: activeExtraPanes.value.map((pane) => ({ ...pane, symbols: [...pane.symbols] })),
    hiddenSeries: Array.from(hiddenSeries.value),
    legendColors: { ...legendColors.value },
    legendNames: { ...legendNames.value },
    activeOverlayIndicatorIds: [...activeOverlayIndicatorIds.value],
    activePaneIndicatorIds: [...activePaneIndicatorIds.value],
    overlayIndicatorSettings: { ...overlayIndicatorSettingsById.value },
    timeframe: timeframe.value,
    interval: interval.value,
    chartType: chartType.value
  }
}

function applyResearchModeDefaults() {
  if (!categoryTabs.value.length) {
    addCategoryTab('all', false)
  }
  selectedSymbols.value = ['EURUSD']
  hiddenSeries.value = new Set()
  legendColors.value = {}
  legendNames.value = {}
  activeOverlayIndicatorIds.value = ['overlay-pred-lstm']
  activePaneIndicatorIds.value = []
  overlayIndicatorSettingsById.value = {}
  chartType.value = 'candlestick'
  timeframe.value = '6M'
  interval.value = '4h'

  const activeId = activeCategoryTabId.value
  if (activeId) {
    extraPanesByTab.value = { ...extraPanesByTab.value, [activeId]: [] }
  }
}

function applyEconomyModeDefaults() {
  if (!categoryTabs.value.length) {
    addCategoryTab('all', false)
  }
  selectedSymbols.value = ['JTRGDPGFY']
  hiddenSeries.value = new Set()
  legendColors.value = {}
  legendNames.value = {}
  activeOverlayIndicatorIds.value = ['overlay-none']
  activePaneIndicatorIds.value = []
  overlayIndicatorSettingsById.value = {}
  chartType.value = 'line'
  timeframe.value = 'ALL'
  interval.value = '1Y'

  const activeId = activeCategoryTabId.value
  if (activeId) {
    extraPanesByTab.value = { ...extraPanesByTab.value, [activeId]: [] }
  }
}

function restoreYahooModeSnapshot() {
  const snapshot = yahooModeSnapshot.value
  if (!snapshot) return
  selectedSymbols.value = [...snapshot.selectedSymbols]
  hiddenSeries.value = new Set(snapshot.hiddenSeries)
  legendColors.value = { ...snapshot.legendColors }
  legendNames.value = { ...snapshot.legendNames }
  activeOverlayIndicatorIds.value = [...snapshot.activeOverlayIndicatorIds]
  activePaneIndicatorIds.value = [...snapshot.activePaneIndicatorIds]
  overlayIndicatorSettingsById.value = { ...snapshot.overlayIndicatorSettings }
  timeframe.value = snapshot.timeframe
  interval.value = snapshot.interval
  chartType.value = snapshot.chartType

  const activeId = activeCategoryTabId.value
  if (activeId) {
    extraPanesByTab.value = {
      ...extraPanesByTab.value,
      [activeId]: snapshot.extraPanes.map((pane) => ({ ...pane, symbols: [...pane.symbols] }))
    }
  }
}

// Go to page (for navigation menu)
function goToPage(page: string) {
  navMenuOpen.value = false
  // For now, just log - in future this could use router
  console.log('Navigate to:', page)
  alert(`Navigasi ke: ${page} (belum diimplementasikan)`)
}

// Summary data
const summaryData = ref<SummaryData | null>(null)

// Data from all panes (for combined summary)
const paneDataById = ref<Record<string, Record<string, any[]>>>({})

// Toggle series visibility
function toggleSeriesVisibility(symbol: string) {
  // Create new Set to trigger Vue reactivity
  const newSet = new Set(hiddenSeries.value)
  
  if (newSet.has(symbol)) {
    newSet.delete(symbol)
  } else {
    newSet.add(symbol)
  }
  
  // Reassign to trigger reactivity
  // ProcurementChart will filter based on hiddenSeries prop
  hiddenSeries.value = newSet

  if (summaryData.value) {
    const nextSeries = summaryData.value.series.filter((s) => !newSet.has(s.symbol))
    const totalByUnit: Record<string, number> = {}
    nextSeries.forEach((s) => { totalByUnit[s.unit] = (totalByUnit[s.unit] || 0) + s.total })
    const units = Object.keys(totalByUnit)
    const unit = units.length === 1 ? units[0] : null
    const totalAll = unit ? totalByUnit[unit] : 0
    summaryData.value = nextSeries.length ? { totalAll, unit, totalByUnit, series: nextSeries } : null
  }
}

function getLegendColor(symbol: string, idx: number): string {
  return legendColors.value[symbol] || colors[idx % colors.length]
}

function getLegendName(symbol: string): string {
  return legendNames.value[symbol] || symbol
}

function formatLegendText(symbol: string): string {
  const rawDesc = String(selectedSymbolMeta.value?.[symbol]?.description || '')
  const desc = rawDesc.replace(/nilai rupiah/gi, '').trim()
  if (!desc) return symbol
  return `${symbol} - ${desc}`.replace(/\s*-\s*$/, '')
}

function formatLegendTooltip(symbol: string): string {
  return formatLegendText(symbol)
}

function getLegendDescription(symbol: string): string {
  const meta = selectedSymbolMeta.value[symbol]
  return meta?.description || meta?.name || symbol
}

function getSymbolUnit(symbol: string): string {
  const meta = selectedSymbolMeta.value[symbol]
  if (meta?.unit) return meta.unit
  return symbol.endsWith('.JK') ? 'Rp' : 'Price'
}

function updateLegendName(symbol: string, name: string) {
  legendNames.value = { ...legendNames.value, [symbol]: name }
}

function updateLegendColor(symbol: string, color: string) {
  legendColors.value = { ...legendColors.value, [symbol]: color }
}

function toggleLegendSettings(symbol: string) {
  activeLegendSettings.value = activeLegendSettings.value === symbol ? null : symbol
}

// Filtered symbols for search
const filteredSymbols = computed(() => {
  let symbols = allSymbols.value

  // Filter by search category
  if (activeSearchCategory.value !== 'all') {
    symbols = symbols.filter(s => s.symbolType === activeSearchCategory.value)
  }

  // Filter by search query
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    symbols = symbols.filter(s =>
      s.symbol.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q))
    )
  }

  return symbols
})

type CategoryValue = 'all' | 'dokumen' | 'nilai'
type CategoryTab = { id: string; label: string; category: CategoryValue }
type PaneState = {
  id: string
  symbols: string[]
  mode?: 'symbol' | 'indicator'
  indicatorId?: string
  indicatorEngine?: 'rsi' | 'macd' | 'stoch' | 'volume'
  indicatorPeriod?: number
}

const categoryOptions: { value: CategoryValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'nilai', label: 'Market' }
]

const categoryTabs = ref<CategoryTab[]>([])
const activeCategoryTabId = ref<string | null>(null)
// New button now creates a tab directly (menu removed)
const activeSearchCategory = ref<CategoryValue>('all')
const editingTabId = ref<string | null>(null)
const editingTabLabel = ref('')
const activeTabSettingsId = ref<string | null>(null)
const tabSettingsName = ref('')

watch(activeCategoryTabId, (next, prev) => {
  switchingTab.value = true
  
  // Clear pane data when switching tabs
  paneDataById.value = {}
  summaryData.value = null
  
  // Initialize pane heights for the new tab
  nextTick(() => {
    initializePaneHeights()
  })
  if (prev && sourceMode.value === 'yahoo') {
    selectedSymbolsByTab.value = {
      ...selectedSymbolsByTab.value,
      [prev]: [...selectedSymbols.value]
    }
    hiddenSeriesByTab.value = {
      ...hiddenSeriesByTab.value,
      [prev]: Array.from(hiddenSeries.value)
    }
    legendColorsByTab.value = {
      ...legendColorsByTab.value,
      [prev]: { ...legendColors.value }
    }
    legendNamesByTab.value = {
      ...legendNamesByTab.value,
      [prev]: { ...legendNames.value }
    }
    activeOverlayIndicatorIdsByTab.value = {
      ...activeOverlayIndicatorIdsByTab.value,
      [prev]: [...activeOverlayIndicatorIds.value]
    }
    activePaneIndicatorIdsByTab.value = {
      ...activePaneIndicatorIdsByTab.value,
      [prev]: [...activePaneIndicatorIds.value]
    }
    overlayIndicatorSettingsByTab.value = {
      ...overlayIndicatorSettingsByTab.value,
      [prev]: { ...overlayIndicatorSettingsById.value }
    }
  }
  if (next) {
    if (sourceMode.value === 'research') {
      selectedSymbols.value = ['EURUSD']
      hiddenSeries.value = new Set()
      legendColors.value = {}
      legendNames.value = {}
      activeOverlayIndicatorIds.value = ['overlay-none']
      activePaneIndicatorIds.value = []
      overlayIndicatorSettingsById.value = {}
      extraPanesByTab.value = { ...extraPanesByTab.value, [next]: [] }
    } else if (sourceMode.value === 'economy') {
      selectedSymbols.value = ['JTRGDPGFY']
      hiddenSeries.value = new Set()
      legendColors.value = {}
      legendNames.value = {}
      activeOverlayIndicatorIds.value = ['overlay-none']
      activePaneIndicatorIds.value = []
      overlayIndicatorSettingsById.value = {}
      extraPanesByTab.value = { ...extraPanesByTab.value, [next]: [] }
    } else {
      selectedSymbols.value = [...(selectedSymbolsByTab.value[next] || [])]
      hiddenSeries.value = new Set(hiddenSeriesByTab.value[next] || [])
      legendColors.value = { ...(legendColorsByTab.value[next] || {}) }
      legendNames.value = { ...(legendNamesByTab.value[next] || {}) }
      activeOverlayIndicatorIds.value = [...(activeOverlayIndicatorIdsByTab.value[next] || getDefaultOverlayIndicatorIds())]
      activePaneIndicatorIds.value = [...(activePaneIndicatorIdsByTab.value[next] || [])]
      overlayIndicatorSettingsById.value = { ...(overlayIndicatorSettingsByTab.value[next] || {}) }
    }
    activeLegendSettings.value = null
    activeOverlaySettingsId.value = null
  } else {
    selectedSymbols.value = []
    hiddenSeries.value = new Set()
    legendColors.value = {}
    legendNames.value = {}
    activeOverlayIndicatorIds.value = getDefaultOverlayIndicatorIds()
    activePaneIndicatorIds.value = []
    overlayIndicatorSettingsById.value = {}
    activeLegendSettings.value = null
    activeOverlaySettingsId.value = null
  }
  switchingTab.value = false
  syncIndicatorPanesForActiveTab()
})

watch(selectedSymbols, (val) => {
  if (switchingTab.value || sourceMode.value !== 'yahoo') return
  const activeId = activeCategoryTabId.value
  if (!activeId) return
  selectedSymbolsByTab.value = {
    ...selectedSymbolsByTab.value,
    [activeId]: [...val]
  }
  const bounds = yAxisBySymbolOverrideByTab.value[activeId]
  if (bounds) {
    const hasNewSymbol = val.some((sym) => !bounds[sym])
    if (hasNewSymbol) {
      clearYAxisOverrides(activeId)
    }
  }
  syncIndicatorPanesForActiveTab()
}, { deep: true })

watch(hiddenSeries, (val) => {
  if (switchingTab.value || sourceMode.value !== 'yahoo') return
  const activeId = activeCategoryTabId.value
  if (!activeId) return
  hiddenSeriesByTab.value = {
    ...hiddenSeriesByTab.value,
    [activeId]: Array.from(val)
  }
}, { deep: true })

watch(activeOverlayIndicatorIds, (val) => {
  if (switchingTab.value || sourceMode.value !== 'yahoo') return
  const activeId = activeCategoryTabId.value
  if (!activeId) return
  activeOverlayIndicatorIdsByTab.value = {
    ...activeOverlayIndicatorIdsByTab.value,
    [activeId]: [...val]
  }
}, { deep: true })

watch(activePaneIndicatorIds, (val) => {
  if (switchingTab.value || sourceMode.value !== 'yahoo') return
  const activeId = activeCategoryTabId.value
  if (!activeId) return
  activePaneIndicatorIdsByTab.value = {
    ...activePaneIndicatorIdsByTab.value,
    [activeId]: [...val]
  }
}, { deep: true })

watch(overlayIndicatorSettingsById, (val) => {
  if (switchingTab.value || sourceMode.value !== 'yahoo') return
  const activeId = activeCategoryTabId.value
  if (!activeId) return
  overlayIndicatorSettingsByTab.value = {
    ...overlayIndicatorSettingsByTab.value,
    [activeId]: { ...val }
  }
}, { deep: true })

watch(legendColors, (val) => {
  if (switchingTab.value || sourceMode.value !== 'yahoo') return
  const activeId = activeCategoryTabId.value
  if (!activeId) return
  legendColorsByTab.value = {
    ...legendColorsByTab.value,
    [activeId]: { ...val }
  }
}, { deep: true })

watch(legendNames, (val) => {
  if (switchingTab.value || sourceMode.value !== 'yahoo') return
  const activeId = activeCategoryTabId.value
  if (!activeId) return
  legendNamesByTab.value = {
    ...legendNamesByTab.value,
    [activeId]: { ...val }
  }
}, { deep: true })

watch([periodType, year, rawMode, cumulative, sumberDana, kategoriPlant], () => {
  clearYAxisOverrides()
})

watch(sourceMode, async (next, previous) => {
  if (next === previous) return
  if (previous === 'yahoo' && next !== 'yahoo') {
    captureYahooModeSnapshot()
  }
  if (next === 'research') {
    applyResearchModeDefaults()
  } else if (next === 'economy') {
    applyEconomyModeDefaults()
  } else if (next === 'yahoo' && previous !== 'yahoo') {
    restoreYahooModeSnapshot()
  }
  closeSearchModal()
  clearYAxisOverrides()
  await loadSymbols()
})

watch(sourceMode, (mode) => {
  if (mode === 'research' && chartType.value !== 'candlestick') {
    chartType.value = 'candlestick'
  }
})

watch([activePaneIndicatorIds, activeCategoryTabId], () => {
  syncIndicatorPanesForActiveTab()
})

// Watch for pane changes and initialize heights
watch([activeCategoryTabId, () => activeExtraPanes.value.length], () => {
  nextTick(() => {
    initializePaneHeights()
  })
}, { immediate: true })

function addCategoryTab(category: CategoryValue, openSearch = false) {
  const nextIndex = categoryTabs.value.length + 1
  const label = `Tab ${nextIndex}`
  const id = `tab-${category}-${Date.now()}`
  categoryTabs.value = [...categoryTabs.value, { id, label, category }]
  selectedSymbolsByTab.value = { ...selectedSymbolsByTab.value, [id]: [] }
  hiddenSeriesByTab.value = { ...hiddenSeriesByTab.value, [id]: [] }
  legendColorsByTab.value = { ...legendColorsByTab.value, [id]: {} }
  legendNamesByTab.value = { ...legendNamesByTab.value, [id]: {} }
  extraPanesByTab.value = { ...extraPanesByTab.value, [id]: [] }
  activeOverlayIndicatorIdsByTab.value = { ...activeOverlayIndicatorIdsByTab.value, [id]: getDefaultOverlayIndicatorIds() }
  activePaneIndicatorIdsByTab.value = { ...activePaneIndicatorIdsByTab.value, [id]: [] }
  overlayIndicatorSettingsByTab.value = { ...overlayIndicatorSettingsByTab.value, [id]: {} }
  activeCategoryTabId.value = id
  if (openSearch) {
    openSearchModal()
  }
  return id
}

function closeCategoryTab(tabId: string) {
  const idx = categoryTabs.value.findIndex((t) => t.id === tabId)
  if (idx === -1) return
  const wasActive = activeCategoryTabId.value === tabId
  categoryTabs.value = categoryTabs.value.filter((t) => t.id !== tabId)
  const { [tabId]: _sel, ...restSel } = selectedSymbolsByTab.value
  const { [tabId]: _hid, ...restHid } = hiddenSeriesByTab.value
  const { [tabId]: _lc, ...restLc } = legendColorsByTab.value
  const { [tabId]: _ln, ...restLn } = legendNamesByTab.value
  const { [tabId]: _yo, ...restYo } = yAxisOverrideByTab.value
  const { [tabId]: _ys, ...restYs } = yAxisBySymbolOverrideByTab.value
  const { [tabId]: _panes, ...restPanes } = extraPanesByTab.value
  const { [tabId]: _overlayIds, ...restOverlayIds } = activeOverlayIndicatorIdsByTab.value
  const { [tabId]: _paneIds, ...restPaneIds } = activePaneIndicatorIdsByTab.value
  const { [tabId]: _overlaySettings, ...restOverlaySettings } = overlayIndicatorSettingsByTab.value
  selectedSymbolsByTab.value = restSel
  hiddenSeriesByTab.value = restHid
  legendColorsByTab.value = restLc
  legendNamesByTab.value = restLn
  yAxisOverrideByTab.value = restYo
  yAxisBySymbolOverrideByTab.value = restYs
  extraPanesByTab.value = restPanes
  activeOverlayIndicatorIdsByTab.value = restOverlayIds
  activePaneIndicatorIdsByTab.value = restPaneIds
  overlayIndicatorSettingsByTab.value = restOverlaySettings

  if (wasActive) {
    const nextTab = categoryTabs.value[idx] || categoryTabs.value[idx - 1] || null
    activeCategoryTabId.value = nextTab ? nextTab.id : null
  }
}

function toggleTabSettings(tab: CategoryTab) {
  if (activeTabSettingsId.value === tab.id) {
    closeTabSettings()
    return
  }
  activeTabSettingsId.value = tab.id
  tabSettingsName.value = tab.label
  nextTick(() => {
    const input = document.querySelector<HTMLInputElement>('.tv-tab-settings-input')
    input?.focus()
    input?.select()
  })
}

function closeTabSettings() {
  activeTabSettingsId.value = null
  tabSettingsName.value = ''
}

function commitTabSettingsName(tab: CategoryTab) {
  if (activeTabSettingsId.value !== tab.id) return
  const nextLabel = tabSettingsName.value.trim()
  if (nextLabel) {
    categoryTabs.value = categoryTabs.value.map((t) =>
      t.id === tab.id ? { ...t, label: nextLabel } : t
    )
  }
  closeTabSettings()
}

function startRenameTab(tab: CategoryTab) {
  editingTabId.value = tab.id
  editingTabLabel.value = tab.label
  nextTick(() => {
    const inputs = document.querySelectorAll<HTMLInputElement>('.tv-category-tab-input')
    const input = Array.from(inputs).find((el) => el.value === tab.label)
    input?.focus()
    input?.select()
  })
}

function commitRenameTab(tab: CategoryTab) {
  if (editingTabId.value !== tab.id) return
  const nextLabel = editingTabLabel.value.trim()
  if (nextLabel) {
    categoryTabs.value = categoryTabs.value.map((t) =>
      t.id === tab.id ? { ...t, label: nextLabel } : t
    )
  }
  editingTabId.value = null
  editingTabLabel.value = ''
}

function cancelRenameTab() {
  editingTabId.value = null
  editingTabLabel.value = ''
}
const hoveredSymbol = ref<string | null>(null)

// Track scale mode per series: 'same' | 'percent' | 'scale' | 'pane'
type ScaleMode = 'same' | 'percent' | 'scale' | 'pane'
const seriesScales = ref<Record<string, ScaleMode>>({})

function addPaneForSymbol(symbol: string) {
  const activeId = activeCategoryTabId.value
  if (!activeId) return
  
  const panes = extraPanesByTab.value[activeId] || []
  const cleaned = panes
    .map((pane) => ({ ...pane, symbols: pane.symbols.filter((s) => s !== symbol) }))
    .filter((pane) => pane.symbols.length > 0)
  const newPane: PaneState = { id: `pane-${Date.now()}`, symbols: [symbol], mode: 'symbol' }
  
  // Calculate total pane count: main (1) + existing extra panes (cleaned) + new pane (1)
  const totalPaneCount = 1 + cleaned.length + 1
  const totalHeight = Math.max(450, chartViewportHeight.value)
  const heightPerPane = Math.max(MIN_PANE_HEIGHT, Math.floor(totalHeight / totalPaneCount))
  
  // Prepare new heights for all panes
  const currentHeights = paneHeightsByTab.value[activeId] || {}
  const newHeights: Record<string, number> = { ...currentHeights }
  
  // Set height for main pane
  newHeights['main'] = heightPerPane
  
  // Set heights for existing extra panes
  cleaned.forEach((pane) => {
    newHeights[pane.id] = heightPerPane
  })
  
  // Set height for new pane
  newHeights[newPane.id] = heightPerPane
  
  // Update both the panes and heights in a single operation
  extraPanesByTab.value = { ...extraPanesByTab.value, [activeId]: [...cleaned, newPane] }
  paneHeightsByTab.value = { ...paneHeightsByTab.value, [activeId]: newHeights }
}

function buildBalancedPaneHeights(
  panes: Array<{ id: string; isMain?: boolean }>,
  totalHeight: number
): Record<string, number> {
  if (!panes.length) return {}
  const safeTotal = Math.max(450, totalHeight)
  const weights = panes.map((pane) => (pane.id === 'main' || pane.isMain ? 1.8 : 1))
  const totalWeight = weights.reduce((sum, value) => sum + value, 0)
  const heights = panes.map((pane, index) => ({
    id: pane.id,
    height: Math.max(MIN_PANE_HEIGHT, Math.floor((safeTotal * weights[index]) / Math.max(totalWeight, 1)))
  }))
  let used = heights.reduce((sum, pane) => sum + pane.height, 0)

  while (used > safeTotal) {
    const shrinkTarget = heights
      .filter((pane) => pane.height > MIN_PANE_HEIGHT)
      .sort((a, b) => b.height - a.height)[0]
    if (!shrinkTarget) break
    shrinkTarget.height -= 1
    used -= 1
  }

  while (used < safeTotal) {
    const growTarget = heights
      .slice()
      .sort((a, b) => {
        if (a.id === 'main') return -1
        if (b.id === 'main') return 1
        return a.height - b.height
      })[0]
    if (!growTarget) break
    growTarget.height += 1
    used += 1
  }

  return Object.fromEntries(heights.map((pane) => [pane.id, pane.height]))
}

function syncIndicatorPanesForActiveTab() {
  const activeId = activeCategoryTabId.value
  if (!activeId) return
  const panes = extraPanesByTab.value[activeId] || []
  const sourceSymbol = selectedSymbols.value[0] || panes.find((pane) => pane.mode !== 'indicator')?.symbols[0]
  const indicators = activePaneIndicators.value

  if (!sourceSymbol || !indicators.length) {
    const nextPanes = panes.filter((p) => p.mode !== 'indicator')
    if (nextPanes.length !== panes.length) {
      extraPanesByTab.value = { ...extraPanesByTab.value, [activeId]: nextPanes }
      const totalHeight = Math.max(450, chartViewportHeight.value)
      const nextHeights = buildBalancedPaneHeights(
        [{ id: 'main', isMain: true }, ...nextPanes.map((pane) => ({ id: pane.id }))],
        totalHeight
      )
      paneHeightsByTab.value = { ...paneHeightsByTab.value, [activeId]: nextHeights }
    }
    const nextPaneData = { ...paneDataById.value }
    Object.keys(nextPaneData).forEach((key) => {
      if (key.startsWith('pane-indicator-')) delete nextPaneData[key]
    })
    paneDataById.value = nextPaneData
    return
  }

  const nonIndicatorPanes = panes.filter((p) => p.mode !== 'indicator')
  const indicatorPanes: PaneState[] = indicators.map((indicator) => ({
    id: `pane-indicator-${indicator.id}`,
    symbols: [sourceSymbol],
    mode: 'indicator',
    indicatorId: indicator.id,
    indicatorEngine: indicator.engine as 'rsi' | 'macd' | 'stoch' | 'volume',
    indicatorPeriod: indicator.period
  }))
  extraPanesByTab.value = { ...extraPanesByTab.value, [activeId]: [...nonIndicatorPanes, ...indicatorPanes] }

  const totalHeight = Math.max(450, chartViewportHeight.value)
  const nextHeights = buildBalancedPaneHeights(
    [
      { id: 'main', isMain: true },
      ...nonIndicatorPanes.map((pane) => ({ id: pane.id })),
      ...indicatorPanes.map((pane) => ({ id: pane.id }))
    ],
    totalHeight
  )
  paneHeightsByTab.value = { ...paneHeightsByTab.value, [activeId]: nextHeights }

  const nextPaneData = { ...paneDataById.value }
  Object.keys(nextPaneData).forEach((key) => {
    if (key.startsWith('pane-indicator-') && !indicatorPanes.some((pane) => pane.id === key)) {
      delete nextPaneData[key]
    }
  })
  paneDataById.value = nextPaneData
}

// Select symbol with scale option
function selectSymbolWithScale(sym: SymbolItem, scaleMode: ScaleMode) {
  // Check max series limit
  if (allPaneSymbols.value.length >= maxSeries.value) {
    alert(`Maximum ${maxSeries.value} series sudah terpilih. Hapus salah satu series atau ubah max series di dropdown.`)
    return
  }

  // If no tabs yet, create a default tab before inserting data
  const insertSymbol = () => {
    seriesScales.value[sym.symbol] = scaleMode

    if (scaleMode === 'pane') {
      if (selectedSymbols.value.includes(sym.symbol)) {
        selectedSymbols.value = selectedSymbols.value.filter((s) => s !== sym.symbol)
      }
      removeSymbolFromExtraPanes(sym.symbol)
      addPaneForSymbol(sym.symbol)
      return
    }

    if (!selectedSymbols.value.includes(sym.symbol)) {
      selectedSymbols.value.push(sym.symbol)
    }

    if (scaleMode === 'percent') {
      console.log(`Added ${sym.symbol} with same scale`)
    } else if (scaleMode === 'scale') {
      console.log(`Added ${sym.symbol} with New price scale`)
    }
  }

  if (!categoryTabs.value.length) {
    addCategoryTab('all', false)
    nextTick(insertSymbol)
  } else {
    if (!activeCategoryTabId.value) {
      activeCategoryTabId.value = categoryTabs.value[0].id
    }
    insertSymbol()
  }
  
  // Close modal
  searchQuery.value = ''
  closeSearchModal()
  hoveredSymbol.value = null
}

// Load available symbols
async function loadSymbols() {
  loadingSymbols.value = true
  try {
    const endpoint =
      sourceMode.value === 'research'
        ? '/api/research/symbols'
        : sourceMode.value === 'economy'
          ? '/api/economy/symbols'
          : '/api/procurement/symbols'
    const res = await authFetch(endpoint)
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    }
    const json = await res.json()
    if (json.status === 'success') {
      allSymbols.value = json.data || []
    }
  } catch (err) {
    console.error('Failed to load symbols:', err)
  } finally {
    loadingSymbols.value = false
  }
}

async function searchRemoteSymbols(query: string) {
  const trimmed = query.trim()
  if (trimmed.length < 2) return

  loadingSymbols.value = true
  try {
    const endpoint =
      sourceMode.value === 'research'
        ? '/api/research/search'
        : sourceMode.value === 'economy'
          ? '/api/economy/search'
          : '/api/procurement/search'
    const res = await authFetch(`${endpoint}?q=${encodeURIComponent(trimmed)}&limit=25`)
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    }
    const json = await res.json()
    if (json.status === 'success') {
      const merged = new Map<string, SymbolItem>()
      allSymbols.value.forEach((item) => merged.set(item.symbol, item))
      ;(json.data || []).forEach((item: SymbolItem) => merged.set(item.symbol, item))
      allSymbols.value = Array.from(merged.values())
    }
  } catch (err) {
    console.error('Failed to search symbols:', err)
  } finally {
    loadingSymbols.value = false
  }
}

// Toggle symbol selection
function toggleSymbol(symbol: string) {
  const idx = selectedSymbols.value.indexOf(symbol)
  if (idx >= 0) {
    selectedSymbols.value.splice(idx, 1)
  } else {
    // Check max series limit
    if (allPaneSymbols.value.length >= maxSeries.value) {
      alert(`Maximum ${maxSeries.value} series sudah terpilih. Hapus salah satu series atau ubah max series di dropdown.`)
      return
    }
    selectedSymbols.value.push(symbol)
  }
}

function removeSymbolFromExtraPanes(symbol: string) {
  const activeId = activeCategoryTabId.value
  if (!activeId) return
  const panes = extraPanesByTab.value[activeId] || []
  const nextPanes = panes
    .map((pane) => ({ ...pane, symbols: pane.symbols.filter((s) => s !== symbol) }))
    .filter((pane) => pane.symbols.length > 0)
  if (nextPanes.length !== panes.length || panes.some((pane, idx) => pane.symbols.length !== nextPanes[idx]?.symbols.length)) {
    extraPanesByTab.value = { ...extraPanesByTab.value, [activeId]: nextPanes }
  }
}

// Remove symbol
function removeSymbol(symbol: string) {
  const idx = selectedSymbols.value.indexOf(symbol)
  if (idx >= 0) {
    selectedSymbols.value.splice(idx, 1)
  }
  removeSymbolFromExtraPanes(symbol)
  if (hiddenSeries.value.has(symbol)) {
    const newSet = new Set(hiddenSeries.value)
    newSet.delete(symbol)
    hiddenSeries.value = newSet
  }
  if (summaryData.value) {
    const nextSeries = summaryData.value.series.filter((s) => s.symbol !== symbol)
    const totalByUnit: Record<string, number> = {}
    nextSeries.forEach((s) => { totalByUnit[s.unit] = (totalByUnit[s.unit] || 0) + s.total })
    const units = Object.keys(totalByUnit)
    const unit = units.length === 1 ? units[0] : null
    const totalAll = unit ? totalByUnit[unit] : 0
    summaryData.value = nextSeries.length ? { totalAll, unit, totalByUnit, series: nextSeries } : null
  }
  if (legendColors.value[symbol]) {
    const next = { ...legendColors.value }
    delete next[symbol]
    legendColors.value = next
  }
  if (legendNames.value[symbol]) {
    const next = { ...legendNames.value }
    delete next[symbol]
    legendNames.value = next
  }
  if (activeLegendSettings.value === symbol) {
    activeLegendSettings.value = null
  }
  
  // Clear y-axis overrides so they're recalculated for remaining symbols
  const activeId = activeCategoryTabId.value
  if (activeId) {
    clearYAxisOverrides(activeId)
  }
}

// Open search modal
function openSearchModal() {
  console.log('[DEBUG] openSearchModal called')  // Debug log
  searchModalOpen.value = true
  searchQuery.value = ''
  activeSearchCategory.value = 'all'
  nextTick(() => {
    searchInput.value?.focus()
  })
}

// Close search modal
function closeSearchModal() {
  searchModalOpen.value = false
}

function handleDocumentClick(event: MouseEvent) {
  const target = event.target as Node
  if (indicatorMenuOpen.value) {
    const menuEl = document.querySelector('.tv-indicator-menu')
    const btnEl = indicatorButtonRef.value
    if (menuEl && menuEl.contains(target)) return
    if (btnEl && btnEl.contains(target)) return
    indicatorMenuOpen.value = false
  }
  if (activeTabSettingsId.value) {
    const settingsEl = document.querySelector('.tv-tab-settings')
    const cogEl = document.querySelector('.tv-category-cog')
    if (settingsEl && settingsEl.contains(target)) return
    if (cogEl && cogEl.contains(target)) return
    closeTabSettings()
  }
}

function filterSymbols() {
  if (symbolSearchTimer) window.clearTimeout(symbolSearchTimer)
  symbolSearchTimer = window.setTimeout(() => {
    searchRemoteSymbols(searchQuery.value)
  }, 300)
}

// Handle data loaded
function onDataLoaded(data: Record<string, any[]>) {
  if (!selectedSymbols.value.length) {
    summaryData.value = null
    return
  }

  const activeTabId = activeCategoryTabId.value
  if (activeTabId && !yAxisOverrideByTab.value[activeTabId]) {
    const symbolBounds: Record<string, { min?: number; max?: number }> = {}
    let allValues: number[] = []
    selectedSymbols.value.forEach((symbol) => {
      const values = data[symbol] || []
      if (!values.length) {
        symbolBounds[symbol] = { min: undefined, max: undefined }
        return
      }
      const seriesVals = values.map((d: any) => d.close).filter((v: any) => typeof v === 'number')
      if (!seriesVals.length) {
        symbolBounds[symbol] = { min: undefined, max: undefined }
        return
      }
      let minVal = Math.min(...seriesVals)
      let maxVal = Math.max(...seriesVals)
      const range = Math.max(maxVal - minVal, 1)
      const pad = range * 0.05
      const paddedMin = minVal >= 0 ? Math.max(0, minVal - pad) : minVal - pad
      symbolBounds[symbol] = { min: paddedMin, max: maxVal + pad }
      allValues = allValues.concat(seriesVals)
    })

    if (allValues.length) {
      let minVal = Math.min(...allValues)
      let maxVal = Math.max(...allValues)
      const range = Math.max(maxVal - minVal, 1)
      const pad = range * 0.05
      const paddedMin = minVal >= 0 ? Math.max(0, minVal - pad) : minVal - pad
      yAxisOverrideByTab.value = {
        ...yAxisOverrideByTab.value,
        [activeTabId]: { min: paddedMin, max: maxVal + pad }
      }
    }

    yAxisBySymbolOverrideByTab.value = {
      ...yAxisBySymbolOverrideByTab.value,
      [activeTabId]: symbolBounds
    }
  }

  const seriesSummaries: SummarySeries[] = []
  const totalByUnit: Record<string, number> = {}

  // Get all symbols from the data (includes all panes)
  const allSymbols = Object.keys(data)
  
  allSymbols.forEach((symbol, index) => {
    if (hiddenSeries.value.has(symbol)) return
    const values = data[symbol] || []
    if (!values.length) return

    const closes = values.map((d: any) => d.close)
    let latestIdx = closes.length - 1
    while (latestIdx >= 0 && closes[latestIdx] === 0) {
      latestIdx -= 1
    }
    if (latestIdx < 0) latestIdx = closes.length - 1

    const unit = getSymbolUnit(symbol)
    const latest = closes[latestIdx]
    const latestRow = values[latestIdx] || {}
    let previousIdx = latestIdx - 1
    while (previousIdx >= 0 && (closes[previousIdx] === 0 || closes[previousIdx] === null || closes[previousIdx] === undefined)) {
      previousIdx -= 1
    }
    const previous = previousIdx >= 0 ? closes[previousIdx] : latest
    const change = latest - previous
    const changePct = previous ? (change / previous) * 100 : 0
    totalByUnit[unit] = (totalByUnit[unit] || 0) + latest
    const latestTimestamp = Number(latestRow.time || 0)
    const latestDate = latestTimestamp
      ? new Date(latestTimestamp * 1000).toLocaleString('id-ID', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      : '--'

    seriesSummaries.push({
      symbol,
      total: latest,
      latest,
      previous,
      change,
      changePct,
      open: Number(latestRow.open),
      high: Number(latestRow.high),
      low: Number(latestRow.low),
      volume: Number(latestRow.volume),
      latestTimestamp,
      latestDate,
      color: getLegendColor(symbol, index),
      unit
    })
  })

  const units = Object.keys(totalByUnit)
  const unit = units.length === 1 ? units[0] : null
  const totalAll = unit ? totalByUnit[unit] : 0
  summaryData.value = seriesSummaries.length ? { totalAll, unit, totalByUnit, series: seriesSummaries } : null
}

function onPaneDataLoaded(paneId: string, data: Record<string, any[]>) {
  // Store data for this pane
  paneDataById.value[paneId] = data
  
  // Combine all pane data for summary
  const allData: Record<string, any[]> = {}
  
  // Add main pane data
  if (paneDataById.value['main']) {
    Object.assign(allData, paneDataById.value['main'])
  }
  
  // Add extra panes data
  activeExtraPanes.value.forEach((pane) => {
    if (paneDataById.value[pane.id]) {
      Object.assign(allData, paneDataById.value[pane.id])
    }
  })
  
  // Update summary with combined data
  onDataLoaded(allData)
}

function onPaneError(paneId: string, msg: string) {
  if (paneId === 'main') {
    onChartError(msg)
  }
}

// Handle chart error
function onChartError(msg: string) {
  console.error('Chart error:', msg)
}

// Format number
const currencyId = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 2
})

const numberId = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 4
})

const currencyByUnit: Record<string, string> = {
  Rp: 'IDR',
  IDR: 'IDR',
  USD: 'USD',
  EUR: 'EUR',
  JPY: 'JPY',
  GBP: 'GBP',
  AUD: 'AUD',
  CAD: 'CAD',
  CHF: 'CHF',
  NZD: 'NZD'
}

function formatValue(val: number | undefined, unit: string): string {
  if (val === undefined || val === null || Number.isNaN(val)) return '--'
  if (unit === 'Rp' || unit === 'IDR') return currencyId.format(val)
  const currencyCode = currencyByUnit[unit]
  if (currencyCode) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: currencyCode === 'JPY' ? 2 : 4
    }).format(val)
  }
  return numberId.format(val)
}

function formatSignedValue(val: number | undefined, unit: string): string {
  if (val === undefined || val === null || Number.isNaN(val)) return '--'
  const abs = Math.abs(val)
  const sign = val >= 0 ? '+' : '-'
  return `${sign}${formatValue(abs, unit)}`
}

function formatPercent(val: number | undefined): string {
  if (val === undefined || val === null || Number.isNaN(val)) return '--'
  const sign = val >= 0 ? '+' : '-'
  return `${sign}${Math.abs(val).toFixed(2)}%`
}

// Handle resize
function updateChartViewport() {
  if (chartScrollRef.value) {
    if (viewportUpdatePending) return
    viewportUpdatePending = true
    requestAnimationFrame(() => {
      viewportUpdatePending = false
      if (!chartScrollRef.value) return
      const nextHeight = chartScrollRef.value.clientHeight
      if (chartViewportHeight.value !== nextHeight) {
        chartViewportHeight.value = nextHeight
      }
    })
  }
}

function handleResize() {
  windowHeight.value = window.innerHeight
  updateChartViewport()
  updatePanelPositions()
}

function computePanelStyle(btnEl: HTMLElement | null): Record<string, string> {
  if (!btnEl || !chartAreaRef.value) return {}
  const areaRect = chartAreaRef.value.getBoundingClientRect()
  const btnRect = btnEl.getBoundingClientRect()
  const top = Math.max(16, btnRect.top - areaRect.top - 6)
  const right = areaRect.right - btnRect.left + 14
  return {
    top: `${top}px`,
    right: `${right}px`
  }
}

function computeLayersDrawerStyle(): Record<string, string> {
  if (!chartAreaRef.value) return {}
  const areaRect = chartAreaRef.value.getBoundingClientRect()
  const panelWidth = Math.min(460, Math.max(360, Math.round(areaRect.width * 0.34)))
  const maxWidth = Math.max(320, areaRect.width - 104)
  return {
    top: '16px',
    right: '72px',
    bottom: '16px',
    width: `${Math.min(panelWidth, maxWidth)}px`
  }
}

function updatePanelPositions() {
  if (showObjectTree.value) {
    objectTreePanelStyle.value = computePanelStyle(objectTreeBtnRef.value)
  }
  if (showLayersPanel.value) {
    layersPanelStyle.value = computeLayersDrawerStyle()
  }
}

function onChartPointerDown(event: PointerEvent) {
  if (!chartScrollRef.value) return
  if (activeDrawingTool.value !== 'select') return
  if (event.button !== 0) return
  const target = event.target as HTMLElement | null
  if (target?.closest('.drawing-layer')) return
  event.preventDefault()
  isPanning.value = true
  chartScrollRef.value.setPointerCapture(event.pointerId)
  panStart.value = {
    x: event.clientX,
    y: event.clientY,
    left: 0,
    top: 0
  }
}

function onChartPointerMove(event: PointerEvent) {
  if (!isPanning.value) return
  const dx = event.clientX - panStart.value.x
  applyToCharts((chart) => chart.panByPixels?.(dx))
}

function onChartPointerUp(event: PointerEvent) {
  if (!chartScrollRef.value) return
  if (!isPanning.value) return
  isPanning.value = false
  chartScrollRef.value.releasePointerCapture(event.pointerId)
}

function onChartWheel(event: WheelEvent) {
  if (event.shiftKey && event.deltaY !== 0) {
    applyToCharts((chart) => chart.panByPixels?.(event.deltaY))
    return
  }
  if (event.deltaX !== 0) {
    applyToCharts((chart) => chart.panByPixels?.(event.deltaX))
    return
  }
  if (event.deltaY !== 0) {
    applyToCharts((chart) => chart.panByPixels?.(event.deltaY))
  }
}

function handleGlobalShortcuts(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  const isEditable =
    target &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable)
  if (isEditable) return

  const isMac = navigator.platform.toLowerCase().includes('mac')
  const modKey = isMac ? event.metaKey : event.ctrlKey
  if (!modKey) return

  const key = event.key.toLowerCase()
  if (key === 'z' && event.shiftKey) {
    event.preventDefault()
    drawingRef?.redo?.()
    return
  }
  if (key === 'z') {
    event.preventDefault()
    drawingRef?.undo?.()
    return
  }
  if (key === 'y') {
    event.preventDefault()
    drawingRef?.redo?.()
  }
}

// ===== PERSIST STATE TO LOCALSTORAGE =====
const STORAGE_KEY = 'chartApp_state'

// Save state to localStorage
function saveState() {
    const state = {
      categoryTabs: categoryTabs.value,
      activeCategoryTabId: activeCategoryTabId.value,
      selectedSymbolsByTab: selectedSymbolsByTab.value,
      hiddenSeriesByTab: hiddenSeriesByTab.value,
        legendColorsByTab: legendColorsByTab.value,
        legendNamesByTab: legendNamesByTab.value,
      yAxisOverrideByTab: yAxisOverrideByTab.value,
      yAxisBySymbolOverrideByTab: yAxisBySymbolOverrideByTab.value,
      extraPanesByTab: extraPanesByTab.value,
      paneHeightsByTab: paneHeightsByTab.value,
      activeOverlayIndicatorIdsByTab: activeOverlayIndicatorIdsByTab.value,
      activePaneIndicatorIdsByTab: activePaneIndicatorIdsByTab.value,
      overlayIndicatorSettingsByTab: overlayIndicatorSettingsByTab.value,
      selectedSymbols: selectedSymbols.value,
      chartType: chartType.value,
      timeframe: timeframe.value,
      interval: interval.value,
      activeOverlayIndicatorIds: activeOverlayIndicatorIds.value,
      overlayIndicatorSettingsById: overlayIndicatorSettingsById.value,
      activePaneIndicatorIds: activePaneIndicatorIds.value,
      periodType: periodType.value,
      timezoneOption: timezoneOption.value,
      year: year.value,
      rawMode: rawMode.value,
      cumulative: cumulative.value,
      singleScale: singleScale.value,
      scaleSide: scaleSide.value,
      sumberDana: sumberDana.value,
      kategoriPlant: kategoriPlant.value
    }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

// Restore state from localStorage
function restoreState() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const state = JSON.parse(saved)
      if (state.categoryTabs) categoryTabs.value = state.categoryTabs
      if (state.activeCategoryTabId !== undefined) activeCategoryTabId.value = state.activeCategoryTabId
      if (state.selectedSymbolsByTab) selectedSymbolsByTab.value = state.selectedSymbolsByTab
      if (state.hiddenSeriesByTab) hiddenSeriesByTab.value = state.hiddenSeriesByTab
        if (state.legendColorsByTab) legendColorsByTab.value = state.legendColorsByTab
        if (state.legendNamesByTab) legendNamesByTab.value = state.legendNamesByTab
        if (state.yAxisOverrideByTab) yAxisOverrideByTab.value = state.yAxisOverrideByTab
        if (state.yAxisBySymbolOverrideByTab) yAxisBySymbolOverrideByTab.value = state.yAxisBySymbolOverrideByTab
        if (state.extraPanesByTab) extraPanesByTab.value = state.extraPanesByTab
        if (state.paneHeightsByTab) paneHeightsByTab.value = state.paneHeightsByTab
        if (state.activeOverlayIndicatorIdsByTab) activeOverlayIndicatorIdsByTab.value = state.activeOverlayIndicatorIdsByTab
        if (state.activePaneIndicatorIdsByTab) activePaneIndicatorIdsByTab.value = state.activePaneIndicatorIdsByTab
        if (state.overlayIndicatorSettingsByTab) overlayIndicatorSettingsByTab.value = state.overlayIndicatorSettingsByTab
        if (state.selectedSymbols) selectedSymbols.value = state.selectedSymbols
      if (state.chartType) {
        chartType.value = state.chartType === 'ohlc' ? 'candlestick' : state.chartType
      }
      if (state.timeframe && isValidRange(state.timeframe)) {
        timeframe.value = state.timeframe
      }
      if (state.interval && isValidInterval(state.interval)) {
        interval.value = state.interval
      } else {
        interval.value = '1D'
      }
      if (Array.isArray(state.activeOverlayIndicatorIds)) activeOverlayIndicatorIds.value = state.activeOverlayIndicatorIds
      if (state.overlayIndicatorSettingsById && typeof state.overlayIndicatorSettingsById === 'object') {
        overlayIndicatorSettingsById.value = state.overlayIndicatorSettingsById
      }
      if (Array.isArray(state.activePaneIndicatorIds)) activePaneIndicatorIds.value = state.activePaneIndicatorIds
      if (typeof state.selectedOverlayIndicatorId === 'string') activeOverlayIndicatorIds.value = [state.selectedOverlayIndicatorId]
      if (typeof state.selectedPaneIndicatorId === 'string') {
        activePaneIndicatorIds.value = [state.selectedPaneIndicatorId]
      } else if (state.selectedPaneIndicatorId === null) {
        activePaneIndicatorIds.value = []
      }
      if (!state.selectedOverlayIndicatorId && typeof state.movingAveragePreset === 'string') {
        const legacyMap: Record<string, string> = {
          none: 'overlay-none',
          sma20: 'overlay-sma',
          sma50: 'overlay-sma',
          ema20: 'overlay-ema',
          ema50: 'overlay-ema'
        }
        activeOverlayIndicatorIds.value = [legacyMap[state.movingAveragePreset] || 'overlay-none']
      }
      if (state.selectedPaneIndicatorId === undefined && state.rsiPaneEnabled === true) {
        activePaneIndicatorIds.value = ['pane-rsi-14']
      }
      const activeId = state.activeCategoryTabId
      if (activeId && !activeOverlayIndicatorIdsByTab.value[activeId]) {
        activeOverlayIndicatorIdsByTab.value = {
          ...activeOverlayIndicatorIdsByTab.value,
          [activeId]: [...activeOverlayIndicatorIds.value]
        }
      }
      if (activeId && !activePaneIndicatorIdsByTab.value[activeId]) {
        activePaneIndicatorIdsByTab.value = {
          ...activePaneIndicatorIdsByTab.value,
          [activeId]: [...activePaneIndicatorIds.value]
        }
      }
      if (activeId && !overlayIndicatorSettingsByTab.value[activeId]) {
        overlayIndicatorSettingsByTab.value = {
          ...overlayIndicatorSettingsByTab.value,
          [activeId]: { ...overlayIndicatorSettingsById.value }
        }
      }
      if (state.periodType) periodType.value = state.periodType
      if (state.timezoneOption) timezoneOption.value = state.timezoneOption
      if (state.year) year.value = state.year
      if (state.rawMode !== undefined) rawMode.value = state.rawMode
      if (state.cumulative !== undefined) cumulative.value = state.cumulative
      if (state.singleScale !== undefined) singleScale.value = state.singleScale
      if (state.scaleSide === 'left' || state.scaleSide === 'right') scaleSide.value = state.scaleSide
      if (state.sumberDana !== undefined) sumberDana.value = state.sumberDana
      if (state.kategoriPlant !== undefined) kategoriPlant.value = state.kategoriPlant
    } catch (e) {
      console.warn('Failed to restore chart state:', e)
    }
  }
}

// Watch for state changes and save
watch([categoryTabs, activeCategoryTabId, selectedSymbolsByTab, hiddenSeriesByTab, legendColorsByTab, legendNamesByTab, yAxisOverrideByTab, yAxisBySymbolOverrideByTab, extraPanesByTab, paneHeightsByTab, activeOverlayIndicatorIdsByTab, activePaneIndicatorIdsByTab, overlayIndicatorSettingsByTab, selectedSymbols, chartType, timeframe, interval, activeOverlayIndicatorIds, overlayIndicatorSettingsById, activePaneIndicatorIds, timezoneOption, periodType, year, rawMode, cumulative, singleScale, scaleSide, sumberDana, kategoriPlant], saveState, { deep: true })
watch([showObjectTree, showLayersPanel], async () => {
  await nextTick()
  updatePanelPositions()
})

watch(showLayersPanel, (isOpen) => {
  if (isOpen) {
    activeLayersTab.value = 'objects'
  }
})
watch(() => newIndicatorForm.value.engine, (engine) => {
  if (!['rsi', 'stoch'].includes(engine)) {
    newIndicatorForm.value.engine = 'rsi'
  }
  if (!newIndicatorForm.value.period || newIndicatorForm.value.period < 2) {
    newIndicatorForm.value.period = newIndicatorForm.value.engine === 'stoch' ? 14 : 14
  }
})

// Init
onMounted(() => {
  restoreState() // Restore saved state first
  loadIndicators()
  loadSymbols()
  nextTick(updateChartViewport)
  nextTick(updatePanelPositions)
  nextTick(() => initializePaneHeights())
  window.addEventListener('resize', handleResize)
  window.addEventListener('resize', updateIndicatorMenuPosition)
  window.addEventListener('scroll', updateIndicatorMenuPosition, true)
  window.addEventListener('keydown', handleGlobalShortcuts)
  document.addEventListener('click', handleDocumentClick)
  // Global resize events (mouse + touch)
  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', stopResize)
  document.addEventListener('touchmove', onResizeMove as any, { passive: false })
  document.addEventListener('touchend', stopResize)
  if (chartScrollRef.value) {
    chartResizeObserver = new ResizeObserver(updateChartViewport)
    chartResizeObserver.observe(chartScrollRef.value)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('resize', updateIndicatorMenuPosition)
  window.removeEventListener('scroll', updateIndicatorMenuPosition, true)
  window.removeEventListener('keydown', handleGlobalShortcuts)
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', stopResize)
  document.removeEventListener('touchmove', onResizeMove as any)
  document.removeEventListener('touchend', stopResize)
  if (chartResizeObserver && chartScrollRef.value) {
    chartResizeObserver.unobserve(chartScrollRef.value)
    chartResizeObserver = null
  }
})
</script>

<style scoped>
/* ============ TradingView-style Layout ============ */

/* Header */
.tv-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  min-height: 40px;
  padding: 0 10px;
  flex-shrink: 0;
  background: var(--surface);
  border-bottom: 1px solid var(--stroke);
  position: relative;
  z-index: 1000;
  font-size: 13px;
}

.tv-header-left,
.tv-header-center,
.tv-header-right {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.tv-header-left {
  flex: 0 0 auto;
}

.tv-header-center {
  flex: 1 1 auto;
  justify-content: flex-start;
  min-width: 0;
  gap: 4px;
  overflow: visible;
  margin-left: 30px;
}

.tv-source-switch {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--stroke);
  border-radius: 999px;
  background: var(--surface-alt);
}

.tv-source-switch .tv-btn {
  border-radius: 999px;
}

.tv-select-research {
  min-width: 140px;
}

.tv-chart-type-lock {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  border: 1px solid var(--stroke);
  border-radius: 4px;
  background: var(--surface-alt);
  color: var(--ink);
  font-size: 12px;
}

.tv-header-center::-webkit-scrollbar {
  display: none;
}

.tv-header-right {
  flex: 0 0 auto;
}

.tv-logo {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 14px;
  color: var(--ink);
}

.tv-logo svg {
  flex-shrink: 0;
}

.tv-btn-group-wrap {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.tv-dropdown {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.tv-btn.tv-dropdown-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--surface-alt);
  border: 1px solid var(--stroke);
  color: var(--ink);
  padding: 4px 8px;
  height: 26px;
  font-size: 12px;
}

.tv-btn.tv-dropdown-btn:hover {
  background: var(--hover);
}

.tv-btn.tv-dropdown-btn.is-open {
  background: rgba(41, 98, 255, 0.12);
  color: var(--accent);
}

.tv-btn.tv-dropdown-btn svg {
  transition: transform 0.2s ease;
}

.tv-btn.tv-dropdown-btn .chevron-rotated {
  transform: rotate(180deg);
}

.tv-dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 140px;
  background: var(--surface);
  border: 1px solid var(--stroke);
  border-radius: 6px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 60;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
}

.tv-dropdown-item {
  border: none;
  background: transparent;
  color: var(--ink);
  text-align: left;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 0.78rem;
  cursor: pointer;
}

.tv-dropdown-item:hover {
  background: var(--surface-alt);
}

.tv-dropdown-item.active {
  background: rgba(41, 98, 255, 0.15);
  color: var(--accent);
}

.tv-indicator-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.tv-indicator-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 250px;
  max-width: 280px;
  padding: 6px;
  border: 1px solid var(--stroke);
  border-radius: 6px;
  background: var(--surface);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
  z-index: 1200;
  display: grid;
  gap: 4px;
}

.tv-indicator-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 2px 6px;
}

.tv-indicator-storage {
  font-size: 0.68rem;
  color: var(--muted);
}

.tv-indicator-add-btn {
  border: 1px solid var(--stroke);
  background: var(--surface-alt);
  color: var(--ink);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 0.72rem;
  cursor: pointer;
}

.tv-indicator-loading,
.tv-indicator-error {
  font-size: 0.74rem;
  padding: 4px;
}

.tv-indicator-error {
  color: #ef5350;
}

.tv-indicator-title {
  font-size: 0.68rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  padding: 2px 4px;
}

.tv-indicator-item {
  border: none;
  background: transparent;
  color: var(--ink);
  text-align: left;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 0.78rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tv-indicator-item-main {
  display: grid;
  gap: 2px;
}

.tv-indicator-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.tv-indicator-badge {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.28);
}

.tv-indicator-meta {
  font-size: 0.68rem;
  color: var(--muted);
}

.tv-indicator-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tv-indicator-item:hover {
  background: var(--surface-alt);
}

.tv-indicator-item.active {
  background: rgba(41, 98, 255, 0.15);
  color: var(--accent);
}

.tv-indicator-delete {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 0.9rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}

.tv-indicator-settings {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 0.9rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}

.tv-indicator-settings-panel {
  display: grid;
  gap: 8px;
  margin: 4px 0 6px;
  padding: 8px;
  border: 1px solid var(--stroke);
  border-radius: 6px;
  background: var(--bg);
}

.tv-indicator-settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.tv-indicator-field {
  display: grid;
  gap: 4px;
  font-size: 0.72rem;
  color: var(--muted);
}

.tv-indicator-form {
  display: grid;
  gap: 6px;
  padding-top: 4px;
  border-top: 1px solid var(--stroke);
  margin-top: 4px;
}

.tv-indicator-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.tv-indicator-input {
  width: 100%;
  border: 1px solid var(--stroke);
  background: var(--bg);
  color: var(--ink);
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 0.78rem;
}

.tv-indicator-form-actions {
  display: flex;
  justify-content: flex-end;
}

.tv-select-compact {
  min-width: 0;
  width: 100%;
}

.tv-btn-group-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid var(--stroke);
  background: var(--surface-alt);
  color: var(--ink);
  cursor: pointer;
  flex: 0 0 auto;
}

.tv-btn-group-toggle:hover {
  background: var(--hover);
}

.tv-btn-group-toggle .chevron-rotated {
  transform: rotate(180deg);
}

.tv-logo {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--ink);
}

.tv-title {
  font-size: 0.85rem;
  font-weight: 600;
}

.tv-symbol-search {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--surface-alt);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}

.tv-symbol-search:hover {
  background: var(--hover);
}

.tv-new-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: transparent;
  border: 1px solid var(--stroke);
  border-radius: 4px;
  color: var(--ink);
  cursor: pointer;
  font-size: 0.85rem;
  flex: 0 0 auto;
}

.tv-new-tab-btn.is-tab {
  border-radius: 999px;
  font-size: 0.78rem;
  padding: 4px 8px;
}

.tv-new-tab-plus {
  font-weight: 700;
  line-height: 1;
}

.tv-new-tab-balloon {
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  line-height: 1;
}

.tv-new-tab-btn:hover {
  background: var(--hover);
}

.tv-new-tab-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  background: var(--surface);
  border: 1px solid var(--stroke);
  border-radius: 6px;
  padding: 6px;
  min-width: 140px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 30;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}

.tv-new-tab-menu.is-center {
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
}

.tv-new-tab-submenu {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 4px;
  border-top: 1px solid var(--stroke);
  margin-top: 4px;
}

.tv-new-tab-option {
  border: none;
  background: transparent;
  text-align: left;
  padding: 6px 8px;
  border-radius: 4px;
  color: var(--ink);
  cursor: pointer;
  font-size: 0.78rem;
}

.tv-new-tab-option:hover {
  background: var(--surface-2);
}

.tv-category-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  position: relative;
  z-index: 41;
  pointer-events: auto;
}

.tv-category-tabs {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  white-space: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  min-width: 0;
  flex: 1 1 auto;
  padding-bottom: 2px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.25) transparent;
}

.tv-category-tabs::-webkit-scrollbar {
  height: 4px;
}

.tv-category-tabs::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 999px;
}

.tv-category-tab {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  border: 1px solid var(--stroke);
  background: transparent;
  color: var(--muted);
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
  cursor: pointer;
  white-space: nowrap;
}

.tv-category-tab.active {
  color: var(--ink);
  border-color: var(--accent);
  background: rgba(41, 98, 255, 0.12);
}

.tv-category-indicator {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--stroke);
  margin-right: 6px;
  flex: 0 0 auto;
}

.tv-category-indicator.is-active {
  background: var(--accent);
}

.tv-category-close {
  margin-left: 6px;
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.tv-category-close:hover {
  color: var(--ink);
}

.tv-category-cog {
  margin-left: 6px;
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.tv-category-cog:hover {
  color: var(--ink);
}

.tv-tab-settings {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  background: var(--surface);
  border: 1px solid var(--stroke);
  border-radius: 6px;
  padding: 8px;
  min-width: 180px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 50;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}

.tv-tab-settings-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tv-tab-settings-label {
  font-size: 0.7rem;
  color: var(--muted);
}

.tv-tab-settings-input {
  border: 1px solid var(--stroke);
  background: var(--surface-alt);
  color: var(--ink);
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 0.78rem;
  outline: none;
}

.tv-tab-settings-input:focus {
  border-color: var(--accent);
}

.tv-tab-settings-save {
  align-self: flex-end;
  border: none;
  background: var(--surface-2);
  color: var(--ink);
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
}

.tv-tab-settings-save:hover {
  background: var(--hover);
}

.tv-category-tab-input {
  width: 120px;
  max-width: 160px;
  background: transparent;
  border: none;
  outline: none;
  color: inherit;
  font-size: 0.78rem;
}

.tv-symbol-name {
  font-weight: 600;
}

.tv-symbol-more {
  font-size: 0.75rem;
  opacity: 0.7;
}

/* Buttons & Controls */
.tv-btn {
  padding: 5px 10px;
  background: transparent;
  border: none;
  color: var(--muted);
  font-size: 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: transform 0.15s ease, background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  line-height: 1;
}

.tv-header .tv-btn {
  padding: 4px 8px;
  height: 26px;
  font-size: 12px;
}

.tv-header .tv-btn:hover {
  background: var(--hover);
}

.tv-header .tv-btn:active {
  transform: translateY(0);
}

.tv-btn:hover {
  background: var(--hover);
  color: var(--ink);
}

.tv-btn.active {
  background: rgba(41, 98, 255, 0.15);
  color: var(--accent);
}

.tv-btn.icon {
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tv-btn-group {
  display: flex;
  background: var(--surface-alt);
  border-radius: 4px;
  overflow: hidden;
}

.tv-btn-group .tv-btn {
  border-radius: 0;
}

.tv-btn-group.is-collapsed {
}

.tv-select {
  padding: 4px 8px;
  background: var(--surface-alt);
  border: none;
  color: var(--ink);
  font-size: 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23787b86' stroke-width='2'%3e%3cpath d='M6 9l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 4px center;
  background-size: 14px;
  padding-right: 22px;
}

.tv-header .tv-select:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
}

.tv-header .tv-select:active {
  transform: translateY(0);
  box-shadow: none;
}

.tv-select:hover {
  background-color: var(--hover);
}

.tv-select:focus {
  outline: 1px solid var(--accent);
  outline-offset: 0;
}

.tv-select option {
  background: var(--surface);
  color: var(--ink);
  padding: 8px;
}

/* Main Layout */
.tv-main {
  display: flex;
  height: calc(100vh - 40px);
  overflow: hidden;
}

.tv-sidebar {
  width: 48px;
  background: var(--surface);
  border-right: 1px solid var(--stroke);
  display: flex;
  flex-direction: column;
  position: relative;
  padding: 4px 0;
  gap: 2px;
}

.tv-sidebar-right {
  border-right: none;
  border-left: 1px solid var(--stroke);
}

.tv-right-stack {
  display: flex;
  align-items: stretch;
  gap: 0;
}

.tv-drawing-sidebar {
  gap: 8px;
  padding: 8px 6px;
  width: 180px;
  border-left: 1px solid var(--stroke);
}

.tv-drawing-prop {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 4px;
  color: var(--muted);
  font-size: 0.75rem;
}

.tv-drawing-label {
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 0.68rem;
  color: var(--muted);
}

.tv-drawing-value {
  color: var(--ink);
  font-weight: 600;
  font-size: 0.78rem;
  text-transform: capitalize;
}

.tv-drawing-input {
  background: transparent;
  border: 1px solid var(--stroke);
  border-radius: 6px;
  padding: 6px 8px;
  color: var(--ink);
  font-size: 0.78rem;
  outline: none;
}

.tv-drawing-input:focus {
  border-color: var(--accent);
}

.tv-drawing-color {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid var(--stroke);
}

.tv-drawing-trash {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 4px 6px 0;
  padding: 6px 8px;
  border: 1px solid var(--stroke);
  background: transparent;
  border-radius: 6px;
  color: var(--muted);
  cursor: pointer;
  font-size: 0.75rem;
}

.tv-drawing-trash:hover {
  color: #ef5350;
  border-color: rgba(239, 83, 80, 0.4);
  background: rgba(239, 83, 80, 0.1);
}

.tv-drawing-color-picker {
  position: relative;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.tv-drawing-color-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.tv-drawing-close {
  align-self: flex-end;
  margin: 4px 6px 0;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.tv-drawing-close:hover {
  color: var(--ink);
}

.search-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.search-modal-close {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.search-modal-close:hover {
  background: var(--surface-alt);
  color: var(--ink);
}

/* Sidebar Buttons */
.tv-sidebar-btn {
  width: 40px;
  height: 36px;
  margin: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--muted);
  cursor: pointer;
}

.tv-sidebar-btn:hover {
  background: var(--hover);
  color: var(--ink);
}

.tv-sidebar-btn.active {
  background: rgba(41, 98, 255, 0.15);
  color: var(--accent);
}

.tv-sidebar-btn.danger:hover {
  background: rgba(239, 83, 80, 0.15);
  color: #ef5350;
}

.tv-sidebar-divider {
  height: 1px;
  background: var(--stroke);
  margin: 6px 8px;
}

/* Navigation Popup */
.tv-nav-popup {
  position: absolute;
  top: 0;
  left: 48px;
  width: 200px;
  background: var(--surface);
  border: 1px solid var(--stroke);
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  z-index: 100;
}

.tv-nav-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  font-size: 0.85rem;
  font-weight: 600;
  border-bottom: 1px solid var(--stroke);
}

.tv-nav-header button {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 1.2rem;
}

.tv-nav-items {
  display: flex;
  flex-direction: column;
}

.tv-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: transparent;
  border: none;
  color: var(--ink);
  font-size: 0.85rem;
  cursor: pointer;
  text-align: left;
}

.tv-nav-item:hover {
  background: var(--hover);
}

.tv-nav-item.active,
.tv-nav-item.router-link-active,
.tv-nav-item.router-link-exact-active {
  background: rgba(41, 98, 255, 0.15);
  color: var(--accent);
}

.tv-chart-area {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  overflow: hidden;
  min-height: 0;
}

.tv-chart-canvas {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  min-height: 0;
}

.tv-chart-canvas.is-empty :deep(.drawing-layer) {
  pointer-events: none;
}

.tv-chart-scroll {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  height: auto;
  overflow: hidden;
  max-width: 100%;
  max-height: 100%;
  overscroll-behavior: contain;
  cursor: default;
  scrollbar-width: none;
  user-select: auto;
  -webkit-user-select: auto;
  -ms-user-select: auto;
}

.tv-chart-scroll::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.tv-chart-scroll-inner {
  position: relative;
  min-width: 100%;
  min-height: 0;
  padding: 0;
  box-sizing: border-box;
  width: 100%;
  height: auto;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Global body resize state - disable interactions during resize */
:global(body.is-resizing-panes) {
  cursor: ns-resize !important;
  user-select: none !important;
}

:global(body.is-resizing-panes *) {
  cursor: ns-resize !important;
  pointer-events: none !important;
}

/* Keep resize handle interactive during resize */
:global(body.is-resizing-panes .tv-pane-resize-handle),
:global(body.is-resizing-panes .tv-pane-resize-handle *) {
  pointer-events: auto !important;
}

/* Hide chart tooltips during resize */
:global(body.is-resizing-panes .apexcharts-tooltip) {
  display: none !important;
}

.tv-chart-frame {
  position: relative;
  width: 100%;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  min-height: 100px; /* Minimum pane height */
}

/* Ensure chart wrapper doesn't block resize handle */
.tv-chart-frame :deep(.chart-wrapper) {
  position: relative;
  z-index: 1;
}

.tv-chart-pane.is-subpane {
  border-top: 1px solid var(--stroke);
}

/* ===== TradingView-style Pane Resize Handle ===== */
.tv-pane-resize-handle {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -8px;
  height: 16px;
  cursor: ns-resize;
  /* Higher z-index to stay above chart elements */
  z-index: 1000 !important;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  transition: background-color 0.15s ease;
  pointer-events: auto;
  touch-action: none;
  /* Ensure minimum touch target size */
  min-height: 16px;
}

.tv-pane-resize-handle:hover,
.tv-pane-resize-handle.is-active {
  background: rgba(41, 98, 255, 0.12);
}

.tv-pane-resize-line {
  position: absolute;
  left: 5%;
  right: 5%;
  height: 3px;
  background: var(--stroke);
  border-radius: 2px;
  transition: all 0.15s ease;
  opacity: 0.6;
  pointer-events: none;
}

.tv-pane-resize-handle:hover .tv-pane-resize-line,
.tv-pane-resize-handle.is-active .tv-pane-resize-line {
  background: var(--accent);
  height: 3px;
  left: 10%;
  right: 10%;
}

.tv-pane-resize-grip {
  position: relative;
  z-index: 1001;
  width: 48px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  border: 2px solid var(--stroke);
  border-radius: 6px;
  color: var(--muted);
  opacity: 0.5;
  transition: all 0.15s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  pointer-events: none;
}

.tv-pane-resize-handle:hover .tv-pane-resize-grip,
.tv-pane-resize-handle.is-active .tv-pane-resize-grip {
  opacity: 1;
  color: var(--accent);
  border-color: var(--accent);
  background: var(--surface);
  transform: scale(1.05);
}

/* Show grip on pane hover too */
.tv-chart-pane:hover .tv-pane-resize-grip {
  opacity: 0.7;
}

/* Resize active state for pane */
.tv-chart-pane.is-resizing {
  user-select: none;
}

.tv-chart-pane.is-resizing::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(41, 98, 255, 0.04);
  pointer-events: none;
}

.tv-empty-tabs {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--muted);
  z-index: 30;
  pointer-events: auto;
  text-align: center;
}

.tv-empty-tabs-visual {
  color: var(--muted);
  opacity: 0.7;
  pointer-events: none;
}

.tv-empty-tabs-text {
  font-size: 0.9rem;
  pointer-events: none;
}

.tv-empty-tabs-actions {
  position: relative;
  pointer-events: auto;
}

.tv-add-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: #1e6bff;
  color: #fff;
  border: none;
  border-radius: 999px;
  font-size: 0.9rem;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(30, 107, 255, 0.35);
}

.tv-add-tab-btn:hover {
  background: #1557d6;
}

.tv-chart-canvas :deep(.chart-wrapper) {
  width: 100% !important;
  height: 100% !important;
}

.tv-range-bar {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  min-height: 40px;
  padding: 6px 10px;
  border-top: 1px solid var(--stroke);
  background: var(--surface);
  z-index: 35;
  position: relative;
  flex-wrap: wrap;
}

.tv-range-preset {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.tv-range-btn {
  border: 1px solid var(--stroke);
  background: var(--surface-alt);
  color: var(--ink);
  border-radius: 6px;
  height: 26px;
  padding: 0 8px;
  font-size: 12px;
  cursor: pointer;
}

.tv-range-btn.active {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(41, 98, 255, 0.14);
}

.tv-range-interval {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: 4px;
}

.tv-range-label {
  font-size: 12px;
  color: var(--muted);
}

.tv-select-interval {
  min-width: 118px;
}

.tv-chart-canvas :deep(.apexcharts-canvas) {
  width: 100% !important;
}

/* Hide axes when there are no tabs */
.tv-chart-canvas.is-empty :deep(.apexcharts-xaxis),
.tv-chart-canvas.is-empty :deep(.apexcharts-yaxis),
.tv-chart-canvas.is-empty :deep(.apexcharts-xaxis-texts-g),
.tv-chart-canvas.is-empty :deep(.apexcharts-yaxis-texts-g),
.tv-chart-canvas.is-empty :deep(.apexcharts-xaxis-tick),
.tv-chart-canvas.is-empty :deep(.apexcharts-yaxis-tick) {
  display: none !important;
}

/* Drawing Layer Overlay */
.tv-drawing-overlay {
  position: absolute;
  top: 40px;  /* Start below header (header height is 40px) */
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  pointer-events: none;
}

/* Only enable pointer events on canvas when drawing tool is active (not select) */
.tv-drawing-overlay.is-interactive :deep(canvas) {
  pointer-events: auto;
}

.tv-drawing-overlay.is-drawing-tool :deep(canvas) {
  cursor: crosshair;
}

.tv-drawing-overlay.is-interactive:not(.is-drawing-tool) :deep(canvas) {
  cursor: pointer;
}

.tv-drawing-overlay :deep(.drawing-toolbar) {
  display: none;
}

/* ApexCharts Legend Styling - Vertical with Eye Icon */
.tv-chart-canvas :deep(.apexcharts-legend) {
  flex-direction: column !important;
  align-items: flex-start !important;
  padding: 8px !important;
  gap: 4px !important;
  z-index: 20 !important; /* Above drawing overlay (z-index: 10) */
  pointer-events: auto !important;
  max-width: 150px !important; /* Limit width so it doesn't cover chart */
  width: auto !important;
}

/* Collapsible Legend + Tabs Group */
.tv-legend-group {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 40;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: fit-content;
  max-width: calc(100% - 16px);
}

.tv-legend-overlay {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  background: var(--glass);
  backdrop-filter: blur(8px);
  border-radius: 6px;
  padding: 6px 8px;
  transition: all 0.2s ease;
  max-width: 280px;
  pointer-events: auto;
}

.tv-legend-overlay.is-collapsed {
  padding: 6px;
  background: transparent;
  backdrop-filter: none;
}

.tv-legend-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  transition: all 0.15s;
}

.tv-legend-toggle:hover {
  background: var(--surface);
  color: var(--ink);
}

.tv-legend-toggle svg {
  transition: transform 0.2s ease;
}

.tv-legend-toggle svg.chevron-rotated {
  transform: rotate(90deg);
}

.tv-legend-content {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.tv-prediction-legend {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--stroke);
  display: grid;
  gap: 6px;
}

.tv-prediction-legend-title {
  font-size: 0.66rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.tv-prediction-direction-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.tv-prediction-direction-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.7rem;
  color: var(--muted);
}

.tv-prediction-direction-swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
}

.tv-prediction-direction-swatch.is-bull {
  background: rgba(66, 165, 245, 0.88);
}

.tv-prediction-direction-swatch.is-bear {
  background: rgba(255, 112, 67, 0.88);
}

.tv-prediction-legend-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
  transition: opacity 0.15s;
}
.tv-prediction-legend-row.is-hidden {
  opacity: 0.35;
}

.tv-prediction-legend-badge {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.24);
}
.tv-prediction-legend-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  flex-shrink: 0;
}

.tv-prediction-legend-label {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--ink);
  flex: 1;
  min-width: 0;
}

.tv-prediction-legend-note {
  font-size: 0.68rem;
  color: var(--muted);
  white-space: nowrap;
}

.tv-legend-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  white-space: nowrap;
  flex-wrap: nowrap;
  transition: opacity 0.15s;
  position: relative;
}

.tv-legend-row--hidden {
  opacity: 0.4;
}

.tv-legend-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid;
  padding: 0;
  background: none;
  cursor: default;
  transition: opacity 0.15s;
}

.tv-legend-color-dot:hover {
  opacity: 0.9;
}

.tv-legend-symbol {
  color: var(--ink);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
  white-space: nowrap;
  min-width: 0;
  flex: 1 1 auto;
}

.tv-legend-desc {
  color: var(--muted);
  font-size: 0.72rem;
  white-space: nowrap;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tv-legend-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  flex: 0 0 auto;
}

.tv-legend-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}

.tv-legend-action:hover {
  color: var(--ink);
  background: var(--surface);
}

.tv-legend-action.is-trash:hover {
  color: #e05656;
}

.tv-legend-settings {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 6px;
  padding: 8px;
  background: var(--surface);
  border: 1px solid var(--stroke);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 200px;
  z-index: 5;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}

.tv-legend-settings-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tv-legend-settings-label {
  width: 48px;
  font-size: 0.72rem;
  color: var(--muted);
}

.tv-legend-settings-input {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--stroke);
  background: var(--glass);
  color: var(--ink);
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 0.75rem;
}

.tv-legend-settings-color {
  width: 34px;
  height: 24px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.tv-legend-empty {
  color: var(--muted);
  font-size: 0.75rem;
  font-style: italic;
  white-space: nowrap;
}

/* Hide ApexCharts built-in legend - using our custom chevron legend instead */
.tv-chart-canvas :deep(.apexcharts-legend) {
  display: none !important;
}

/* Legend Overlay */
.tv-legend {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tv-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: rgba(0,0,0,0.6);
  border-radius: 4px;
  font-size: 0.8rem;
}

.tv-legend-color {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
}

.tv-legend-eye {
  width: 12px;
  height: 12px;
  opacity: 0;
  color: #fff;
  transition: opacity 0.15s;
}

.tv-legend-item:hover .tv-legend-eye {
  opacity: 1;
}

.tv-legend-item.is-hidden {
  opacity: 0.4;
}

.tv-legend-item.is-hidden .tv-legend-eye {
  opacity: 1;
}

.tv-legend-text {
  font-weight: 500;
  color: #fff;
}

.tv-legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.tv-legend-name {
  font-weight: 500;
  color: #fff;
}

.tv-legend-btn {
  padding: 2px;
  background: transparent;
  border: none;
  color: rgba(255,255,255,0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
}

.tv-legend-btn:hover {
  color: #fff;
}

/* Summary Bar (bottom) */
.tv-summary-bar {
  display: flex;
  align-items: center;
  gap: 10px;  /* Reduced from 16px */
  padding: 4px 8px;  /* Reduced from 6px 12px */
  background: var(--surface);
  border-top: 1px solid var(--stroke);
  font-size: 0.75rem;
  overflow-x: auto;
}

.tv-summary-item {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.tv-summary-label {
  color: var(--muted);
}

.tv-summary-value {
  font-weight: 600;
  color: var(--ink);
}

.tv-summary-unit {
  color: var(--muted);
  font-size: 0.7rem;
}

.tv-summary-date {
  color: var(--muted);
  font-size: 0.7rem;
}

.tv-summary-series {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.tv-summary-series-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--surface-alt);
  border: 1px solid var(--stroke);
  font-size: 0.72rem;
}

.tv-summary-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tv-summary-series-name {
  font-weight: 600;
  color: var(--ink);
}

.tv-summary-series-metric {
  color: var(--muted);
}

.tv-summary-series-metric.is-up {
  color: #22c55e;
  font-weight: 600;
}

.tv-summary-series-metric.is-down {
  color: #ef4444;
  font-weight: 600;
}

/* ============ Legacy Styles (Search Modal, etc.) ============ */
.series-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.series-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--surface);
  border: 2px solid;
  border-radius: 16px;
  font-size: 0.85rem;
}

.chip-remove {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}

.chip-remove:hover {
  color: var(--ink);
}

.search-modal.is-open {
  display: flex;
}

.search-item:hover {
  background: var(--surface-alt);
}

.search-item.is-selected {
  background: rgba(41, 98, 255, 0.1);
}

/* Filter Tabs - TradingView style */
.search-filter-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--stroke);
  flex-wrap: wrap;
  align-items: center;
}

.category-tabs {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.category-tabs-actions {
  margin-left: auto;
  position: relative;
  display: flex;
  align-items: center;
}

.new-tab-btn {
  white-space: nowrap;
}

.new-tab-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  background: var(--surface);
  border: 1px solid var(--stroke);
  border-radius: 6px;
  padding: 6px;
  min-width: 140px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 5;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}

.new-tab-option {
  border: none;
  background: transparent;
  text-align: left;
  padding: 6px 8px;
  border-radius: 4px;
  color: var(--ink);
  cursor: pointer;
  font-size: 0.78rem;
}

.new-tab-option:hover {
  background: var(--surface-2);
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid var(--stroke);
  border-radius: 16px;
  color: var(--muted);
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.15s;
}

.filter-tab:hover {
  background: var(--surface-alt);
  color: var(--ink);
}

.filter-tab.active {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

/* Search Item Wrapper for hover scale options */
.search-item-wrapper {
  position: relative;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--stroke);
  color: var(--ink);
  text-align: left;
  cursor: pointer;
}

.search-item-icon {
  font-size: 1rem;
  opacity: 0.7;
}

.search-item-icon.nilai {
  color: #26a69a;
}

.search-item-icon.dokumen {
  color: #2962ff;
}

.search-item-code {
  font-weight: 600;
  display: block;
}

.search-item-name {
  font-size: 0.85rem;
  color: var(--ink);
  line-height: 1.2;
  display: block;
}

.search-item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-self: center;
}

.search-item-desc {
  font-size: 0.75rem;
  color: var(--muted);
  white-space: normal;
  overflow: visible;
  display: block;
}

.search-item-unit {
  font-size: 0.75rem;
  padding: 2px 6px;
  background: var(--surface-alt);
  border-radius: 4px;
  color: var(--muted);
}

/* Scale Options - shown on hover */
.scale-options {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  gap: 4px;
  z-index: 10;
}

.scale-btn {
  padding: 4px 8px;
  background: var(--surface);
  border: 1px solid var(--stroke);
  border-radius: 4px;
  color: var(--ink);
  font-size: 0.72rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.scale-btn:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

.search-loading,
.search-empty {
  padding: 20px;
  text-align: center;
  color: var(--muted);
}

.trend.up {
  color: #26a69a;
}

.trend.down {
  color: #ef5350;
}

/* ===== Object Tree & Layers Panels ===== */
.tv-panel {
  position: absolute;
  right: 0;
  top: 0;
  bottom: auto;
  width: 300px;
  transform: none;
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  border: 1px solid var(--stroke);
  border-radius: 8px;
  z-index: 25;
  box-shadow: var(--shadow);
}

.tv-layers-panel {
  right: 72px;
  top: 16px;
  bottom: 16px;
  width: clamp(360px, 34vw, 460px);
  max-width: calc(100% - 104px);
  min-height: min(520px, calc(100% - 32px));
  display: flex;
  flex-direction: column;
}

.tv-layers-panel.is-shifted {
  right: 72px;
}

.tv-object-tree {
  top: 0;
}

.tv-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--stroke);
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--ink);
}

.tv-panel-close {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 0 4px;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.tv-panel-close:hover {
  color: var(--ink);
}

.tv-panel-body {
  padding: 12px;
  max-height: min(420px, calc(100vh - 180px));
  overflow-y: auto;
}

.tv-layers-panel .tv-panel-body {
  flex: 1;
  max-height: none;
  min-height: 0;
}

/* Object Tree Items */
.tv-object-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tv-object-empty,
.tv-layer-empty {
  padding: 12px;
  text-align: center;
  color: var(--muted);
  font-size: 0.8rem;
}

.tv-object-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: var(--surface-alt);
  border-radius: 4px;
  font-size: 0.8rem;
  color: var(--ink);
}

.tv-object-item:hover {
  background: var(--hover);
}

.tv-object-color {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tv-object-name {
  flex: 1;
  text-transform: capitalize;
}

.tv-object-delete {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 0 4px;
  opacity: 0;
  transition: opacity 0.15s;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.tv-object-item:hover .tv-object-delete {
  opacity: 1;
}

.tv-object-delete:hover {
  color: #ef5350;
}

/* Layer Items */
.tv-layer-section {
  margin-bottom: 12px;
}

.tv-layer-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 14px;
  padding-top: 2px;
}

.tv-layer-tab {
  border: 1px solid var(--stroke);
  background: var(--surface-alt);
  color: var(--muted);
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

.tv-layer-tab:hover {
  color: var(--ink);
  background: var(--hover);
}

.tv-layer-tab.active {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 50%, var(--stroke));
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
}

.tv-layer-tab-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tv-layer-title {
  font-size: 0.7rem;
  text-transform: uppercase;
  color: var(--muted);
  padding: 4px 8px;
  letter-spacing: 0.5px;
}

.tv-layer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  font-size: 0.8rem;
  color: var(--ink);
  border-radius: 4px;
}

.tv-layer-item:hover {
  background: var(--surface-alt);
}

.tv-layer-item-interactive {
  cursor: pointer;
}

.tv-layer-item-interactive:hover {
  background: var(--hover);
}

.tv-layer-icon {
  width: 16px;
  height: 16px;
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.tv-layer-name {
  flex: 1;
}

.tv-layer-delete {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 0 4px;
  opacity: 0;
  transition: opacity 0.15s;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.tv-layer-item:hover .tv-layer-delete {
  opacity: 1;
}

.tv-layer-delete:hover {
  color: #ef5350;
}

.tv-layer-action {
  font-size: 0.7rem;
  color: var(--muted);
  opacity: 0;
  transition: opacity 0.15s;
}

.tv-layer-item:hover .tv-layer-action {
  opacity: 1;
  color: #ef5350;
}

.tv-data-window-symbols {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.tv-data-window-symbol-btn {
  border: 1px solid var(--stroke);
  background: var(--surface-alt);
  color: var(--muted);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.72rem;
  cursor: pointer;
}

.tv-data-window-symbol-btn.active {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 50%, var(--stroke));
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
}

.tv-data-window-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 8px;
  background: var(--surface-alt);
}

.tv-data-window-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 5px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--stroke) 80%, transparent);
  font-size: 0.76rem;
}

.tv-data-window-row:last-child {
  border-bottom: none;
}

.tv-data-window-row span {
  color: var(--muted);
}

.tv-data-window-row strong {
  color: var(--ink);
  text-align: right;
}

.tv-layer-tree {
  margin: 2px 0 8px 24px;
  padding: 6px 8px;
  border: 1px solid var(--stroke);
  border-radius: 6px;
  background: var(--surface-alt);
  font-size: 0.72rem;
  color: var(--muted);
  display: grid;
  gap: 3px;
}

.tv-layer-tree strong {
  color: var(--ink);
  font-weight: 600;
}
</style>
