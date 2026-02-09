<template>
  <!-- Compact TradingView-style Header -->
  <header class="tv-header">
    <div class="tv-header-left">
      <div class="tv-logo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M3 17L9 11L13 15L21 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M17 7H21V11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="tv-title">Procurement</span>
      </div>
      
      
    </div>
    
    <div class="tv-header-center">
      <!-- Period Type -->
      <div class="tv-btn-group">
        <button :class="['tv-btn', { active: periodType === 'calendar' }]" @click="periodType = 'calendar'">Kalender</button>
        <button :class="['tv-btn', { active: periodType === 'fiscal' }]" @click="periodType = 'fiscal'">Anggaran</button>
      </div>
      
      <!-- Year -->
      <select v-model="year" class="tv-select">
        <option :value="2024">2024</option>
        <option :value="2025">2025</option>
        <option :value="2026">2026</option>
      </select>
      
      <!-- Filters -->
      <select v-model="sumberDana" class="tv-select">
        <option value="">Semua Dana</option>
        <option value="eksploitasi">Eksploitasi</option>
        <option value="investasi">Investasi</option>
      </select>
      
      <select v-model="kategoriPlant" class="tv-select">
        <option value="">Semua Plant</option>
        <option value="PG">PG</option>
        <option value="MKSO">MKSO</option>
        <option value="HO">HO</option>
      </select>
      
      <!-- Max Series Limit -->
      <select v-model="maxSeries" class="tv-select" title="Maximum series to display">
        <option :value="3">Max 3</option>
        <option :value="5">Max 5</option>
        <option :value="10">Max 10</option>
      </select>
      
      <!-- Mode Buttons -->
      <button :class="['tv-btn', { active: rawMode }]" @click="rawMode = !rawMode" title="Raw data">Raw</button>
      <button :class="['tv-btn', { active: cumulative }]" @click="cumulative = !cumulative" title="Kumulatif">Σ</button>
      <button :class="['tv-btn', { active: singleScale }]" @click="singleScale = !singleScale" title="Single Y scale">1 Skala</button>
      <button class="tv-btn" @click="scaleSide = scaleSide === 'left' ? 'right' : 'left'" title="Posisi Skala">
        {{ scaleSide === 'left' ? 'Skala Kiri' : 'Skala Kanan' }}
      </button>
      
      <!-- Chart Type (tanpa candlestick) -->
      <div class="tv-btn-group">
        <button v-for="type in chartTypesFiltered" :key="type.value" :class="['tv-btn', { active: chartType === type.value }]" @click="chartType = type.value" :title="type.label">
          {{ type.label }}
        </button>
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
      <button class="tv-btn icon" title="Zoom In" @click="chartRef?.zoomIn()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M11 8v6M8 11h6M20 20l-4-4" stroke="currentColor" stroke-width="2"/></svg>
      </button>
      <button class="tv-btn icon" title="Zoom Out" @click="chartRef?.zoomOut()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M8 11h6M20 20l-4-4" stroke="currentColor" stroke-width="2"/></svg>
      </button>
      <button class="tv-btn icon" title="Fit" @click="chartRef?.refresh()">
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
          <button @click="navMenuOpen = false">×</button>
        </div>
        <div class="tv-nav-items">
          <a class="tv-nav-item" href="/" target="_blank" @click="navMenuOpen = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3c3.5 4 3.5 14 0 18M12 3c-3.5 4-3.5 14 0 18" stroke="currentColor" stroke-width="2"/></svg>
            <span>Procurement Charting</span>
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
    <div class="tv-chart-area">
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
          @pointerdown="onChartPointerDown"
          @pointermove="onChartPointerMove"
          @pointerup="onChartPointerUp"
          @pointerleave="onChartPointerUp"
          @wheel.stop.prevent="onChartWheel"
        >
          <div class="tv-chart-scroll-inner">
            <div class="tv-chart-frame" :style="{ height: chartHeight + 'px' }">
              <ProcurementChart
                ref="chartRef"
                :chart-type="chartType"
                :period-type="periodType"
                :year="year"
                :symbols="selectedSymbols"
                :symbol-meta="selectedSymbolMeta"
                :hidden-series="hiddenSeries"
                :color-overrides="legendColors"
                :normalize="normalize"
          :log-scale="logScale"
          :raw-mode="rawMode"
          :cumulative="cumulative"
          :single-scale="singleScale"
          :scale-side="scaleSide"
          :y-axis-override="activeYAxisOverride"
          :y-axis-by-symbol-override="activeYAxisBySymbolOverride"
          :sumber-dana="sumberDana"
          :kategori-plant="kategoriPlant"
          :theme="theme"
                :height="chartHeight"
                @data-loaded="onDataLoaded"
                @error="onChartError"
              />
              <!-- Drawing Layer Overlay (canvas only, no toolbar) -->
            <DrawingLayer 
              ref="drawingRef" 
              :height="chartHeight" 
              :show-toolbar="false"
              :active-tool="activeDrawingTool"
              class="tv-drawing-overlay"
              :class="{ 'is-interactive': drawingOverlayInteractive, 'is-drawing-tool': activeDrawingTool !== 'select' }"
              @selection="onDrawingSelection"
            />
          </div>
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
                v-for="(symbol, idx) in selectedSymbols" 
                :key="symbol" 
                class="tv-legend-row"
                :class="{ 'tv-legend-row--hidden': hiddenSeries.has(symbol) }"
              >
                <span 
                  class="tv-legend-color-dot" 
                  :style="{ backgroundColor: getLegendColor(symbol, idx), borderColor: getLegendColor(symbol, idx) }"
                ></span>
                <span class="tv-legend-symbol">{{ getLegendName(symbol) }}</span>
                <span class="tv-legend-value" v-if="getSymbolValue(symbol)">
                  {{ formatNumber(getSymbolValue(symbol)) }}
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
              <div class="tv-legend-empty" v-if="!selectedSymbols.length">
                No series selected
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
                <button class="tv-category-close" type="button" title="Close tab" @click.stop="closeCategoryTab(tab.id)">
                  ×
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
      <div class="tv-panel tv-object-tree" v-if="showObjectTree">
        <div class="tv-panel-header">
          <span>Drawing Objects</span>
          <button class="tv-panel-close" @click="showObjectTree = false">×</button>
        </div>
        <div class="tv-panel-body">
          <div v-if="drawingRef" class="tv-object-list">
            <div class="tv-object-empty" v-if="!drawingRef.drawings?.length">
              No drawings yet
            </div>
            <template v-else>
              <div 
                v-for="(drawing, idx) in drawingRef.drawings" 
                :key="idx"
                class="tv-object-item"
              >
                <span class="tv-object-color" :style="{ backgroundColor: drawing.color }"></span>
                <span class="tv-object-name">{{ drawing.type }}</span>
                <button class="tv-object-delete" @click="deleteDrawing(idx)">×</button>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Layers Panel -->
      <div class="tv-panel tv-layers-panel" :class="{ 'is-shifted': showObjectTree }" v-if="showLayersPanel">
        <div class="tv-panel-header">
          <span>Layers</span>
          <button class="tv-panel-close" @click="showLayersPanel = false">×</button>
        </div>
        <div class="tv-panel-body">
          <div class="tv-layer-section">
            <div class="tv-layer-title">Data Series</div>
            <div class="tv-layer-empty" v-if="!selectedSymbols.length">No series selected</div>
            <div 
              v-for="symbol in selectedSymbols" 
              :key="symbol"
              class="tv-layer-item tv-layer-item-interactive"
            >
              <span class="tv-layer-icon">📊</span>
              <span class="tv-layer-name">{{ symbol }}</span>
              <button class="tv-layer-delete" @click="removeSymbol(symbol)" title="Remove series">×</button>
            </div>
          </div>
          <div class="tv-layer-section">
            <div class="tv-layer-title">Drawings</div>
            <div 
              class="tv-layer-item tv-layer-item-interactive" 
              v-if="drawingRef?.drawings?.length"
              @click="clearDrawings"
            >
              <span class="tv-layer-icon">✏️</span>
              <span class="tv-layer-name">Drawing Layer ({{ drawingRef.drawings.length }} objects)</span>
              <span class="tv-layer-action">Clear</span>
            </div>
            <div class="tv-layer-empty" v-else>No drawings</div>
          </div>
        </div>
      </div>
      
      <!-- Compact Summary Bar - Always visible -->
      <div class="tv-summary-bar">
        <template v-if="summaryData">
          <div class="tv-summary-item">
            <span class="tv-summary-label">Total (Gabungan):</span>
            <span class="tv-summary-value">{{ formatNumber(summaryData.totalAll) }}</span>
          </div>
          <div class="tv-summary-series">
            <div
              v-for="series in summaryData.series"
              :key="series.symbol"
              class="tv-summary-series-item"
            >
              <span class="tv-summary-dot" :style="{ backgroundColor: series.color }"></span>
              <span class="tv-summary-series-name">{{ getLegendName(series.symbol) }}</span>
              <span class="tv-summary-series-metric">Σ {{ formatNumber(series.total) }}</span>
              <span class="tv-summary-series-metric">Terakhir {{ formatNumber(series.latest) }}</span>
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
        <button class="tv-drawing-close" type="button" title="Close properties" @click="clearSelectedDrawing">
          ×
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
        <button class="tv-sidebar-btn" :class="{ active: logScale }" @click="logScale = !logScale" title="Log Scale">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 19h16M6 16c2-3 4-4 6-4s4 1 6 4" stroke="currentColor" stroke-width="2"/></svg>
        </button>
        <button class="tv-sidebar-btn" :class="{ active: normalize }" @click="normalize = !normalize" title="Normalize">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 17h16M7 4v16" stroke="currentColor" stroke-width="2"/></svg>
        </button>
        <div class="tv-sidebar-divider"></div>
        <button class="tv-sidebar-btn" :class="{ active: showObjectTree }" @click="showObjectTree = !showObjectTree" title="Object Tree">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 3h18v18H3z" stroke="currentColor" stroke-width="2"/>
            <path d="M7 12h10M7 8h6M7 16h8" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
        <button class="tv-sidebar-btn" :class="{ active: showLayersPanel }" @click="showLayersPanel = !showLayersPanel" title="Layers">
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
    <div class="search-modal-panel" role="dialog" aria-modal="true" aria-label="Kode Data Search">
      <div class="search-modal-header">
        <div class="search-modal-title">Symbol Search</div>
        <button type="button" class="search-modal-close" @click="closeSearchModal" aria-label="Close">×</button>
      </div>
      
      <!-- Search Input -->
      <div class="search-modal-input">
        <input 
          ref="searchInput"
          v-model="searchQuery" 
          type="text" 
          class="search-input" 
          placeholder="Cari kode data..." 
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
              'is-selected': selectedSymbols.includes(sym.symbol),
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
          <div class="scale-options" v-if="hoveredSymbol === sym.symbol && !selectedSymbols.includes(sym.symbol)">
            <button 
              class="scale-btn" 
              title="Same % scale (normalized)"
              @click.stop="selectSymbolWithScale(sym, 'percent')"
            >Same %</button>
            <button 
              class="scale-btn" 
              title="New price scale (separate Y-axis)"
              @click.stop="selectSymbolWithScale(sym, 'scale')"
            >New scale</button>
            <button 
              class="scale-btn" 
              title="New pane (separate chart)"
              @click.stop="selectSymbolWithScale(sym, 'pane')"
            >New pane</button>
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
}

interface SummarySeries {
  symbol: string
  total: number
  latest: number
  latestDate?: string
  color: string
}

interface SummaryData {
  totalAll: number
  series: SummarySeries[]
}

// Chart types
const chartTypes = [
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
  { value: 'bar', label: 'Bar' }
] as const

// Filtered chart types (tanpa candlestick) untuk header
const chartTypesFiltered = computed(() => chartTypes)

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
  if (drawingRef.value) {
    drawingRef.value.clearAll()
  }
}

// Chart ref
const chartRef = ref<InstanceType<typeof ProcurementChart> | null>(null)
const drawingRef = ref<InstanceType<typeof DrawingLayer> | null>(null)
const selectedDrawing = ref<{ type: string; points: number[]; color: string; name?: string } | null>(null)
const selectedDrawingIndex = ref<number | null>(null)
const selectedDrawingName = ref('')
const drawingOverlayInteractive = computed(() => {
  if (activeDrawingTool.value !== 'select') return true
  return (drawingRef.value?.drawings?.length || 0) > 0
})

// Panel visibility state
const showObjectTree = ref(false)
const showLayersPanel = ref(false)
const legendCollapsed = ref(false)

// Get symbol value from summary data
function getSymbolValue(symbol: string): number | undefined {
  if (!summaryData.value?.series) return undefined
  const series = summaryData.value.series.find(s => s.symbol === symbol)
  return series?.latest
}

// Delete drawing by index
function deleteDrawing(idx: number) {
  if (drawingRef.value?.drawings) {
    drawingRef.value.pushHistory?.()
    drawingRef.value.drawings.splice(idx, 1)
    drawingRef.value.redraw?.()
    if (selectedDrawingIndex.value !== null) {
      if (!drawingRef.value.drawings.length) {
        selectedDrawing.value = null
        selectedDrawingIndex.value = null
        selectedDrawingName.value = ''
      } else if (idx === selectedDrawingIndex.value) {
        selectedDrawing.value = null
        selectedDrawingIndex.value = null
        selectedDrawingName.value = ''
      } else if (idx < selectedDrawingIndex.value) {
        selectedDrawingIndex.value -= 1
      }
    }
  }
}

function onDrawingSelection(payload: { drawing: { type: string; points: number[]; color: string; name?: string }; index: number } | null) {
  selectedDrawing.value = payload?.drawing || null
  selectedDrawingIndex.value = payload?.index ?? null
  selectedDrawingName.value = payload?.drawing?.name || ''
}

function commitSelectedDrawingName() {
  if (!drawingRef.value || !selectedDrawing.value) return
  const drawings = drawingRef.value.drawings
  if (selectedDrawingIndex.value === null) return
  const matchIndex = selectedDrawingIndex.value
  const nextName = selectedDrawingName.value.trim()
  drawingRef.value.pushHistory?.()
  drawings[matchIndex].name = nextName || undefined
  selectedDrawing.value = { ...drawings[matchIndex] }
  drawingRef.value.redraw?.()
}

function updateSelectedDrawingColor(nextColor: string) {
  if (!drawingRef.value || !selectedDrawing.value) return
  if (selectedDrawingIndex.value === null) return
  const drawings = drawingRef.value.drawings
  const matchIndex = selectedDrawingIndex.value
  drawingRef.value.pushHistory?.()
  drawings[matchIndex].color = nextColor
  selectedDrawing.value = { ...drawings[matchIndex] }
  drawingRef.value.redraw?.()
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
const chartType = ref<'line' | 'area' | 'bar'>('line')
const periodType = ref<'calendar' | 'fiscal'>('calendar')
const year = ref(2025)
const normalize = ref(false)
const logScale = ref(false)
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
const legendColors = ref<Record<string, string>>({})
const legendNames = ref<Record<string, string>>({})
const activeLegendSettings = ref<string | null>(null)

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
const chartHeight = computed(() => Math.max(0, chartViewportHeight.value))
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0, left: 0, top: 0 })

// Search modal state
const searchModalOpen = ref(false)
const searchQuery = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const allSymbols = ref<SymbolItem[]>([])
const loadingSymbols = ref(false)
const selectedSymbolMeta = computed(() => {
  const meta: Record<string, { name: string; description: string; unit?: string }> = {}
  const bySymbol = new Map(allSymbols.value.map((s) => [s.symbol, s]))
  selectedSymbols.value.forEach((symbol) => {
    const item = bySymbol.get(symbol)
    if (item) {
      meta[symbol] = { name: item.name, description: item.description, unit: item.unit }
    }
  })
  return meta
})

// Go to page (for navigation menu)
function goToPage(page: string) {
  navMenuOpen.value = false
  // For now, just log - in future this could use router
  console.log('Navigate to:', page)
  alert(`Navigasi ke: ${page} (belum diimplementasikan)`)
}

// Summary data
const summaryData = ref<SummaryData | null>(null)

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
    const totalAll = nextSeries.reduce((sum, s) => sum + s.total, 0)
    summaryData.value = nextSeries.length ? { totalAll, series: nextSeries } : null
  }
}

function getLegendColor(symbol: string, idx: number): string {
  return legendColors.value[symbol] || colors[idx % colors.length]
}

function getLegendName(symbol: string): string {
  return legendNames.value[symbol] || symbol
}

function getLegendDescription(symbol: string): string {
  const meta = selectedSymbolMeta.value[symbol]
  return meta?.description || meta?.name || symbol
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

const categoryOptions: { value: CategoryValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'dokumen', label: 'Dokumen' },
  { value: 'nilai', label: 'Nilai' }
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
  if (prev) {
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
  }
  if (next) {
    selectedSymbols.value = [...(selectedSymbolsByTab.value[next] || [])]
    hiddenSeries.value = new Set(hiddenSeriesByTab.value[next] || [])
    legendColors.value = { ...(legendColorsByTab.value[next] || {}) }
    legendNames.value = { ...(legendNamesByTab.value[next] || {}) }
    activeLegendSettings.value = null
  } else {
    selectedSymbols.value = []
    hiddenSeries.value = new Set()
    legendColors.value = {}
    legendNames.value = {}
    activeLegendSettings.value = null
  }
  switchingTab.value = false
})

watch(selectedSymbols, (val) => {
  if (switchingTab.value) return
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
}, { deep: true })

watch(hiddenSeries, (val) => {
  if (switchingTab.value) return
  const activeId = activeCategoryTabId.value
  if (!activeId) return
  hiddenSeriesByTab.value = {
    ...hiddenSeriesByTab.value,
    [activeId]: Array.from(val)
  }
}, { deep: true })

watch(legendColors, (val) => {
  if (switchingTab.value) return
  const activeId = activeCategoryTabId.value
  if (!activeId) return
  legendColorsByTab.value = {
    ...legendColorsByTab.value,
    [activeId]: { ...val }
  }
}, { deep: true })

watch(legendNames, (val) => {
  if (switchingTab.value) return
  const activeId = activeCategoryTabId.value
  if (!activeId) return
  legendNamesByTab.value = {
    ...legendNamesByTab.value,
    [activeId]: { ...val }
  }
}, { deep: true })

watch([periodType, year, rawMode, cumulative, sumberDana, kategoriPlant, normalize, logScale], () => {
  clearYAxisOverrides()
})

function addCategoryTab(category: CategoryValue, openSearch = false) {
  const nextIndex = categoryTabs.value.length + 1
  const label = `Tab ${nextIndex}`
  const id = `tab-${category}-${Date.now()}`
  categoryTabs.value = [...categoryTabs.value, { id, label, category }]
  selectedSymbolsByTab.value = { ...selectedSymbolsByTab.value, [id]: [] }
  hiddenSeriesByTab.value = { ...hiddenSeriesByTab.value, [id]: [] }
  legendColorsByTab.value = { ...legendColorsByTab.value, [id]: {} }
  legendNamesByTab.value = { ...legendNamesByTab.value, [id]: {} }
  activeCategoryTabId.value = id
  if (openSearch) {
    openSearchModal()
  }
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
  selectedSymbolsByTab.value = restSel
  hiddenSeriesByTab.value = restHid
  legendColorsByTab.value = restLc
  legendNamesByTab.value = restLn
  yAxisOverrideByTab.value = restYo
  yAxisBySymbolOverrideByTab.value = restYs

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

// Select symbol with scale option
function selectSymbolWithScale(sym: SymbolItem, scaleMode: ScaleMode) {
  // Check max series limit
  if (selectedSymbols.value.length >= maxSeries.value) {
    alert(`Maximum ${maxSeries.value} series sudah terpilih. Hapus salah satu series atau ubah max series di dropdown.`)
    return
  }

  // If no tabs yet, create one based on symbol type
  if (!categoryTabs.value.length) {
    const category = (sym.symbolType as CategoryValue) || 'all'
    addCategoryTab(category, false)
  }
  
  // Add symbol if not already selected
  if (!selectedSymbols.value.includes(sym.symbol)) {
    selectedSymbols.value.push(sym.symbol)
    seriesScales.value[sym.symbol] = scaleMode
    
    // Apply scale mode effects
    if (scaleMode === 'percent') {
      // TODO: Enable normalize mode for this series
      console.log(`Added ${sym.symbol} with Same % scale (normalized)`)
    } else if (scaleMode === 'scale') {
      // TODO: Add separate Y-axis for this series
      console.log(`Added ${sym.symbol} with New price scale`)
    } else if (scaleMode === 'pane') {
      // TODO: Create new pane for this series
      console.log(`Added ${sym.symbol} with New pane`)
    }
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
    const res = await authFetch('/api/procurement/symbols')
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

// Toggle symbol selection
function toggleSymbol(symbol: string) {
  const idx = selectedSymbols.value.indexOf(symbol)
  if (idx >= 0) {
    selectedSymbols.value.splice(idx, 1)
  } else {
    // Check max series limit
    if (selectedSymbols.value.length >= maxSeries.value) {
      alert(`Maximum ${maxSeries.value} series sudah terpilih. Hapus salah satu series atau ubah max series di dropdown.`)
      return
    }
    selectedSymbols.value.push(symbol)
  }
}

// Remove symbol
function removeSymbol(symbol: string) {
  const idx = selectedSymbols.value.indexOf(symbol)
  if (idx >= 0) {
    selectedSymbols.value.splice(idx, 1)
  }
  if (hiddenSeries.value.has(symbol)) {
    const newSet = new Set(hiddenSeries.value)
    newSet.delete(symbol)
    hiddenSeries.value = newSet
  }
  if (summaryData.value) {
    const nextSeries = summaryData.value.series.filter((s) => s.symbol !== symbol)
    const totalAll = nextSeries.reduce((sum, s) => sum + s.total, 0)
    summaryData.value = nextSeries.length ? { totalAll, series: nextSeries } : null
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
  if (activeTabSettingsId.value) {
    const settingsEl = document.querySelector('.tv-tab-settings')
    const cogEl = document.querySelector('.tv-category-cog')
    if (settingsEl && settingsEl.contains(target)) return
    if (cogEl && cogEl.contains(target)) return
    closeTabSettings()
  }
}

// Filter symbols (no-op, computed handles it)
function filterSymbols() {}

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
      let seriesVals = values.map((d: any) => d.close).filter((v: any) => typeof v === 'number')
      if (normalize.value && seriesVals.length) {
        const firstVal = seriesVals[0]
        if (firstVal > 0) {
          seriesVals = seriesVals.map((v: number) => (v / firstVal) * 100)
        }
      }
      if (!seriesVals.length) {
        symbolBounds[symbol] = { min: undefined, max: undefined }
        return
      }
      let minVal = Math.min(...seriesVals)
      let maxVal = Math.max(...seriesVals)
      if (logScale.value) {
        minVal = Math.max(minVal, 1)
      }
      const range = Math.max(maxVal - minVal, 1)
      const pad = range * 0.05
      const paddedMin = minVal >= 0 ? Math.max(0, minVal - pad) : minVal - pad
      symbolBounds[symbol] = { min: paddedMin, max: maxVal + pad }
      allValues = allValues.concat(seriesVals)
    })

    if (allValues.length) {
      let minVal = Math.min(...allValues)
      let maxVal = Math.max(...allValues)
      if (logScale.value) {
        minVal = Math.max(minVal, 1)
      }
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
  let totalAll = 0

  selectedSymbols.value.forEach((symbol, index) => {
    if (hiddenSeries.value.has(symbol)) return
    const values = data[symbol] || []
    if (!values.length) return

    const closes = values.map((d: any) => d.close)
    const total = closes.reduce((a: number, b: number) => a + b, 0)
    totalAll += total

    let latestIdx = closes.length - 1
    while (latestIdx >= 0 && closes[latestIdx] === 0) {
      latestIdx -= 1
    }
    if (latestIdx < 0) latestIdx = closes.length - 1

    const latest = closes[latestIdx]
    const latestDate = new Date(values[latestIdx].time * 1000).toLocaleDateString('id-ID')

    seriesSummaries.push({
      symbol,
      total,
      latest,
      latestDate,
      color: getLegendColor(symbol, index)
    })
  })

  summaryData.value = seriesSummaries.length ? { totalAll, series: seriesSummaries } : null
}

// Handle chart error
function onChartError(msg: string) {
  console.error('Chart error:', msg)
}

// Format number
const currencyShortId = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 1
})

function formatNumber(val: number | undefined): string {
  if (val === undefined || val === null || Number.isNaN(val)) return '--'
  return currencyShortId.format(val)
}

// Handle resize
function updateChartViewport() {
  if (chartScrollRef.value) {
    chartViewportHeight.value = chartScrollRef.value.clientHeight
  }
}

function handleResize() {
  windowHeight.value = window.innerHeight
  updateChartViewport()
}

function onChartPointerDown(event: PointerEvent) {
  if (!chartScrollRef.value) return
  if (activeDrawingTool.value !== 'select') return
  if (event.button !== 0) return
  const target = event.target as HTMLElement | null
  if (target?.closest('.drawing-layer')) return
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
  chartRef.value?.panByPixels?.(dx)
}

function onChartPointerUp(event: PointerEvent) {
  if (!chartScrollRef.value) return
  if (!isPanning.value) return
  isPanning.value = false
  chartScrollRef.value.releasePointerCapture(event.pointerId)
}

function onChartWheel(event: WheelEvent) {
  if (event.shiftKey && event.deltaY !== 0) {
    chartRef.value?.panByPixels?.(event.deltaY)
    return
  }
  if (event.deltaX !== 0) {
    chartRef.value?.panByPixels?.(event.deltaX)
    return
  }
  if (event.deltaY !== 0) {
    chartRef.value?.panByPixels?.(event.deltaY)
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
    drawingRef.value?.redo?.()
    return
  }
  if (key === 'z') {
    event.preventDefault()
    drawingRef.value?.undo?.()
    return
  }
  if (key === 'y') {
    event.preventDefault()
    drawingRef.value?.redo?.()
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
      selectedSymbols: selectedSymbols.value,
      chartType: chartType.value,
      periodType: periodType.value,
      year: year.value,
      normalize: normalize.value,
      logScale: logScale.value,
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
      if (state.selectedSymbols) selectedSymbols.value = state.selectedSymbols
      if (state.chartType) chartType.value = state.chartType
      if (state.periodType) periodType.value = state.periodType
      if (state.year) year.value = state.year
      if (state.normalize !== undefined) normalize.value = state.normalize
      if (state.logScale !== undefined) logScale.value = state.logScale
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
watch([categoryTabs, activeCategoryTabId, selectedSymbolsByTab, hiddenSeriesByTab, legendColorsByTab, legendNamesByTab, yAxisOverrideByTab, yAxisBySymbolOverrideByTab, selectedSymbols, chartType, periodType, year, normalize, logScale, rawMode, cumulative, singleScale, scaleSide, sumberDana, kategoriPlant], saveState, { deep: true })

// Init
onMounted(() => {
  restoreState() // Restore saved state first
  loadSymbols()
  nextTick(updateChartViewport)
  window.addEventListener('resize', handleResize)
  window.addEventListener('keydown', handleGlobalShortcuts)
  document.addEventListener('click', handleDocumentClick)
  if (chartScrollRef.value) {
    chartResizeObserver = new ResizeObserver(updateChartViewport)
    chartResizeObserver.observe(chartScrollRef.value)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('keydown', handleGlobalShortcuts)
  document.removeEventListener('click', handleDocumentClick)
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
  padding: 0 12px;
  background: var(--surface);
  border-bottom: 1px solid var(--stroke);
  position: relative;
  z-index: 1000;  /* Very high z-index to ensure clickability above ALL chart elements */
}

.tv-header-left,
.tv-header-center,
.tv-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
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
  font-size: 0.9rem;
  cursor: pointer;
  flex: 0 0 auto;
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
  padding: 4px 10px;
  background: transparent;
  border: none;
  color: var(--muted);
  font-size: 0.8rem;
  cursor: pointer;
  border-radius: 4px;
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

.tv-select {
  padding: 4px 8px;
  background: var(--surface-alt);
  border: none;
  color: var(--ink);
  font-size: 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23787b86' stroke-width='2'%3e%3cpath d='M6 9l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 4px center;
  background-size: 14px;
  padding-right: 22px;
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
  font-size: 1.1rem;
  cursor: pointer;
}

.tv-drawing-close:hover {
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
  width: 100%;
  height: 100%;
  overflow: hidden;
  max-width: 100%;
  max-height: 100%;
  overscroll-behavior: contain;
  cursor: grab;
  scrollbar-width: none;
}

.tv-chart-scroll:active {
  cursor: grabbing;
}

.tv-chart-scroll::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.tv-chart-scroll-inner {
  position: relative;
  min-width: 100%;
  min-height: 100%;
  padding: 0;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
}

.tv-chart-frame {
  position: relative;
  width: 100%;
  height: 100%;
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
  flex: 0 0 auto;
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
  right: 60px;
  bottom: 40px;
  width: 200px;  /* Reduced from 220px */
  transform: translateY(calc(-100% - 8px));  /* Reduced from 12px */
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  border: 1px solid var(--stroke);
  border-radius: 8px;
  z-index: 25;
  box-shadow: var(--shadow);
}

.tv-layers-panel {
  right: 60px;
}

.tv-layers-panel.is-shifted {
  right: 280px;
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
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 4px;
}

.tv-panel-close:hover {
  color: var(--ink);
}

.tv-panel-body {
  padding: 8px;
  max-height: 250px;
  overflow-y: auto;
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
  font-size: 1rem;
  cursor: pointer;
  padding: 0 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.tv-object-item:hover .tv-object-delete {
  opacity: 1;
}

.tv-object-delete:hover {
  color: #ef5350;
}

/* Layer Items */
.tv-layer-section {
  margin-bottom: 8px;
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
  font-size: 0.9rem;
}

.tv-layer-name {
  flex: 1;
}

.tv-layer-delete {
  background: none;
  border: none;
  color: var(--muted);
  font-size: 1rem;
  cursor: pointer;
  padding: 0 4px;
  opacity: 0;
  transition: opacity 0.15s;
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
</style>
