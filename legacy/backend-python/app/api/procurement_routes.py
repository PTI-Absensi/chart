"""
Trading Chart Application - Procurement API Routes
Provides endpoints for procurement data with TradingView-style interface
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from ..services.procurement_service import procurement_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/procurement", tags=["Procurement API"])


@router.get("/symbols")
async def get_procurement_symbols():
    """
    Get all available procurement symbols
    Includes: Metrics (DOC_PR, VAL_HPS, etc), Plants, Sumber Dana
    """
    try:
        symbols = procurement_service.get_all_symbols()
        return {
            "status": "success",
            "count": len(symbols),
            "data": [s.to_dict() for s in symbols]
        }
    except Exception as e:
        logger.error(f"Error getting symbols: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
async def search_symbols(
    q: str = Query(..., description="Search query"),
    limit: int = Query(default=20, ge=1, le=100)
):
    """
    Search symbols by name or code (autocomplete)
    Like TradingView: type 'PG' to find all PG plants
    """
    try:
        if len(q) < 1:
            return {"status": "success", "data": []}
        
        symbols = procurement_service.search_symbols(q, limit)
        return {
            "status": "success",
            "query": q,
            "count": len(symbols),
            "data": [s.to_dict() for s in symbols]
        }
    except Exception as e:
        logger.error(f"Error searching symbols: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/timeframes")
async def get_timeframes():
    """
    Get available timeframes for procurement charts
    """
    return {
        "status": "success",
        "data": procurement_service.get_timeframes()
    }


@router.get("/data/{symbol}")
async def get_procurement_data(
    symbol: str,
    timeframe: str = Query(default="1W", description="Timeframe: 1D, 1W, 1M, 1Y"),
    limit: int = Query(default=200, ge=1, le=1000),
    plant: Optional[str] = Query(default=None, description="Filter by plant code"),
    sumber_dana: Optional[str] = Query(default=None, description="Filter by sumber dana"),
    year: Optional[int] = Query(default=None, description="Filter by period year"),
    period_type: Optional[str] = Query(default=None, description="calendar or fiscal")
):
    """
    Get time series data for a symbol
    
    - **symbol**: Procurement symbol (e.g., DOC_PR, VAL_HPS, PLANT_001)
    - **timeframe**: 1D (daily), 1W (weekly), 1M (monthly), 1Y (yearly)
    - **plant**: Optional plant code filter
    - **sumber_dana**: Optional sumber dana filter (eksploitasi/investasi)
    - **year**: Optional period year filter
    - **period_type**: Optional period type (calendar/fiscal)
    """
    try:
        # Validate timeframe
        valid_timeframes = procurement_service.get_timeframes()
        if timeframe not in valid_timeframes:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid timeframe. Available: {valid_timeframes}"
            )

        if period_type and period_type not in {"calendar", "fiscal"}:
            raise HTTPException(
                status_code=400,
                detail="Invalid period_type. Use 'calendar' or 'fiscal'."
            )
        
        data = procurement_service.fetch_time_series(
            symbol=symbol.upper(),
            timeframe=timeframe,
            limit=limit,
            plant_filter=plant,
            sumber_dana_filter=sumber_dana,
            year=year,
            period_type=period_type
        )
        
        return {
            "status": "success",
            "symbol": symbol.upper(),
            "timeframe": timeframe,
            "count": len(data),
            "data": [d.model_dump() for d in data]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting procurement data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/latest/{symbol}")
async def get_latest_value(symbol: str):
    """
    Get the latest value for a symbol (like latest price)
    """
    try:
        value_data = procurement_service.get_latest_value(symbol.upper())
        return {
            "status": "success",
            "data": value_data
        }
    except Exception as e:
        logger.error(f"Error getting latest value: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics")
async def get_available_metrics():
    """
    Get list of available metrics only
    """
    metrics = procurement_service.get_metric_symbols()
    return {
        "status": "success",
        "data": [m.to_dict() for m in metrics]
    }


@router.get("/plants")
async def get_available_plants():
    """
    Get list of available plants
    """
    try:
        plants = procurement_service.get_plants()
        return {
            "status": "success",
            "count": len(plants),
            "data": [p.to_dict() for p in plants]
        }
    except Exception as e:
        logger.error(f"Error getting plants: {e}")
        raise HTTPException(status_code=500, detail=str(e))
