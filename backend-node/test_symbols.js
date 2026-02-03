// Test the getAllSymbols function directly
import { getAllSymbols, searchSymbols } from './src/services/procurementService.js'

console.log('Testing getAllSymbols()...\n')

try {
    const symbols = await getAllSymbols()
    console.log(`Total symbols returned: ${symbols.length}`)

    // Show first 10
    console.log('\nFirst 10 symbols:')
    symbols.slice(0, 10).forEach(s => {
        console.log(`  ${s.symbol}: ${s.name}`)
    })

    // Check for A-series
    console.log('\nA-series symbols:')
    const aSeries = symbols.filter(s => s.symbol.toUpperCase().startsWith('A'))
    console.log(`  Found ${aSeries.length} symbols`)
    aSeries.slice(0, 10).forEach(s => {
        console.log(`  ${s.symbol}: ${s.name}`)
    })

    // Check for E-series
    console.log('\nE-series symbols:')
    const eSeries = symbols.filter(s => s.symbol.toUpperCase().startsWith('E'))
    console.log(`  Found ${eSeries.length} symbols`)
    eSeries.slice(0, 10).forEach(s => {
        console.log(`  ${s.symbol}: ${s.name}`)
    })

    // Test search
    console.log('\n\nTesting searchSymbols("a001")...')
    const searchResult = await searchSymbols('a001')
    console.log(`Found ${searchResult.length} results:`)
    searchResult.forEach(s => {
        console.log(`  ${s.symbol}: ${s.name}`)
    })

    console.log('\n\nTesting searchSymbols("e")...')
    const searchE = await searchSymbols('e', 10)
    console.log(`Found ${searchE.length} results:`)
    searchE.forEach(s => {
        console.log(`  ${s.symbol}: ${s.name}`)
    })

    process.exit(0)
} catch (err) {
    console.error('Error:', err)
    process.exit(1)
}
