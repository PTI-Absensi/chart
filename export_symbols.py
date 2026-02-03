import psycopg2
import json

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    database='olahproc',
    user='postgres',
    password='postgres'
)
cur = conn.cursor()

# Get all symbols
cur.execute("""
    SELECT 
      kode_data,
      nama_dokumen,
      COALESCE(status, 'metric') as status,
      COALESCE("desc", nama_dokumen) as description
    FROM analitic
    ORDER BY kode_data
""")

rows = cur.fetchall()
print(f"Total symbols in DB: {len(rows)}")

# Export to JSON for review
symbols = []
for row in rows:
    symbols.append({
        'symbol': row[0],
        'name': row[1],
        'category': row[2],
        'description': row[3]
    })

# Save to file
with open('e:/remote_folder/git/git/project_paktinus/chart/db_symbols.json', 'w', encoding='utf-8') as f:
    json.dump(symbols, f, indent=2, ensure_ascii=False)

print(f"Exported {len(symbols)} symbols to db_symbols.json")

# Show samples
print("\nFirst 10 symbols:")
for s in symbols[:10]:
    print(f"  {s['symbol']}: {s['name']}")

print("\nSymbols starting with 'a':")
a_symbols = [s for s in symbols if s['symbol'].lower().startswith('a')]
print(f"  Found {len(a_symbols)} symbols")
for s in a_symbols[:5]:
    print(f"  {s['symbol']}: {s['name']}")

print("\nSymbols starting with 'e':")
e_symbols = [s for s in symbols if s['symbol'].lower().startswith('e')]
print(f"  Found {len(e_symbols)} symbols")
for s in e_symbols[:5]:
    print(f"  {s['symbol']}: {s['name']}")

conn.close()
