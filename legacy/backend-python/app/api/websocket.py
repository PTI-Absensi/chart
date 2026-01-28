"""
Trading Chart Application - WebSocket Handler
Real-time price updates
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict
import asyncio
import json
from ..services.data_service import data_service

router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.subscriptions: Dict[WebSocket, List[str]] = {}
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.subscriptions[websocket] = []
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.subscriptions:
            del self.subscriptions[websocket]
    
    def subscribe(self, websocket: WebSocket, symbol: str):
        if websocket in self.subscriptions:
            if symbol not in self.subscriptions[websocket]:
                self.subscriptions[websocket].append(symbol)
    
    def unsubscribe(self, websocket: WebSocket, symbol: str):
        if websocket in self.subscriptions:
            if symbol in self.subscriptions[websocket]:
                self.subscriptions[websocket].remove(symbol)
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)
    
    async def broadcast_price(self, symbol: str, price_data: dict):
        for connection, symbols in self.subscriptions.items():
            if symbol in symbols:
                try:
                    await connection.send_json({
                        "type": "price_update",
                        "data": price_data
                    })
                except Exception:
                    pass


manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time price updates
    
    Client can send:
    - {"action": "subscribe", "symbol": "XAUUSD"}
    - {"action": "unsubscribe", "symbol": "XAUUSD"}
    """
    await manager.connect(websocket)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                action = message.get("action")
                symbol = message.get("symbol", "").upper()
                
                if action == "subscribe" and symbol:
                    manager.subscribe(websocket, symbol)
                    await manager.send_personal_message({
                        "type": "subscribed",
                        "symbol": symbol,
                        "message": f"Subscribed to {symbol}"
                    }, websocket)
                    
                    # Send initial price
                    price_data = await asyncio.to_thread(data_service.get_latest_price, symbol)
                    await manager.send_personal_message({
                        "type": "price_update",
                        "data": price_data
                    }, websocket)
                
                elif action == "unsubscribe" and symbol:
                    manager.unsubscribe(websocket, symbol)
                    await manager.send_personal_message({
                        "type": "unsubscribed",
                        "symbol": symbol,
                        "message": f"Unsubscribed from {symbol}"
                    }, websocket)
                
            except json.JSONDecodeError:
                await manager.send_personal_message({
                    "type": "error",
                    "message": "Invalid JSON format"
                }, websocket)
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)


async def price_broadcaster():
    """
    Background task to broadcast price updates
    Simulates real-time price movements
    """
    symbols = [s.symbol for s in data_service.get_symbols()]
    
    while True:
        await asyncio.sleep(2)  # Update every 2 seconds
        
        for symbol in symbols:
            price_data = await asyncio.to_thread(data_service.get_latest_price, symbol)
            # Send latest value without simulated movement
            await manager.broadcast_price(symbol, price_data)
