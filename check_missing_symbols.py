import psycopg2
import sys

try:
    conn = psycopg2.connect(
        host='localhost',
        port=5432,
        database='olahproc',
        user='postgres',
        password='postgres'
    )
    cur = conn.cursor()
    
    # Check total symbols
    print("=" * 60)
    print("TOTAL SYMBOLS IN ANALITIC TABLE")
    print("=" * 60)
    cur.execute("SELECT COUNT(*) FROM analitic")
    print(f"Total: {cur.fetchone()[0]}\n")
    
    # Check symbols starting with 'a' or 'e'
    print("=" * 60)
    print("SYMBOLS STARTING WITH 'a' OR 'e'")
    print("=" * 60)
    cur.execute("""
        SELECT kode_data, nama_dokumen, status, sumber_dana, kategori_plant
        FROM analitic 
        WHERE LOWER(kode_data) LIKE 'a%' OR LOWER(kode_data) LIKE 'e%'
        ORDER BY kode_data
    """)
    rows = cur.fetchall()
    if rows:
        for row in rows:
            print(f"{row[0]:10} | {row[1]:20} | {row[2] or 'N/A':15} | {row[3] or 'N/A':15} | {row[4] or 'N/A'}")
    else:
        print("No symbols found starting with 'a' or 'e'")
    
    print(f"\nTotal matching: {len(rows)}\n")
    
    # Check all distinct prefixes
    print("=" * 60)
    print("ALL DISTINCT SYMBOL PREFIXES")
    print("=" * 60)
    cur.execute("""
        SELECT DISTINCT LEFT(kode_data, 1) as prefix, COUNT(*) as count
        FROM analitic
        GROUP BY LEFT(kode_data, 1)
        ORDER BY prefix
    """)
    for row in cur.fetchall():
        print(f"Prefix '{row[0]}': {row[1]} symbols")
    
    print("\n" + "=" * 60)
    print("SAMPLE OF ALL SYMBOLS")
    print("=" * 60)
    cur.execute("""
        SELECT kode_data, nama_dokumen, status
        FROM analitic 
        ORDER BY kode_data
        LIMIT 30
    """)
    for row in cur.fetchall():
        print(f"{row[0]:10} | {row[1]:30} | {row[2] or 'N/A'}")
    
    conn.close()
    print("\n✓ Database query completed successfully")
    
except Exception as e:
    print(f"✗ Error: {e}", file=sys.stderr)
    sys.exit(1)
