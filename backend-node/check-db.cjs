// Simulate exact aggregation query from backend
const { Client } = require('pg')

const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'olahproc',
    user: 'postgres',
    password: 'postgres'
})

async function check() {
    await client.connect()

    // Exact query from fetchByKodeData
    const kodeData = 'C3'
    const year = 2024
    const periodType = 'calendar'
    const timeTrunc = 'week'
    const limit = 1000

    console.log('=== Aggregated query result (same as backend) ===')

    const result = await client.query(`
    SELECT
      DATE_TRUNC('${timeTrunc}', week_start) as period,
      SUM(count_doc) as total_value,
      MIN(count_doc) as min_value,
      MAX(count_doc) as max_value,
      AVG(count_doc) as avg_value
    FROM fact_doc_weekly
    WHERE LOWER(kode_data) = LOWER($1)
    AND period_year = $2
    AND period_type = $3
    GROUP BY DATE_TRUNC('${timeTrunc}', week_start)
    ORDER BY period DESC
    LIMIT $4
  `, [kodeData, year, periodType, limit])

    console.log(`Total aggregated weeks: ${result.rows.length}`)
    console.log('\nFirst 10 rows:')
    result.rows.slice(0, 10).forEach(r => {
        console.log(`  ${r.period.toISOString().slice(0, 10)} - value: ${r.total_value}`)
    })

    await client.end()
}

check().catch(err => {
    console.error('Error:', err)
    client.end()
})
