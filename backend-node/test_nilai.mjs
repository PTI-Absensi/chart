// Test script to check fact_value_weekly table structure
import { query } from './src/db/pgClient.js'

async function checkTable() {
    try {
        // Check columns in fact_value_weekly
        const cols = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'fact_value_weekly' 
      ORDER BY ordinal_position
    `)
        console.log('=== fact_value_weekly columns ===')
        console.log(cols.rows)

        // Sample data
        const sample = await query(`
      SELECT * FROM fact_value_weekly LIMIT 3
    `)
        console.log('\n=== Sample data ===')
        console.log(sample.rows)

        // Check if kode_data = 'A2' exists
        const a2Data = await query(`
      SELECT * FROM fact_value_weekly WHERE LOWER(kode_data) = 'a2' LIMIT 3
    `)
        console.log('\n=== A2 data in fact_value_weekly ===')
        console.log(a2Data.rows)

        process.exit(0)
    } catch (err) {
        console.error('Error:', err)
        process.exit(1)
    }
}

checkTable()
