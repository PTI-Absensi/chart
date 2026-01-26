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
async def get_symbols():
    """
    Get all available trading symbols
    Returns list of symbols with their metadata
    """
    symbols = data_service.get_symbols()
    return {
        "status": "success",
        "data": [s.model_dump() for s in symbols]
    }


@router.get("/timeframes")
async def get_timeframes():
    """
    Get all available chart timeframes
    """
    timeframes = data_service.get_timeframes()
    return {
        "status": "success",
        "data": timeframes
    }


@router.get("/ohlc/{symbol}")
async def get_ohlc_data(
    symbol: str,
    timeframe: str = Query(default="1D", description="Chart timeframe"),
    limit: int = Query(default=500, ge=1, le=2000, description="Number of candles")
):
    """
    Get OHLC candlestick data for a symbol
    
    - **symbol**: Trading symbol (e.g., XAUUSD, BTCUSD)
    - **timeframe**: Chart timeframe (1m, 5m, 15m, 1h, 4h, 1D, 1W)
    - **limit**: Number of candles to return (max 2000)
    """
    # Validate symbol
    valid_symbols = [s.symbol for s in data_service.get_symbols()]
    if symbol.upper() not in valid_symbols:
        raise HTTPException(
            status_code=404, 
            detail=f"Symbol {symbol} not found. Available: {valid_symbols}"
        )
    
    # Validate timeframe
    valid_timeframes = data_service.get_timeframes()
    if timeframe not in valid_timeframes:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid timeframe. Available: {valid_timeframes}"
        )
    
    # Get OHLC data from yfinance
    data = await asyncio.to_thread(
        data_service.fetch_ohlc_data,
        symbol.upper(),
        timeframe,
        limit
    )
    
    return {
        "status": "success",
        "symbol": symbol.upper(),
        "timeframe": timeframe,
        "count": len(data),
        "data": [d.model_dump() for d in data]
    }


@router.get("/price/{symbol}")
async def get_latest_price(symbol: str):
    """
    Get the latest price for a symbol
    """
    valid_symbols = [s.symbol for s in data_service.get_symbols()]
    if symbol.upper() not in valid_symbols:
        raise HTTPException(
            status_code=404,
            detail=f"Symbol {symbol} not found"
        )
    
    price_data = await asyncio.to_thread(data_service.get_latest_price, symbol.upper())
    return {
        "status": "success",
        "data": price_data
    }
