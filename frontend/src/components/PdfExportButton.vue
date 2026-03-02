<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  title?: string
  year?: number
  periodType?: string
  sumberDana?: string
  kategoriPlant?: string
  reportType?: 'dashboard' | 'chart'
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Laporan Pengadaan SGN',
  year: 2025,
  periodType: 'calendar',
  sumberDana: '',
  kategoriPlant: '',
  reportType: 'dashboard'
})

const isGenerating = ref(false)

// Helper to parse error response
async function parseErrorResponse(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') || ''
  
  // If HTML response, return status text
  if (contentType.includes('text/html')) {
    return `Server error: ${response.status} ${response.statusText}`
  }
  
  // If JSON response, parse it
  if (contentType.includes('application/json')) {
    try {
      const error = await response.json()
      return error.message || error.detail || `Error: ${response.status}`
    } catch {
      return `Error: ${response.status} ${response.statusText}`
    }
  }
  
  // Default: try to get text
  try {
    const text = await response.text()
    return text || `Error: ${response.status} ${response.statusText}`
  } catch {
    return `Error: ${response.status} ${response.statusText}`
  }
}

async function generatePDF() {
  isGenerating.value = true
  
  try {
    const response = await fetch('/api/pdf/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: props.title,
        period: {
          year: props.year,
          type: props.periodType
        },
        filters: {
          sumberDana: props.sumberDana || undefined,
          kategoriPlant: props.kategoriPlant || undefined
        },
        reportType: props.reportType
      })
    })

    if (!response.ok) {
      const errorMsg = await parseErrorResponse(response)
      throw new Error(errorMsg)
    }

    // Download PDF
    const blob = await response.blob()
    
    // Check if it's actually a PDF
    if (blob.type.includes('html') || blob.size < 100) {
      throw new Error('Server returned invalid PDF. Please check server logs.')
    }
    
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Laporan_Pengadaan_${props.year}_${new Date().toISOString().split('T')[0]}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

  } catch (error) {
    console.error('PDF generation error:', error)
    alert('Gagal generate PDF: ' + (error as Error).message)
  } finally {
    isGenerating.value = false
  }
}

async function captureDashboard() {
  isGenerating.value = true
  
  try {
    const response = await fetch('/api/pdf/dashboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: window.location.origin,
        filters: {
          year: props.year,
          periodType: props.periodType,
          sumberDana: props.sumberDana,
          kategoriPlant: props.kategoriPlant
        },
        title: 'Dashboard Procurement Report'
      })
    })

    if (!response.ok) {
      const errorMsg = await parseErrorResponse(response)
      throw new Error(errorMsg)
    }

    // Download PDF
    const blob = await response.blob()
    
    // Check if it's actually a PDF
    if (blob.type.includes('html') || blob.size < 100) {
      throw new Error('Server returned invalid PDF. Puppeteer may not be installed.')
    }
    
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Dashboard_Procurement_${new Date().toISOString().split('T')[0]}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

  } catch (error) {
    console.error('Dashboard capture error:', error)
    alert('Gagal capture dashboard: ' + (error as Error).message)
  } finally {
    isGenerating.value = false
  }
}
</script>

<template>
  <div class="pdf-export-container">
    <button 
      class="pdf-btn report-btn"
      @click="generatePDF"
      :disabled="isGenerating"
    >
      <span v-if="isGenerating" class="spinner"></span>
      <svg v-else class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
      {{ isGenerating ? 'Generating...' : 'Export Report PDF' }}
    </button>

    <button 
      class="pdf-btn capture-btn"
      @click="captureDashboard"
      :disabled="isGenerating"
    >
      <span v-if="isGenerating" class="spinner"></span>
      <svg v-else class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
      {{ isGenerating ? 'Capturing...' : 'Capture Dashboard' }}
    </button>
  </div>
</template>

<style scoped>
.pdf-export-container {
  display: flex;
  gap: 12px;
  align-items: center;
}

.pdf-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.pdf-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.report-btn {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
}

.report-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

.capture-btn {
  background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%);
  color: white;
}

.capture-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #2c5282 0%, #1a365d 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(26, 54, 93, 0.3);
}

.icon {
  width: 16px;
  height: 16px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .pdf-export-container {
    flex-direction: column;
    width: 100%;
  }
  
  .pdf-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
