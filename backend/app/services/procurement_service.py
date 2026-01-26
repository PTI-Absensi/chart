"""
Trading Chart Application - Procurement Data Service
Fetches procurement data from PostgreSQL database (olahproc)
Provides TradingView-style symbols and time series data
"""
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from ..config import settings
from ..models.chart import OHLCData
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ProcurementSymbol:
    """Represents a procurement symbol (like a trading symbol)"""
    def __init__(
        self, 
        symbol: str, 
        name: str, 
        category: str, 
        description: str = "",
        unit: str = ""
    ):
        self.symbol = symbol
        self.name = name
        self.category = category  # plant, metric, sumber_dana
        self.description = description
        self.unit = unit
    
    def to_dict(self) -> Dict:
        return {
            "symbol": self.symbol,
            "name": self.name,
            "category": self.category,
            "description": self.description,
            "unit": self.unit
        }


class ProcurementService:
    """Service for managing procurement data from PostgreSQL"""
    
    # Static metric definitions - using count_doc with doc_type filter
    METRICS = {
        # Document counts by doc_type from fact_doc_weekly
        "DOC_PR": {
            "name": "Jumlah PR",
            "category": "metric",
            "description": "Purchase Requisition count",
            "unit": "Dokumen",
            "table": "fact_doc_weekly",
            "column": "count_doc",
            "filter": "doc_type = 'PR'"
        },
        "DOC_PK": {
            "name": "Jumlah PK",
            "category": "metric",
            "description": "Purchase Order count",
            "unit": "Dokumen",
            "table": "fact_doc_weekly",
            "column": "count_doc",
            "filter": "doc_type = 'PK'"
        },
        "DOC_PP": {
            "name": "Jumlah PP",
            "category": "metric",
            "description": "Procurement Proposal count",
            "unit": "Dokumen",
            "table": "fact_doc_weekly",
            "column": "count_doc",
            "filter": "doc_type = 'PP'"
        },
        "DOC_SPPBJ": {
            "name": "Jumlah SPPBJ",
            "category": "metric",
            "description": "SPPBJ count",
            "unit": "Dokumen",
            "table": "fact_doc_weekly",
            "column": "count_doc",
            "filter": "doc_type = 'SPPBJ'"
        },
        "DOC_ALL": {
            "name": "Semua Dokumen",
            "category": "metric",
            "description": "Total document count",
            "unit": "Dokumen",
            "table": "fact_doc_weekly",
            "column": "count_doc",
            "filter": None
        },
        "VAL_TOTAL": {
            "name": "Total Nilai",
            "category": "metric",
            "description": "Total nilai (Rp)",
            "unit": "Rp",
            "table": "fact_value_weekly",
            "column": "total_nilai",
            "filter": None
        },
        "VAL_ANGGARAN": {
            "name": "Anggaran",
            "category": "metric",
            "description": "Total anggaran (Rp)",
            "unit": "Rp",
            "table": "fact_value_weekly",
            "column": "anggaran",
            "filter": None
        },
        "VAL_HPS": {
            "name": "HPS",
            "category": "metric",
            "description": "Total HPS (Rp)",
            "unit": "Rp",
            "table": "fact_value_weekly",
            "column": "hps",
            "filter": None
        },
        "VAL_REALISASI": {
            "name": "Realisasi",
            "category": "metric",
            "description": "Total realisasi (Rp)",
            "unit": "Rp",
            "table": "fact_value_weekly",
            "column": "realisasi",
            "filter": None
        },
        "VAL_SAVING": {
            "name": "Saving",
            "category": "metric",
            "description": "Total saving (Rp)",
            "unit": "Rp",
            "table": "fact_value_weekly",
            "column": "saving_nilai",
            "filter": None
        }
    }

    
    # Timeframe definitions
    TIMEFRAMES = {
        "1D": {"label": "Daily", "interval": "day"},
        "1W": {"label": "Weekly", "interval": "week"},
        "1M": {"label": "Monthly", "interval": "month"},
        "1Y": {"label": "Yearly", "interval": "year"}
    }
    
    # Sumber Dana options
    SUMBER_DANA = ["eksploitasi", "investasi"]
    
    def __init__(self):
        self._connection = None
        self._plants_cache = None
        self._cache_timestamp = None
        self._cache_duration = timedelta(minutes=10)
        self._kategori_cache = None
        self._kategori_cache_timestamp = None
    
    def _get_connection(self):
        """Get or create database connection"""
        try:
            if self._connection is None or self._connection.closed:
                self._connection = psycopg2.connect(
                    host=settings.DB_HOST,
                    port=settings.DB_PORT,
                    database=settings.DB_NAME,
                    user=settings.DB_USER,
                    password=settings.DB_PASSWORD
                )
            return self._connection
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            raise
    
    def _execute_query(self, query: str, params: tuple = None) -> List[Dict]:
        """Execute query and return results as list of dicts"""
        try:
            conn = self._get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, params)
                return [dict(row) for row in cur.fetchall()]
        except Exception as e:
            logger.error(f"Query failed: {e}")
            logger.error(f"Query: {query}")
            return []
    
    def get_plants(self) -> List[ProcurementSymbol]:
        """Get all plants as symbols from database"""
        # Check cache
        if self._plants_cache and self._cache_timestamp:
            if datetime.now() - self._cache_timestamp < self._cache_duration:
                return self._plants_cache
        
        # Use actual column names from dim_plant table
        query = """
            SELECT 
                kode,
                nama,
                kategori,
                regional
            FROM dim_plant
            ORDER BY nama
        """
        
        rows = self._execute_query(query)
        symbols = []
        
        for row in rows:
            symbol = ProcurementSymbol(
                symbol=f"PLANT_{row['kode']}",
                name=row['nama'],
                category="plant",
                description=f"{row.get('kategori', '')} - {row.get('regional', '')}",
                unit="Unit"
            )
            symbols.append(symbol)
        
        self._plants_cache = symbols
        self._cache_timestamp = datetime.now()
        
        return symbols
    
    def get_sumber_dana_symbols(self) -> List[ProcurementSymbol]:
        """Get sumber dana as symbols"""
        return [
            ProcurementSymbol(
                symbol="DANA_EKSPLOITASI",
                name="Eksploitasi",
                category="sumber_dana",
                description="Dana Operasional (Ops)",
                unit=""
            ),
            ProcurementSymbol(
                symbol="DANA_INVESTASI",
                name="Investasi",
                category="sumber_dana",
                description="Dana Capital Expenditure (Capex)",
                unit=""
            )
        ]
    
    def get_metric_symbols(self) -> List[ProcurementSymbol]:
        """Get metrics as symbols"""
        symbols = []
        for key, metric in self.METRICS.items():
            symbols.append(ProcurementSymbol(
                symbol=key,
                name=metric["name"],
                category=metric["category"],
                description=metric["description"],
                unit=metric["unit"]
            ))
        return symbols

    def get_kategori_symbols(self) -> List[ProcurementSymbol]:
        """Get kategori_plant symbols based on fact data"""
        if self._kategori_cache and self._kategori_cache_timestamp:
            if datetime.now() - self._kategori_cache_timestamp < self._cache_duration:
                return self._kategori_cache

        query = """
            SELECT DISTINCT kategori_plant
            FROM fact_value_weekly
            WHERE kategori_plant IS NOT NULL
            ORDER BY kategori_plant
        """
        rows = self._execute_query(query)

        symbols = []
        for row in rows:
            kategori = row.get("kategori_plant")
            if not kategori:
                continue
            symbols.append(ProcurementSymbol(
                symbol=f"KAT_{kategori}",
                name=f"{kategori}",
                category="kategori",
                description="Kategori plant (agregat)",
                unit="Rp"
            ))

        self._kategori_cache = symbols
        self._kategori_cache_timestamp = datetime.now()
        return symbols

    def get_kategori_dana_symbols(self) -> List[ProcurementSymbol]:
        """Get kategori_plant symbols split by sumber dana"""
        symbols = []
        for base in self.get_kategori_symbols():
            symbols.append(ProcurementSymbol(
                symbol=f"{base.symbol}_EKS",
                name=f"{base.name} - Eksploitasi",
                category="kategori",
                description="Kategori plant (Eksploitasi)",
                unit="Rp"
            ))
            symbols.append(ProcurementSymbol(
                symbol=f"{base.symbol}_INV",
                name=f"{base.name} - Investasi",
                category="kategori",
                description="Kategori plant (Investasi)",
                unit="Rp"
            ))
        return symbols

    def get_plant_dana_symbols(self) -> List[ProcurementSymbol]:
        """Get plant symbols split by sumber dana (TradingView-style variants)"""
        symbols = []
        for plant in self.get_plants():
            symbols.append(ProcurementSymbol(
                symbol=f"{plant.symbol}_EKS",
                name=f"{plant.name} - Eksploitasi",
                category="plant",
                description=f"{plant.description} | Eksploitasi",
                unit="Rp"
            ))
            symbols.append(ProcurementSymbol(
                symbol=f"{plant.symbol}_INV",
                name=f"{plant.name} - Investasi",
                category="plant",
                description=f"{plant.description} | Investasi",
                unit="Rp"
            ))
        return symbols
    
    def get_all_symbols(self) -> List[ProcurementSymbol]:
        """Get all available symbols (plants + metrics + sumber_dana)"""
        symbols = []
        symbols.extend(self.get_metric_symbols())
        symbols.extend(self.get_kategori_symbols())
        symbols.extend(self.get_kategori_dana_symbols())
        symbols.extend(self.get_plants())
        symbols.extend(self.get_plant_dana_symbols())
        symbols.extend(self.get_sumber_dana_symbols())
        return symbols
    
    def search_symbols(self, query: str, limit: int = 20) -> List[ProcurementSymbol]:
        """Search symbols by name or code (autocomplete)"""
        query_lower = query.lower()
        all_symbols = self.get_all_symbols()
        
        results = []
        for symbol in all_symbols:
            # Match by symbol code or name
            if (query_lower in symbol.symbol.lower() or 
                query_lower in symbol.name.lower() or
                query_lower in symbol.description.lower()):
                results.append(symbol)
                if len(results) >= limit:
                    break
        
        return results
    
    def get_timeframes(self) -> List[str]:
        """Get available timeframes"""
        return list(self.TIMEFRAMES.keys())
    
    def fetch_time_series(
        self, 
        symbol: str, 
        timeframe: str = "1W",
        limit: int = 500,
        plant_filter: str = None,
        sumber_dana_filter: str = None,
        year: int = None,
        period_type: str = None
    ) -> List[OHLCData]:
        """
        Fetch time series data for a symbol
        Returns OHLC-like data (using Value as all OHLC to keep consistency)
        For procurement: Open=Min, High=Max, Low=Min, Close=Average
        """
        
        # Determine metric info
        if symbol.startswith("DOC_") or symbol.startswith("VAL_"):
            metric_info = self.METRICS.get(symbol)
            if not metric_info:
                return []
            
            return self._fetch_metric_data(
                metric_info,
                timeframe,
                limit,
                plant_filter,
                sumber_dana_filter,
                year,
                period_type
            )
        
        elif symbol.startswith("PLANT_"):
            # Aggregate data for specific plant (optionally with dana suffix)
            plant_code = symbol.replace("PLANT_", "")
            sumber_dana_override = None
            if plant_code.endswith("_INV"):
                plant_code = plant_code[:-4]
                sumber_dana_override = "investasi"
            elif plant_code.endswith("_EKS"):
                plant_code = plant_code[:-4]
                sumber_dana_override = "eksploitasi"
            return self._fetch_plant_aggregate(
                plant_code,
                timeframe,
                limit,
                sumber_dana_override or sumber_dana_filter,
                year,
                period_type
            )

        elif symbol.startswith("KAT_"):
            # Aggregate data for kategori_plant (optionally with dana suffix)
            kategori = symbol.replace("KAT_", "")
            sumber_dana_override = None
            if kategori.endswith("_INV"):
                kategori = kategori[:-4]
                sumber_dana_override = "investasi"
            elif kategori.endswith("_EKS"):
                kategori = kategori[:-4]
                sumber_dana_override = "eksploitasi"

            return self._fetch_metric_data(
                {
                    "table": "fact_value_weekly",
                    "column": "total_nilai",
                    "name": f"Kategori {kategori}"
                },
                timeframe,
                limit,
                plant_filter=kategori,
                sumber_dana_filter=sumber_dana_override or sumber_dana_filter,
                year=year,
                period_type=period_type
            )
        
        elif symbol.startswith("DANA_"):
            # Aggregate data by sumber dana
            sumber_dana = "eksploitasi" if "EKSPLOITASI" in symbol else "investasi"
            return self._fetch_sumber_dana_aggregate(
                sumber_dana, timeframe, limit, plant_filter, year, period_type
            )
        
        # Unknown symbol
        return []
    
    def _fetch_metric_data(
        self, 
        metric_info: Dict,
        timeframe: str,
        limit: int,
        plant_filter: str = None,
        sumber_dana_filter: str = None,
        year: int = None,
        period_type: str = None
    ) -> List[OHLCData]:
        """Fetch time series for a specific metric"""
        
        table = metric_info["table"]
        column = metric_info["column"]
        metric_filter = metric_info.get("filter")
        
        # Build time grouping based on timeframe
        if timeframe == "1D":
            time_trunc = "day"
        elif timeframe == "1W":
            time_trunc = "week"
        elif timeframe == "1M":
            time_trunc = "month"
        else:  # 1Y
            time_trunc = "year"
        
        # Build query
        where_clauses = []
        params = []
        
        # Add metric-specific filter (e.g., doc_type = 'PR')
        if metric_filter:
            where_clauses.append(metric_filter)
        
        # Add year filter
        if year:
            where_clauses.append("period_year = %s")
            params.append(year)

        if period_type:
            where_clauses.append("period_type = %s")
            params.append(period_type)

        if plant_filter:
            where_clauses.append("kategori_plant = %s")
            params.append(plant_filter)
        
        if sumber_dana_filter:
            where_clauses.append("sumber_dana = %s")
            params.append(sumber_dana_filter)
        
        where_sql = ""
        if where_clauses:
            where_sql = "WHERE " + " AND ".join(where_clauses)
        
        query = f"""
            SELECT 
                DATE_TRUNC('{time_trunc}', week_start) as period,
                SUM({column}) as total_value,
                MIN({column}) as min_value,
                MAX({column}) as max_value,
                AVG({column}) as avg_value
            FROM {table}
            {where_sql}
            GROUP BY DATE_TRUNC('{time_trunc}', week_start)
            ORDER BY period DESC
            LIMIT %s
        """
        params.append(limit)
        
        rows = self._execute_query(query, tuple(params))
        
        if not rows:
            return []
        
        # Convert to OHLC format (reversed to chronological order)
        data = []
        for row in reversed(rows):
            timestamp = int(row["period"].timestamp()) if row["period"] else 0
            value = float(row["total_value"] or 0)
            min_val = float(row["min_value"] or value)
            max_val = float(row["max_value"] or value)
            avg_val = float(row["avg_value"] or value)
            
            data.append(OHLCData(
                time=timestamp,
                open=min_val,    # Start of period
                high=max_val,    # Maximum
                low=min_val,     # Minimum
                close=avg_val,   # Average as "close"
                volume=value     # Total as volume
            ))
        
        return data
    
    def _fetch_plant_aggregate(
        self, 
        plant_code: str,
        timeframe: str,
        limit: int,
        sumber_dana_filter: str = None,
        year: int = None,
        period_type: str = None
    ) -> List[OHLCData]:
        """Fetch aggregated data for a specific plant"""
        # Use fact_value_weekly for plant-level data
        return self._fetch_metric_data(
            {
                "table": "fact_value_weekly",
                "column": "total_nilai",
                "name": f"Plant {plant_code}"
            },
            timeframe,
            limit,
            plant_filter=plant_code,
            sumber_dana_filter=sumber_dana_filter,
            year=year,
            period_type=period_type
        )
    
    def _fetch_sumber_dana_aggregate(
        self, 
        sumber_dana: str,
        timeframe: str,
        limit: int,
        plant_filter: str = None,
        year: int = None,
        period_type: str = None
    ) -> List[OHLCData]:
        """Fetch aggregated data for a sumber dana"""
        return self._fetch_metric_data(
            {
                "table": "fact_value_weekly",
                "column": "total_nilai",
                "name": f"Dana {sumber_dana}"
            },
            timeframe,
            limit,
            plant_filter=plant_filter,
            sumber_dana_filter=sumber_dana,
            year=year,
            period_type=period_type
        )
    
    def get_latest_value(self, symbol: str) -> Dict:
        """Get the latest value for a symbol (like latest price)"""
        data = self.fetch_time_series(symbol, "1W", limit=2)
        
        if len(data) < 2:
            return {
                "symbol": symbol,
                "value": 0,
                "change": 0,
                "change_percent": 0,
                "timestamp": int(datetime.now().timestamp())
            }
        
        current = data[-1]
        previous = data[-2]
        
        current_val = current.close
        prev_val = previous.close
        change = current_val - prev_val
        change_pct = (change / prev_val * 100) if prev_val else 0
        
        return {
            "symbol": symbol,
            "value": current_val,
            "change": round(change, 2),
            "change_percent": round(change_pct, 2),
            "timestamp": current.time
        }
    
    def _generate_mock_data(
        self,
        symbol: str,
        timeframe: str = "1W",
        limit: int = 100
    ) -> List[OHLCData]:
        """Generate mock data when database query fails"""
        import random
        
        # Time intervals in seconds
        intervals = {
            "1D": 86400,
            "1W": 604800,
            "1M": 2592000,
            "1Y": 31536000
        }
        
        # Base values based on symbol type
        if "DOC_" in symbol:
            base_value = 150
            volatility = 50
        elif "VAL_" in symbol:
            base_value = 2000000000  # 2 billion IDR
            volatility = 500000000
        else:
            base_value = 100
            volatility = 30
        
        interval = intervals.get(timeframe, 604800)
        current_time = int(datetime.now().timestamp())
        current_time = (current_time // interval) * interval
        
        data = []
        value = base_value
        
        for i in range(limit):
            timestamp = current_time - ((limit - 1 - i) * interval)
            
            # Generate variation
            change = random.gauss(0, volatility * 0.2)
            new_value = max(0, value + change)
            
            min_val = new_value * (1 - random.uniform(0.05, 0.15))
            max_val = new_value * (1 + random.uniform(0.05, 0.15))
            
            data.append(OHLCData(
                time=timestamp,
                open=round(min_val, 2),
                high=round(max_val, 2),
                low=round(min_val, 2),
                close=round(new_value, 2),
                volume=round(new_value, 2)
            ))
            
            value = new_value
        
        logger.info(f"Generated {len(data)} mock data points for {symbol}")
        return data


# Singleton instance
procurement_service = ProcurementService()
