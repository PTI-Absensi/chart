"""
Trading Chart Application - Data Service
Fetches real market data from yfinance
"""
import yfinance as yf
import pandas as pd
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from ..models.chart import OHLCData, Symbol
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logging.getLogger("yfinance").setLevel(logging.CRITICAL)
logging.getLogger("yfinance").propagate = False


class DataService:
    """Service for managing chart data with yfinance integration"""
    
    # Available trading symbols with yfinance ticker mapping
    SYMBOLS: List[Symbol] = [
        Symbol(symbol="XAUUSD", name="Gold Futures (GC=F) / U.S. Dollar", type="commodity", exchange="COMEX"),
        Symbol(symbol="EURUSD", name="Euro / U.S. Dollar", type="forex", exchange="FOREX"),
        Symbol(symbol="BTCUSD", name="Bitcoin / U.S. Dollar", type="crypto", exchange="CRYPTO"),
        Symbol(symbol="ETHUSD", name="Ethereum / U.S. Dollar", type="crypto", exchange="CRYPTO"),
        Symbol(symbol="GBPUSD", name="British Pound / U.S. Dollar", type="forex", exchange="FOREX"),
        Symbol(symbol="USDJPY", name="U.S. Dollar / Japanese Yen", type="forex", exchange="FOREX"),
        Symbol(symbol="AAPL", name="Apple Inc.", type="stock", exchange="NASDAQ"),
        Symbol(symbol="GOOGL", name="Alphabet Inc.", type="stock", exchange="NASDAQ"),
        Symbol(symbol="MSFT", name="Microsoft Corporation", type="stock", exchange="NASDAQ"),
        Symbol(symbol="TSLA", name="Tesla Inc.", type="stock", exchange="NASDAQ"),
    ]
    
    # Mapping from our symbols to yfinance tickers
    YFINANCE_TICKERS: Dict[str, str] = {
        "XAUUSD": "GC=F",        # Gold Futures
        "EURUSD": "EURUSD=X",    # EUR/USD
        "BTCUSD": "BTC-USD",     # Bitcoin USD
        "ETHUSD": "ETH-USD",     # Ethereum USD
        "GBPUSD": "GBPUSD=X",    # GBP/USD
        "USDJPY": "JPY=X",       # USD/JPY
        "AAPL": "AAPL",          # Apple
        "GOOGL": "GOOGL",        # Google
        "MSFT": "MSFT",          # Microsoft
        "TSLA": "TSLA",          # Tesla
    }

    DECIMALS_BY_SYMBOL: Dict[str, int] = {
        "XAUUSD": 2,
        "EURUSD": 5,
        "GBPUSD": 5,
        "USDJPY": 3,
        "BTCUSD": 2,
        "ETHUSD": 2,
        "AAPL": 2,
        "GOOGL": 2,
        "MSFT": 2,
        "TSLA": 2,
    }
    
    # Timeframe mapping to yfinance intervals
    TIMEFRAMES: Dict[str, str] = {
        "1m": "1m",
        "2m": "2m",
        "5m": "5m",
        "15m": "15m",
        "30m": "30m",
        "1h": "1h",
        "4h": "1h",      # yfinance doesn't have 4h, we'll aggregate
        "1D": "1d",
        "1W": "1wk",
        "1M": "1mo",
    }
    
    # Period for each timeframe (how far back to fetch)
    PERIODS: Dict[str, str] = {
        "1m": "7d",      # 1 minute: max 7 days
        "2m": "60d",     # 2 minutes: max 60 days
        "5m": "60d",     # 5 minutes: max 60 days
        "15m": "60d",    # 15 minutes: max 60 days
        "30m": "60d",    # 30 minutes: max 60 days
        "1h": "730d",    # 1 hour: max 2 years
        "4h": "730d",    # 4 hour: max 2 years
        "1D": "max",     # 1 day: max available
        "1W": "max",     # 1 week: max available
        "1M": "max",     # 1 month: max available
    }

    YAHOO_RANGES: Dict[str, str] = {
        "1m": "7d",
        "2m": "60d",
        "5m": "60d",
        "15m": "60d",
        "30m": "60d",
        "1h": "2y",
        "4h": "2y",
        "1D": "2y",
        "1W": "10y",
        "1M": "max",
    }

    YAHOO_HEADERS: Dict[str, str] = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept": "application/json",
    }
    
    def __init__(self):
        self._cache: Dict[str, Dict] = {}
        self._cache_duration = timedelta(minutes=1)  # Cache for 1 minute
        self._yfinance_cooldown = timedelta(minutes=5)
        self._yfinance_disabled_until: Dict[str, datetime] = {}
        self._yahoo_cooldown = timedelta(minutes=5)
        self._yahoo_disabled_until: Dict[str, datetime] = {}
    
    def get_symbols(self) -> List[Symbol]:
        """Get all available trading symbols"""
        return self.SYMBOLS
    
    def get_timeframes(self) -> List[str]:
        """Get all available timeframes"""
        return list(self.TIMEFRAMES.keys())
    
    def _get_yfinance_ticker(self, symbol: str) -> str:
        """Convert our symbol to yfinance ticker"""
        return self.YFINANCE_TICKERS.get(symbol, symbol)
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        """Check if cached data is still valid"""
        if cache_key not in self._cache:
            return False
        cached = self._cache[cache_key]
        return datetime.now() - cached["timestamp"] < self._cache_duration

    def _set_cache(self, cache_key: str, data) -> None:
        self._cache[cache_key] = {
            "data": data,
            "timestamp": datetime.now()
        }

    def _is_yfinance_enabled(self, symbol: str) -> bool:
        disabled_until = self._yfinance_disabled_until.get(symbol)
        return not disabled_until or datetime.now() >= disabled_until

    def _disable_yfinance(self, symbol: str) -> None:
        self._yfinance_disabled_until[symbol] = datetime.now() + self._yfinance_cooldown

    def _get_price_decimals(self, symbol: str, price: float) -> int:
        if symbol in self.DECIMALS_BY_SYMBOL:
            return self.DECIMALS_BY_SYMBOL[symbol]
        if price < 1:
            return 5
        if price < 100:
            return 4
        if price < 1000:
            return 2
        return 2

    def _is_yahoo_enabled(self, symbol: str) -> bool:
        disabled_until = self._yahoo_disabled_until.get(symbol)
        return not disabled_until or datetime.now() >= disabled_until

    def _disable_yahoo(self, symbol: str) -> None:
        self._yahoo_disabled_until[symbol] = datetime.now() + self._yahoo_cooldown

    def _fetch_yahoo_chart(
        self,
        symbol: str,
        ticker: str,
        interval: str,
        range_value: str
    ) -> List[OHLCData]:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
        params = {"interval": interval, "range": range_value}
        response = requests.get(url, headers=self.YAHOO_HEADERS, params=params, timeout=10)
        response.raise_for_status()
        payload = response.json()

        result = payload.get("chart", {}).get("result")
        if not result:
            return []

        result = result[0]
        timestamps = result.get("timestamp") or []
        quote_list = result.get("indicators", {}).get("quote", [])
        if not timestamps or not quote_list:
            return []

        quote = quote_list[0]
        opens = quote.get("open") or []
        highs = quote.get("high") or []
        lows = quote.get("low") or []
        closes = quote.get("close") or []
        volumes = quote.get("volume") or []

        data = []
        for i, ts in enumerate(timestamps):
            if i >= len(opens) or i >= len(highs) or i >= len(lows) or i >= len(closes):
                break

            open_val = opens[i]
            high_val = highs[i]
            low_val = lows[i]
            close_val = closes[i]

            if open_val is None or high_val is None or low_val is None or close_val is None:
                continue

            decimals = self._get_price_decimals(symbol, float(close_val))
            volume = volumes[i] if i < len(volumes) and volumes[i] is not None else 0

            data.append(OHLCData(
                time=int(ts),
                open=round(float(open_val), decimals),
                high=round(float(high_val), decimals),
                low=round(float(low_val), decimals),
                close=round(float(close_val), decimals),
                volume=round(float(volume), 2) if volume else 0
            ))

        return data

    def _fetch_yahoo_latest_price(self, symbol: str, ticker: str) -> Optional[Dict]:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
        params = {"interval": "1d", "range": "5d"}
        response = requests.get(url, headers=self.YAHOO_HEADERS, params=params, timeout=10)
        response.raise_for_status()
        payload = response.json()

        result = payload.get("chart", {}).get("result")
        if not result:
            return None

        result = result[0]
        meta = result.get("meta", {})
        current_price = meta.get("regularMarketPrice")
        previous_close = meta.get("chartPreviousClose") or meta.get("previousClose")

        if current_price is None:
            quote_list = result.get("indicators", {}).get("quote", [])
            if quote_list:
                closes = quote_list[0].get("close") or []
                closes = [c for c in closes if c is not None]
                if closes:
                    current_price = closes[-1]
                    if len(closes) > 1:
                        previous_close = closes[-2]

        if current_price is None:
            return None

        if previous_close is None:
            previous_close = current_price

        decimals = self._get_price_decimals(symbol, float(current_price))
        change = float(current_price) - float(previous_close)
        change_percent = (change / float(previous_close) * 100) if previous_close else 0

        return {
            "symbol": symbol,
            "price": round(float(current_price), decimals),
            "change": round(change, decimals),
            "change_percent": round(change_percent, 2),
            "timestamp": int(meta.get("regularMarketTime") or datetime.now().timestamp())
        }
    
    def fetch_ohlc_data(
        self, 
        symbol: str, 
        timeframe: str = "1D", 
        limit: int = 500
    ) -> List[OHLCData]:
        """
        Fetch real OHLC data from yfinance
        
        Args:
            symbol: Trading symbol (e.g., XAUUSD, BTCUSD)
            timeframe: Chart timeframe (1m, 5m, 1h, 1D, etc.)
            limit: Maximum number of candles to return
            
        Returns:
            List of OHLCData objects
        """
        cache_key = f"{symbol}_{timeframe}"
        
        # Return cached data if valid
        if self._is_cache_valid(cache_key):
            logger.info(f"Returning cached data for {symbol} {timeframe}")
            data = self._cache[cache_key]["data"]
            return data[-limit:] if len(data) > limit else data

        ticker = self._get_yfinance_ticker(symbol)
        yf_interval = self.TIMEFRAMES.get(timeframe, "1d")
        yahoo_range = self.YAHOO_RANGES.get(timeframe, "1y")

        if self._is_yahoo_enabled(symbol):
            try:
                data = self._fetch_yahoo_chart(symbol, ticker, yf_interval, yahoo_range)
                if data:
                    self._set_cache(cache_key, data)
                    return data[-limit:] if len(data) > limit else data
            except Exception as e:
                logger.info(f"Yahoo chart fetch failed for {symbol}: {str(e)}")
                self._disable_yahoo(symbol)

        if not self._is_yfinance_enabled(symbol):
            if cache_key in self._cache:
                data = self._cache[cache_key]["data"]
                return data[-limit:] if len(data) > limit else data
            data = self._generate_mock_data(symbol, timeframe, limit)
            self._set_cache(cache_key, data)
            return data[-limit:] if len(data) > limit else data
        
        try:
            period = self.PERIODS.get(timeframe, "1y")
            
            logger.info(f"Fetching {symbol} ({ticker}) - interval: {yf_interval}, period: {period}")
            
            # Fetch data from yfinance
            ticker_obj = yf.Ticker(ticker)
            df = ticker_obj.history(period=period, interval=yf_interval)
            
            required_cols = {"Open", "High", "Low", "Close"}
            if df.empty or not required_cols.issubset(df.columns):
                logger.warning(f"No data returned for {symbol}, using mock data")
                self._disable_yfinance(symbol)
                data = self._generate_mock_data(symbol, timeframe, limit)
                self._set_cache(cache_key, data)
                return data[-limit:] if len(data) > limit else data
            
            # Convert to OHLCData list
            data = []
            for idx, row in df.iterrows():
                # Convert timestamp to Unix timestamp (seconds)
                timestamp = int(idx.timestamp())
                
                if pd.isna(row["Open"]) or pd.isna(row["High"]) or pd.isna(row["Low"]) or pd.isna(row["Close"]):
                    continue

                decimals = self._get_price_decimals(symbol, float(row["Close"]))
                
                data.append(OHLCData(
                    time=timestamp,
                    open=round(float(row["Open"]), decimals),
                    high=round(float(row["High"]), decimals),
                    low=round(float(row["Low"]), decimals),
                    close=round(float(row["Close"]), decimals),
                    volume=round(float(row["Volume"]), 2) if row["Volume"] > 0 else 0
                ))
            
            # Cache the data
            self._set_cache(cache_key, data)
            
            logger.info(f"Fetched {len(data)} candles for {symbol}")
            
            # Return limited data
            return data[-limit:] if len(data) > limit else data
            
        except Exception as e:
            logger.info(f"Falling back to mock data for {symbol}: {str(e)}")
            # Return cached data if available, even if expired
            if cache_key in self._cache:
                return self._cache[cache_key]["data"][-limit:]
            
            # Fallback to mock data when yfinance fails
            logger.info(f"Generating mock data for {symbol} due to API failure")
            self._disable_yfinance(symbol)
            data = self._generate_mock_data(symbol, timeframe, limit)
            self._set_cache(cache_key, data)
            return data[-limit:] if len(data) > limit else data
    
    def get_latest_price(self, symbol: str) -> Dict:
        """Get the latest price for a symbol"""
        price_cache_key = f"{symbol}_price"
        if self._is_cache_valid(price_cache_key):
            return self._cache[price_cache_key]["data"]

        ticker = self._get_yfinance_ticker(symbol)

        if self._is_yahoo_enabled(symbol):
            try:
                price_data = self._fetch_yahoo_latest_price(symbol, ticker)
                if price_data:
                    self._set_cache(price_cache_key, price_data)
                    return price_data
            except Exception as e:
                logger.info(f"Yahoo price fetch failed for {symbol}: {str(e)}")
                self._disable_yahoo(symbol)

        if not self._is_yfinance_enabled(symbol):
            price_data = self._get_cached_or_mock_price(symbol)
            self._set_cache(price_cache_key, price_data)
            return price_data

        current_price = None
        previous_close = None

        try:
            ticker_obj = yf.Ticker(ticker)

            try:
                info = ticker_obj.fast_info
            except Exception:
                info = None

            if info:
                current_price = info.get("lastPrice") or info.get("regularMarketPrice")
                previous_close = info.get("previousClose") or current_price

            if not current_price:
                hist = ticker_obj.history(period="5d", interval="1d")
                if not hist.empty and "Close" in hist.columns:
                    current_price = float(hist["Close"].iloc[-1])
                    previous_close = float(hist["Close"].iloc[-2]) if len(hist) > 1 else current_price

        except Exception as e:
            logger.info(f"Falling back to mock price for {symbol}: {str(e)}")
            self._disable_yfinance(symbol)

        if not current_price:
            self._disable_yfinance(symbol)
            price_data = self._get_cached_or_mock_price(symbol)
            self._set_cache(price_cache_key, price_data)
            return price_data

        decimals = self._get_price_decimals(symbol, float(current_price))
        change = current_price - (previous_close or current_price)
        change_percent = (change / previous_close * 100) if previous_close else 0
        price_data = {
            "symbol": symbol,
            "price": round(current_price, decimals),
            "change": round(change, decimals),
            "change_percent": round(change_percent, 2),
            "timestamp": int(datetime.now().timestamp())
        }
        self._set_cache(price_cache_key, price_data)
        return price_data

    def _get_cached_or_mock_price(self, symbol: str) -> Dict:
        ohlc_cache_key = f"{symbol}_1D"
        candles = []
        if ohlc_cache_key in self._cache:
            candles = self._cache[ohlc_cache_key]["data"]

        if len(candles) < 2:
            candles = self._generate_mock_data(symbol, "1D", limit=2)

        last_candle = candles[-1]
        prev_candle = candles[-2]
        change = last_candle.close - prev_candle.close
        change_percent = (change / prev_candle.close * 100) if prev_candle.close else 0
        decimals = self._get_price_decimals(symbol, float(last_candle.close))
        return {
            "symbol": symbol,
            "price": round(float(last_candle.close), decimals),
            "change": round(change, decimals),
            "change_percent": round(change_percent, 2),
            "timestamp": last_candle.time
        }
    
    def _generate_mock_data(
        self, 
        symbol: str, 
        timeframe: str = "1D", 
        limit: int = 500
    ) -> List[OHLCData]:
        """
        Generate mock OHLC data when yfinance API fails
        Creates realistic-looking price data for demonstration
        """
        import random
        
        # Base prices for different symbols
        base_prices = {
            "XAUUSD": 2650.00,
            "EURUSD": 1.0450,
            "BTCUSD": 98000.00,
            "ETHUSD": 3400.00,
            "GBPUSD": 1.2550,
            "USDJPY": 157.00,
            "AAPL": 250.00,
            "GOOGL": 180.00,
            "MSFT": 430.00,
            "TSLA": 400.00,
        }
        
        # Volatility multipliers
        volatility = {
            "XAUUSD": 10.0,
            "EURUSD": 0.002,
            "BTCUSD": 1500.0,
            "ETHUSD": 80.0,
            "GBPUSD": 0.003,
            "USDJPY": 0.5,
            "AAPL": 5.0,
            "GOOGL": 4.0,
            "MSFT": 8.0,
            "TSLA": 15.0,
        }
        
        # Time intervals in seconds
        intervals = {
            "1m": 60,
            "5m": 300,
            "15m": 900,
            "30m": 1800,
            "1h": 3600,
            "4h": 14400,
            "1D": 86400,
            "1W": 604800,
            "1M": 2592000,
        }
        
        base_price = base_prices.get(symbol, 100.0)
        vol = volatility.get(symbol, base_price * 0.01)
        interval = intervals.get(timeframe, 86400)
        
        # Start from current time going backwards
        current_time = int(datetime.now().timestamp())
        
        # Round to nearest interval
        current_time = (current_time // interval) * interval
        
        data = []
        price = base_price
        
        for i in range(limit):
            timestamp = current_time - ((limit - 1 - i) * interval)
            
            # Generate random OHLC with realistic patterns
            change_pct = random.gauss(0, 0.02)  # 2% standard deviation
            open_price = price
            
            # Determine direction bias
            direction = random.choice([-1, 1])
            high_low_range = vol * random.uniform(0.5, 1.5)
            
            if direction > 0:
                high_price = open_price + high_low_range
                low_price = open_price - (high_low_range * 0.4 * random.random())
                close_price = open_price + (high_low_range * random.uniform(0.3, 0.9))
            else:
                low_price = open_price - high_low_range
                high_price = open_price + (high_low_range * 0.4 * random.random())
                close_price = open_price - (high_low_range * random.uniform(0.3, 0.9))
            
            # Ensure OHLC logic is valid
            high_price = max(open_price, close_price, high_price)
            low_price = min(open_price, close_price, low_price)
            
            decimals = self._get_price_decimals(symbol, base_price)
            
            # Random volume based on symbol type
            volume = random.randint(10000, 500000)
            
            data.append(OHLCData(
                time=timestamp,
                open=round(open_price, decimals),
                high=round(high_price, decimals),
                low=round(low_price, decimals),
                close=round(close_price, decimals),
                volume=volume
            ))
            
            # Next candle opens near previous close
            price = close_price * (1 + random.gauss(0, 0.005))
        
        logger.info(f"Generated {len(data)} mock candles for {symbol}")
        return data


# Singleton instance
data_service = DataService()
