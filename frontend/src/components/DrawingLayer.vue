<template>
  <div class="drawing-layer" ref="containerRef" :class="{ 'is-drawing': activeTool !== 'select' }">
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
}>(), {
  width: 800,
  height: 450,
  showToolbar: true
})

// Generate unique canvas ID
const canvasId = `drawing-canvas-${Date.now()}`

// Refs
const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null

// State
const activeTool = ref<string>('select')
const isDrawing = ref(false)
const startPoint = ref<{ x: number; y: number } | null>(null)
const drawings = ref<Array<{type: string, points: number[], color: string}>>([])
const toolbarCollapsed = ref(true) // Start collapsed to not block Y-axis

// Colors for each tool
const toolColors: Record<string, string> = {
  hline: '#2962ff',
  vline: '#26a69a', 
  trendline: '#ef5350',
  freedraw: '#ff9800'
}

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
  if (activeTool.value === 'select') return
  
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
  ctx.strokeStyle = toolColors[activeTool.value] || '#ffffff'
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
  const color = toolColors[activeTool.value] || '#ffffff'

  if (activeTool.value === 'hline') {
    drawings.value.push({
      type: 'hline',
      points: [0, startPoint.value.y, canvasRef.value.width, startPoint.value.y],
      color
    })
  } else if (activeTool.value === 'vline') {
    drawings.value.push({
      type: 'vline',
      points: [startPoint.value.x, 0, startPoint.value.x, canvasRef.value.height],
      color
    })
  } else if (activeTool.value === 'trendline') {
    drawings.value.push({
      type: 'trendline',
      points: [startPoint.value.x, startPoint.value.y, pos.x, pos.y],
      color
    })
  } else if (activeTool.value === 'freedraw' && currentPath.length > 2) {
    drawings.value.push({
      type: 'freedraw',
      points: [...currentPath],
      color
    })
  }

  isDrawing.value = false
  startPoint.value = null
  currentPath = []
  redraw()

  console.log('Drawing added, total:', drawings.value.length)
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

// Set active tool
function setTool(toolId: string) {
  activeTool.value = toolId
  console.log('Tool set to:', toolId)
}

// Clear all drawings
function clearAll() {
  drawings.value = []
  redraw()
  console.log('Canvas cleared')
}

// Resize handler
function handleResize() {
  if (!canvasRef.value || !containerRef.value) return
  
  const parent = containerRef.value.parentElement
  if (!parent) return

  canvasRef.value.width = parent.clientWidth
  canvasRef.value.height = parent.clientHeight
  ctx = canvasRef.value.getContext('2d')
  redraw()
}

// Lifecycle
onMounted(() => {
  setTimeout(() => {
    initCanvas()
    window.addEventListener('resize', handleResize)
  }, 100)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (canvasRef.value) {
    canvasRef.value.removeEventListener('mousedown', handleMouseDown)
    canvasRef.value.removeEventListener('mousemove', handleMouseMove)
    canvasRef.value.removeEventListener('mouseup', handleMouseUp)
    canvasRef.value.removeEventListener('mouseleave', handleMouseUp)
  }
})

// Expose methods
defineExpose({
  clearAll,
  setTool
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

.drawing-layer.is-drawing {
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
</style>
