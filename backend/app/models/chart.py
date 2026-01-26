"""
Trading Chart Application - Data Models
"""
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class OHLCData(BaseModel):
    """OHLC Candlestick data model"""
    time: int  # Unix timestamp in seconds
    open: float
    high: float
    low: float
    close: float
    volume: Optional[float] = None


class Symbol(BaseModel):
    """Trading symbol model"""
    symbol: str
    name: str
    type: str  # forex, crypto, stock
    exchange: Optional[str] = None


class ChartDataRequest(BaseModel):
    """Request model for chart data"""
    symbol: str
    timeframe: str = "1D"
    limit: int = 500


class ChartDataResponse(BaseModel):
    """Response model for chart data"""
    symbol: str
    timeframe: str
    data: List[OHLCData]


class PriceUpdate(BaseModel):
    """Real-time price update model"""
    symbol: str
    price: float
    change: float
    change_percent: float
    timestamp: int
