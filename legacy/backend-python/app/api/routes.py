"""
Trading Chart Application - API Routes
"""
import asyncio
from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from ..services.data_service import data_service
from ..models.chart import ChartDataResponse

router = APIRouter(prefix="/api", tags=["Chart API"])


@router.get("/symbols")
async def get_symbols(with_data: bool = Query(default=False, description="Only return kode_data with data")):
    """
    Get all available trading symbols
    Returns list of symbols with their metadata
    """
    symbols = data_service.get_symbols(only_with_data=with_data)
    return {
        "status": "success",
        "data": [s.model_dump() for s in symbols]
    }


@router.get("/timeframes")
async def get_timeframes():
    """Get available chart timeframes (procurement uses weekly)"""
    timeframes = data_service.get_timeframes()
    return {"status": "success", "data": timeframes}


@router.get("/ohlc/{symbol}")
async def get_ohlc_data(
    symbol: str,
    period_type: str = Query(default="calendar", description="calendar | fiscal"),
    year: int = Query(default=2025, description="Tahun data"),
    limit: int = Query(default=500, ge=1, le=2000, description="Number of candles"),
    cumulative: bool = Query(default=False, description="Use cumulative values")
):
    """
    Get weekly procurement series for a kode_data.

    - **symbol**: kode_data (e.g., A1, B001)
    - **period_type**: calendar | fiscal
    - **year**: period_year
    - **limit**: Number of weeks to return
    - **cumulative**: return cumulative series
    """
    symbol = symbol.strip()
    valid_symbols = [s.symbol for s in data_service.get_symbols()]
    if symbol not in valid_symbols and symbol.upper() in valid_symbols:
        symbol = symbol.upper()
    if symbol not in valid_symbols:
        raise HTTPException(
            status_code=404,
            detail=f"Kode data {symbol} not found. Available: {valid_symbols}"
        )

    data = await asyncio.to_thread(
        data_service.fetch_ohlc_data,
        symbol,
        period_type,
        year,
        limit,
        cumulative
    )

    return {
        "status": "success",
        "symbol": symbol,
        "period_type": period_type,
        "year": year,
        "count": len(data),
        "data": [d.model_dump() for d in data]
    }


@router.get("/price/{symbol}")
async def get_latest_price(
    symbol: str,
    period_type: str = Query(default="calendar"),
    year: int = Query(default=2025)
):
    """Get the latest value for a kode_data"""
    symbol = symbol.strip()
    valid_symbols = [s.symbol for s in data_service.get_symbols()]
    if symbol not in valid_symbols and symbol.upper() in valid_symbols:
        symbol = symbol.upper()
    if symbol not in valid_symbols:
        raise HTTPException(status_code=404, detail=f"Kode data {symbol} not found")

    price_data = await asyncio.to_thread(data_service.get_latest_price, symbol, period_type, year)
    return {"status": "success", "data": price_data}
