import { pool, query } from './src/db.js'

async function testConnection() {
  console.log('Testing database connection...')
  console.log('Config:', {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'olahproc',
    user: process.env.DB_USER || 'postgres'
  })
  
  try {
    // Test basic connection
    const result = await query('SELECT NOW() as now, current_database() as db')
    console.log('✅ Connection successful!')
    console.log('   Server time:', result.rows[0].now)
    console.log('   Database:', result.rows[0].db)
    
    // Test tables
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    console.log('\n📊 Public tables:', tablesResult.rows.length)
    tablesResult.rows.slice(0, 10).forEach(r => console.log('   -', r.table_name))
    
    // Test views
    const viewsResult = await query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    console.log('\n👁️  Public views:', viewsResult.rows.length)
    viewsResult.rows.slice(0, 10).forEach(r => console.log('   -', r.table_name))
    
    // Test analitic table
    const analiticResult = await query('SELECT COUNT(*) as count FROM analitic')
    console.log('\n📋 Analitic records:', analiticResult.rows[0].count)
    
    // Test dense view
    const denseResult = await query(`
      SELECT COUNT(*) as count 
      FROM v_fact_doc_weekly_dense 
      WHERE period_year = 2025 
      LIMIT 1
    `)
    console.log('📈 Dense view records (2025):', denseResult.rows[0].count)
    
    // Test sample data
    const sampleResult = await query(`
      SELECT kode_data, week_start, count_doc 
      FROM v_fact_doc_weekly_dense 
      WHERE period_year = 2025 AND kode_data = 'B100'
      ORDER BY week_start 
      LIMIT 3
    `)
    console.log('\n📝 Sample data (B100, 2025):')
    sampleResult.rows.forEach(r => {
      console.log(`   ${r.week_start.toISOString().split('T')[0]}: ${r.count_doc} docs`)
    })
    
    console.log('\n✅ All tests passed!')
    process.exit(0)
  } catch (err) {
    console.error('❌ Database connection failed:', err.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

testConnection()
