<template>
  <div class="drawing-layer" ref="containerRef" :class="{ 'is-interactive': isInteractive, 'is-drawing': activeTool !== 'select' }">
    <canvas ref="canvasRef" :id="canvasId"></canvas>
    
    <!-- Drawing Toolbar - Collapsible -->
    <div class="drawing-toolbar" v-if="showToolbar" :class="{ 'is-collapsed': toolbarCollapsed }">
      <!-- Toggle button always visible -->
      <button 
        type="button" 
        class="tool-btn toggle-btn" 
        :title="toolbarCollapsed ? 'Expand tools' : 'Collapse tools'"
        @click="toolbarCollapsed = !toolbarCollapsed"
      >
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path 
            v-if="toolbarCollapsed" 
            d="M9 18l6-6-6-6" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2"
          />
          <path 
            v-else 
            d="M15 18l-6-6 6-6" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2"
          />
        </svg>
      </button>
      
      <!-- Tools (hidden when collapsed) -->
      <template v-if="!toolbarCollapsed">
        <button 
          v-for="tool in tools" 
          :key="tool.id"
          type="button"
          class="tool-btn"
          :class="{ 'is-active': activeTool === tool.id }"
          :title="tool.label"
          @click="setTool(tool.id)"
        >
          <span v-html="tool.icon"></span>
        </button>
        <div class="toolbar-divider"></div>
        <button type="button" class="tool-btn danger" title="Clear all" @click="clearAll">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path d="M4 7h16M8 7V5h8v2M7 7l1 12h8l1-12" fill="none" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
        <div class="toolbar-divider"></div>
        <!-- Color Picker -->
        <label class="color-picker-wrapper" title="Drawing color">
          <input 
            type="color" 
            v-model="currentColor" 
            class="color-picker-input"
          />
          <span class="color-preview" :style="{ backgroundColor: currentColor }"></span>
        </label>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'

// Props
const props = withDefaults(defineProps<{
  width?: number
  height?: number
  showToolbar?: boolean
  activeTool?: string
}>(), {
  width: 800,
  height: 450,
  showToolbar: true,
  activeTool: 'select'
})

// Generate unique canvas ID
const canvasId = `drawing-canvas-${Date.now()}`

// Refs
const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null

// Emits
const emit = defineEmits<{
  (e: 'selection', payload: { drawing: { type: string; points: number[]; color: string; name?: string }; index: number } | null): void
}>()

// State - use prop if provided, otherwise local state
const internalActiveTool = ref<string>(props.activeTool)
const activeTool = computed(() => props.showToolbar ? internalActiveTool.value : props.activeTool)
const isDrawing = ref(false)
const startPoint = ref<{ x: number; y: number } | null>(null)
const drawings = ref<Array<{type: string, points: number[], color: string, name?: string}>>([])
const selectedIndex = ref<number | null>(null)
const history = ref<Array<Array<{type: string, points: number[], color: string, name?: string}>>>([])
const redoStack = ref<Array<Array<{type: string, points: number[], color: string, name?: string}>>>([])
const toolbarCollapsed = ref(true) // Start collapsed to not block Y-axis
const currentColor = ref('#2962ff') // Default drawing color - user can pick
const isInteractive = computed(() => activeTool.value !== 'select' || drawings.value.length > 0)

// Current free draw path
let currentPath: number[] = []

// Tool definitions
const tools = [
  { 
    id: 'select', 
    label: 'Select', 
    icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 4l7 17 2-7 7-2z" fill="none" stroke="currentColor" stroke-width="2"/></svg>' 
  },
  { 
    id: 'hline', 
    label: 'Horizontal Line', 
    icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 12h16" fill="none" stroke="currentColor" stroke-width="2"/></svg>' 
  },
  { 
    id: 'vline', 
    label: 'Vertical Line', 
    icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 4v16" fill="none" stroke="currentColor" stroke-width="2"/></svg>' 
  },
  { 
    id: 'trendline', 
    label: 'Trendline', 
    icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 20L20 4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="4" cy="20" r="2" fill="currentColor"/><circle cx="20" cy="4" r="2" fill="currentColor"/></svg>' 
  },
  { 
    id: 'freedraw', 
    label: 'Free Draw', 
    icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M3 17c3-3 6-2 9-5s3-6 6-6" fill="none" stroke="currentColor" stroke-width="2"/></svg>' 
  }
]

// Initialize Canvas
function initCanvas() {
  if (!canvasRef.value || !containerRef.value) return

  const parent = containerRef.value.parentElement
  const width = parent?.clientWidth || props.width
  const height = parent?.clientHeight || props.height

  canvasRef.value.width = width
  canvasRef.value.height = height
  ctx = canvasRef.value.getContext('2d')

  // Add event listeners
  canvasRef.value.addEventListener('mousedown', handleMouseDown)
  canvasRef.value.addEventListener('mousemove', handleMouseMove)
  canvasRef.value.addEventListener('mouseup', handleMouseUp)
  canvasRef.value.addEventListener('mouseleave', handleMouseUp)

  console.log('Canvas initialized:', width, 'x', height)
}

function getMousePos(e: MouseEvent) {
  if (!canvasRef.value) return { x: 0, y: 0 }
  const rect = canvasRef.value.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
}

function handleMouseDown(e: MouseEvent) {
  if (activeTool.value === 'select') {
    const pos = getMousePos(e)
    selectAt(pos.x, pos.y)
    return
  }
  
  const pos = getMousePos(e)
  startPoint.value = pos
  isDrawing.value = true

  if (activeTool.value === 'freedraw') {
    currentPath = [pos.x, pos.y]
  }

  console.log('Mouse down at:', pos, 'Tool:', activeTool.value)
}

function handleMouseMove(e: MouseEvent) {
  if (!isDrawing.value || !startPoint.value || !ctx || !canvasRef.value) return

  const pos = getMousePos(e)

  // Redraw everything
  redraw()

  // Draw preview
  ctx.beginPath()
  ctx.strokeStyle = currentColor.value
  ctx.lineWidth = 2
  ctx.setLineDash([5, 5])

  if (activeTool.value === 'hline') {
    ctx.moveTo(0, startPoint.value.y)
    ctx.lineTo(canvasRef.value.width, startPoint.value.y)
  } else if (activeTool.value === 'vline') {
    ctx.moveTo(startPoint.value.x, 0)
    ctx.lineTo(startPoint.value.x, canvasRef.value.height)
  } else if (activeTool.value === 'trendline') {
    ctx.moveTo(startPoint.value.x, startPoint.value.y)
    ctx.lineTo(pos.x, pos.y)
  } else if (activeTool.value === 'freedraw') {
    currentPath.push(pos.x, pos.y)
    ctx.moveTo(currentPath[0], currentPath[1])
    for (let i = 2; i < currentPath.length; i += 2) {
      ctx.lineTo(currentPath[i], currentPath[i + 1])
    }
  }

  ctx.stroke()
  ctx.setLineDash([])
}

function handleMouseUp(e: MouseEvent) {
  if (!isDrawing.value || !startPoint.value || !canvasRef.value) return

  const pos = getMousePos(e)
  const color = currentColor.value

  pushHistory()
  const name = getNextLineName()

  if (activeTool.value === 'hline') {
    drawings.value.push({
      type: 'hline',
      points: [0, startPoint.value.y, canvasRef.value.width, startPoint.value.y],
      color,
      name
    })
  } else if (activeTool.value === 'vline') {
    drawings.value.push({
      type: 'vline',
      points: [startPoint.value.x, 0, startPoint.value.x, canvasRef.value.height],
      color,
      name
    })
  } else if (activeTool.value === 'trendline') {
    drawings.value.push({
      type: 'trendline',
      points: [startPoint.value.x, startPoint.value.y, pos.x, pos.y],
      color,
      name
    })
  } else if (activeTool.value === 'freedraw' && currentPath.length > 2) {
    drawings.value.push({
      type: 'freedraw',
      points: [...currentPath],
      color,
      name
    })
  }

  isDrawing.value = false
  startPoint.value = null
  currentPath = []
  redraw()

  console.log('Drawing added, total:', drawings.value.length)
}

function getNextLineName() {
  let max = 0
  for (const d of drawings.value) {
    if (!d.name) continue
    const match = /^Line\s+(\d+)$/i.exec(d.name)
    if (!match) continue
    const num = Number.parseInt(match[1], 10)
    if (Number.isFinite(num)) max = Math.max(max, num)
  }
  return `Line ${max + 1}`
}

function redraw() {
  if (!ctx || !canvasRef.value) return

  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)

  for (const d of drawings.value) {
    ctx.beginPath()
    ctx.strokeStyle = d.color
    ctx.lineWidth = 2
    ctx.setLineDash([])

    if (d.type === 'freedraw') {
      ctx.moveTo(d.points[0], d.points[1])
      for (let i = 2; i < d.points.length; i += 2) {
        ctx.lineTo(d.points[i], d.points[i + 1])
      }
    } else {
      ctx.moveTo(d.points[0], d.points[1])
      ctx.lineTo(d.points[2], d.points[3])
    }

    ctx.stroke()
  }
}

function distancePointToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1
  const dy = y2 - y1
  if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1)
  const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)
  const clamped = Math.max(0, Math.min(1, t))
  const cx = x1 + clamped * dx
  const cy = y1 + clamped * dy
  return Math.hypot(px - cx, py - cy)
}

function hitTestDrawing(d: {type: string, points: number[]}, x: number, y: number) {
  const threshold = 6
  if (d.type === 'freedraw') {
    for (let i = 0; i < d.points.length - 2; i += 2) {
      const dist = distancePointToSegment(x, y, d.points[i], d.points[i + 1], d.points[i + 2], d.points[i + 3])
      if (dist <= threshold) return true
    }
    return false
  }
  const [x1, y1, x2, y2] = d.points
  return distancePointToSegment(x, y, x1, y1, x2, y2) <= threshold
}

function emitSelection() {
  if (selectedIndex.value === null) {
    emit('selection', null)
    return
  }
  const drawing = drawings.value[selectedIndex.value]
  emit('selection', { drawing: { ...drawing, points: [...drawing.points] }, index: selectedIndex.value })
}

function selectAt(x: number, y: number) {
  for (let i = drawings.value.length - 1; i >= 0; i -= 1) {
    if (hitTestDrawing(drawings.value[i], x, y)) {
      selectedIndex.value = i
      emitSelection()
      return
    }
  }
  selectedIndex.value = null
  emitSelection()
}

// Set active tool
function setTool(toolId: string) {
  internalActiveTool.value = toolId
  console.log('Tool set to:', toolId)
}

// Clear all drawings
function clearAll() {
  if (drawings.value.length) {
    pushHistory()
  }
  drawings.value = []
  selectedIndex.value = null
  emitSelection()
  redraw()
  console.log('Canvas cleared')
}

function pushHistory() {
  history.value.push(drawings.value.map((d) => ({ ...d, points: [...d.points] })))
  if (history.value.length > 50) {
    history.value.shift()
  }
  redoStack.value = []
}

function undo() {
  if (!history.value.length) return
  redoStack.value.push(drawings.value.map((d) => ({ ...d, points: [...d.points] })))
  const prev = history.value.pop()
  drawings.value = prev ? prev.map((d) => ({ ...d, points: [...d.points] })) : []
  if (selectedIndex.value !== null && selectedIndex.value >= drawings.value.length) {
    selectedIndex.value = null
    emitSelection()
  }
  redraw()
}

function redo() {
  if (!redoStack.value.length) return
  history.value.push(drawings.value.map((d) => ({ ...d, points: [...d.points] })))
  const next = redoStack.value.pop()
  drawings.value = next ? next.map((d) => ({ ...d, points: [...d.points] })) : []
  if (selectedIndex.value !== null && selectedIndex.value >= drawings.value.length) {
    selectedIndex.value = null
    emitSelection()
  }
  redraw()
}

// Resize handler
let resizeObserver: ResizeObserver | null = null

function handleResize() {
  if (!canvasRef.value || !containerRef.value) return
  
  const parent = containerRef.value.parentElement
  if (!parent) return

  const newWidth = parent.clientWidth
  const newHeight = parent.clientHeight
  
  // Only update if size actually changed
  if (canvasRef.value.width !== newWidth || canvasRef.value.height !== newHeight) {
    canvasRef.value.width = newWidth
    canvasRef.value.height = newHeight
    ctx = canvasRef.value.getContext('2d')
    redraw()
    console.log('Canvas resized to:', newWidth, 'x', newHeight)
  }
}

// Lifecycle
onMounted(() => {
  setTimeout(() => {
    initCanvas()
    
    // Use ResizeObserver if available (more reliable than window resize)
    if (ResizeObserver && containerRef.value?.parentElement) {
      resizeObserver = new ResizeObserver(() => {
        handleResize()
      })
      resizeObserver.observe(containerRef.value.parentElement)
    } else {
      // Fallback to window resize
      window.addEventListener('resize', handleResize)
    }
  }, 200)
})

onUnmounted(() => {
  // Cleanup ResizeObserver
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  window.removeEventListener('resize', handleResize)
  
  // Cleanup canvas listeners
  if (canvasRef.value) {
    canvasRef.value.removeEventListener('mousedown', handleMouseDown)
    canvasRef.value.removeEventListener('mousemove', handleMouseMove)
    canvasRef.value.removeEventListener('mouseup', handleMouseUp)
    canvasRef.value.removeEventListener('mouseleave', handleMouseUp)
  }
})

// Expose methods and state
defineExpose({
  clearAll,
  setTool,
  drawings,
  redraw,
  pushHistory,
  undo,
  redo
})
</script>

<style scoped>
.drawing-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  pointer-events: none;
}

.drawing-layer.is-interactive {
  pointer-events: auto;
}

.drawing-layer canvas {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: inherit;
}

.drawing-toolbar {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 6px;
  background: var(--surface, #1e222d);
  border: 1px solid var(--stroke, #2a2e39);
  border-radius: 8px;
  pointer-events: auto;
  z-index: 100;
}

.tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--muted, #787b86);
  cursor: pointer;
  transition: all 0.15s ease;
}

.tool-btn:hover {
  background: var(--surface-alt, #2a2e39);
  color: var(--ink, #d1d4dc);
}

.tool-btn.is-active {
  background: rgba(41, 98, 255, 0.2);
  border-color: #2962ff;
  color: #2962ff;
}

.tool-btn.danger:hover {
  background: rgba(239, 83, 80, 0.2);
  color: #ef5350;
}

.toolbar-divider {
  width: 100%;
  height: 1px;
  background: var(--stroke, #2a2e39);
  margin: 4px 0;
}

/* Collapsed state */
.drawing-toolbar.is-collapsed {
  padding: 4px;
}

.toggle-btn {
  opacity: 0.7;
}

.toggle-btn:hover {
  opacity: 1;
}

/* Color Picker */
.color-picker-wrapper {
  position: relative;
  width: 28px;
  height: 28px;
  cursor: pointer;
}

.color-picker-input {
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.color-preview {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 6px;
  border: 2px solid var(--stroke, #2a2e39);
  transition: border-color 0.15s;
}

.color-picker-wrapper:hover .color-preview {
  border-color: var(--muted, #787b86);
}
</style>
