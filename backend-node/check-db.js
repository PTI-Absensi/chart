// Quick script to check database data
import pg from 'pg-promise'
const pgp = pg()

const db = pgp({
    host: 'localhost',
    port: 5432,
    database: 'olahproc',
    user: 'postgres',
    password: 'postgres'
})

async function check() {
    console.log('=== Checking kode_data values in fact_doc_weekly ===')

    // Check unique kode_data values
    const kodeData = await db.any('SELECT DISTINCT kode_data FROM fact_doc_weekly ORDER BY kode_data LIMIT 30')
    console.log('Unique kode_data values:')
    console.log(kodeData.map(r => r.kode_data).join(', '))

    // Check C3 data specifically
    console.log('\n=== Checking C3 data ===')
    const c3Data = await db.any(`
    SELECT COUNT(*) as total, 
           MIN(week_start) as min_date, 
           MAX(week_start) as max_date,
           SUM(count_doc) as total_doc
    FROM fact_doc_weekly 
    WHERE LOWER(kode_data) = 'c3'
  `)
    console.log('C3 stats:', c3Data[0])

    // Check with year filter
    console.log('\n=== C3 with year=2024 ===')
    const c3_2024 = await db.any(`
    SELECT COUNT(*) as total,
           MIN(week_start) as min_date, 
           MAX(week_start) as max_date
    FROM fact_doc_weekly 
    WHERE LOWER(kode_data) = 'c3' AND period_year = 2024
  `)
    console.log('C3 2024 stats:', c3_2024[0])

    // Check period_types
    console.log('\n=== C3 by period_type ===')
    const c3ByType = await db.any(`
    SELECT period_type, COUNT(*) as count
    FROM fact_doc_weekly 
    WHERE LOWER(kode_data) = 'c3'
    GROUP BY period_type
  `)
    console.log(c3ByType)

    // Sample rows
    console.log('\n=== Sample C3 rows ===')
    const sampleRows = await db.any(`
    SELECT kode_data, week_start, count_doc, period_type, period_year
    FROM fact_doc_weekly 
    WHERE LOWER(kode_data) = 'c3'
    ORDER BY week_start DESC
    LIMIT 10
  `)
    console.table(sampleRows)

    pgp.end()
}

check().catch(err => {
    console.error('Error:', err)
    pgp.end()
})
