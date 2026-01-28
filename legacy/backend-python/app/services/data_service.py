"""
Chart Data Service (adapter-based)
Reads mapping config so the charting tools can switch databases/tables
without changing core logic.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List

import psycopg2
from psycopg2 import sql
from psycopg2.extras import RealDictCursor

from ..config import settings
from ..models.chart import OHLCData, Symbol


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _ident(qualified: str) -> sql.Composed:
    parts = [p for p in qualified.split(".") if p]
    return sql.SQL(".").join([sql.Identifier(p) for p in parts])


class DataAdapter:
    """Base adapter interface"""
    def get_symbols(self, only_with_data: bool = False) -> List[Symbol]:
        raise NotImplementedError

    def get_timeframes(self) -> List[str]:
        raise NotImplementedError

    def fetch_ohlc_data(
        self,
        symbol: str,
        period_type: str,
        year: int,
        limit: int,
        cumulative: bool
    ) -> List[OHLCData]:
        raise NotImplementedError

    def get_latest_price(self, symbol: str, period_type: str, year: int) -> Dict:
        raise NotImplementedError


class PostgresAdapter(DataAdapter):
    """PostgreSQL adapter driven by mapping config"""
    def __init__(self, mapping: Dict):
        self.mapping = mapping

    def _get_conn(self):
        return psycopg2.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            dbname=settings.DB_NAME,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD
        )

    def get_symbols(self, only_with_data: bool = False) -> List[Symbol]:
        symbols_cfg = self.mapping["symbols"]
        columns = symbols_cfg["columns"]
        table = symbols_cfg["table"]
        symbol_col = columns["symbol"]
        name_col = columns["name"]
        fallback_parts = columns.get("fallback_parts", [])

        base = sql.SQL("SELECT {symbol}, {name}, {fallback} FROM {table}").format(
            symbol=sql.Identifier(symbol_col),
            name=sql.Identifier(name_col),
            fallback=sql.SQL(", ").join([sql.Identifier(c) for c in fallback_parts]) if fallback_parts else sql.SQL("''"),
            table=_ident(table)
        )

        if only_with_data:
            with_data = symbols_cfg["filters"]["with_data"]
            data_table = _ident(with_data["table"])
            data_col = sql.Identifier(with_data["column"])
            base = base + sql.SQL(" WHERE {symbol} IN (SELECT DISTINCT {col} FROM {data_table})").format(
                symbol=sql.Identifier(symbol_col),
                col=data_col,
                data_table=data_table
            )

        query = base + sql.SQL(" ORDER BY {symbol}").format(symbol=sql.Identifier(symbol_col))
        result: List[Symbol] = []

        try:
            with self._get_conn() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(query)
                    rows = cur.fetchall()
                    for r in rows:
                        name = r.get(name_col) or ""
                        if not name and fallback_parts:
                            parts = [r.get(p) for p in fallback_parts if r.get(p)]
                            name = " ".join(parts)
                        result.append(Symbol(
                            symbol=r.get(symbol_col),
                            name=name,
                            type="procurement",
                            exchange="OLAH"
                        ))
        except Exception as exc:
            logger.error("Failed to load symbols: %s", exc)

        return result

    def get_timeframes(self) -> List[str]:
        return ["1W"]

    def fetch_ohlc_data(
        self,
        symbol: str,
        period_type: str,
        year: int,
        limit: int,
        cumulative: bool
    ) -> List[OHLCData]:
        series_cfg = self.mapping["series"]
        table = series_cfg["table"]
        time_col = series_cfg["time_column"]
        value_col = series_cfg["value_column"]
        symbol_col = series_cfg["symbol_column"]
        period_type_col = series_cfg["period_type_column"]
        year_col = series_cfg["year_column"]

        query = sql.SQL("""
            WITH weekly AS (
                SELECT {time_col}::date AS period, SUM({value_col}) AS value
                FROM {table}
                WHERE {symbol_col} = %s
                  AND {period_type_col} = %s
                  AND {year_col} = %s
                GROUP BY {time_col}
                ORDER BY {time_col} DESC
                LIMIT %s
            ), ordered AS (
                SELECT * FROM weekly ORDER BY period
            )
            SELECT period, value,
                   SUM(value) OVER (ORDER BY period) AS value_cum
            FROM ordered
            ORDER BY period;
        """).format(
            time_col=sql.Identifier(time_col),
            value_col=sql.Identifier(value_col),
            table=_ident(table),
            symbol_col=sql.Identifier(symbol_col),
            period_type_col=sql.Identifier(period_type_col),
            year_col=sql.Identifier(year_col)
        )

        data: List[OHLCData] = []
        try:
            with self._get_conn() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(query, (symbol, period_type, year, limit))
                    rows = cur.fetchall()
                    for r in rows:
                        value = float(r["value_cum"] if cumulative else r["value"])
                        ts = int(datetime.combine(r["period"], datetime.min.time()).timestamp())
                        data.append(OHLCData(
                            time=ts,
                            open=value,
                            high=value,
                            low=value,
                            close=value,
                            volume=value
                        ))
        except Exception as exc:
            logger.error("Failed to fetch series for %s: %s", symbol, exc)

        return data

    def get_latest_price(self, symbol: str, period_type: str, year: int) -> Dict:
        series_cfg = self.mapping["series"]
        table = series_cfg["table"]
        time_col = series_cfg["time_column"]
        value_col = series_cfg["value_column"]
        symbol_col = series_cfg["symbol_column"]
        period_type_col = series_cfg["period_type_column"]
        year_col = series_cfg["year_column"]

        query = sql.SQL("""
            WITH weekly AS (
                SELECT {time_col}::date AS period, SUM({value_col}) AS value
                FROM {table}
                WHERE {symbol_col} = %s
                  AND {period_type_col} = %s
                  AND {year_col} = %s
                GROUP BY {time_col}
                ORDER BY {time_col} DESC
                LIMIT 2
            )
            SELECT * FROM weekly ORDER BY period;
        """).format(
            time_col=sql.Identifier(time_col),
            value_col=sql.Identifier(value_col),
            table=_ident(table),
            symbol_col=sql.Identifier(symbol_col),
            period_type_col=sql.Identifier(period_type_col),
            year_col=sql.Identifier(year_col)
        )

        try:
            with self._get_conn() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(query, (symbol, period_type, year))
                    rows = cur.fetchall()
                    if not rows:
                        return {
                            "symbol": symbol,
                            "price": 0,
                            "change": 0,
                            "change_percent": 0,
                            "timestamp": int(datetime.now().timestamp())
                        }
                    latest = rows[-1]
                    prev = rows[-2] if len(rows) > 1 else rows[-1]
                    current = float(latest["value"])
                    previous = float(prev["value"])
                    change = current - previous
                    change_percent = (change / previous * 100) if previous else 0
                    return {
                        "symbol": symbol,
                        "price": round(current, 2),
                        "change": round(change, 2),
                        "change_percent": round(change_percent, 2),
                        "timestamp": int(datetime.combine(latest["period"], datetime.min.time()).timestamp())
                    }
        except Exception as exc:
            logger.error("Failed to fetch latest value for %s: %s", symbol, exc)
            return {
                "symbol": symbol,
                "price": 0,
                "change": 0,
                "change_percent": 0,
                "timestamp": int(datetime.now().timestamp())
            }


class DataService:
    """Facade for adapters"""
    def __init__(self):
        mapping_path = Path(settings.DATA_MAPPING_PATH)
        if not mapping_path.is_absolute():
            mapping_path = Path(__file__).parent.parent / mapping_path
        try:
            self.mapping = json.loads(mapping_path.read_text(encoding="utf-8"))
        except Exception as exc:
            logger.error("Failed to load mapping %s: %s", mapping_path, exc)
            self.mapping = {}

        adapter = settings.DATA_ADAPTER.lower()
        if adapter == "postgres":
            self.adapter = PostgresAdapter(self.mapping)
        else:
            logger.warning("Unknown adapter '%s', falling back to postgres", adapter)
            self.adapter = PostgresAdapter(self.mapping)

    def get_symbols(self, only_with_data: bool = False) -> List[Symbol]:
        return self.adapter.get_symbols(only_with_data=only_with_data)

    def get_timeframes(self) -> List[str]:
        return self.adapter.get_timeframes()

    def fetch_ohlc_data(
        self,
        symbol: str,
        period_type: str = "calendar",
        year: int = 2025,
        limit: int = 500,
        cumulative: bool = False
    ) -> List[OHLCData]:
        return self.adapter.fetch_ohlc_data(symbol, period_type, year, limit, cumulative)

    def get_latest_price(self, symbol: str, period_type: str = "calendar", year: int = 2025) -> Dict:
        return self.adapter.get_latest_price(symbol, period_type, year)


data_service = DataService()
