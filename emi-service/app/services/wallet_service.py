import httpx
from fastapi import HTTPException
from ..core.config import settings

async def _wallet_call(method: str, path: str, json: dict = None):
    """Internal M2M call to Wallet Service."""
    async with httpx.AsyncClient() as client:
        # Construct the URL properly, ensuring it handles paths correctly
        base_url = settings.WALLET_SERVICE_URL.rstrip('/')
        url = f"{base_url}{path}"
        
        headers = {"Authorization": f"Bearer {settings.INTERNAL_SERVICE_TOKEN}"}
        try:
            resp = await client.request(method, url, json=json, headers=headers)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Wallet service communication error: {str(e)}")

async def credit_wallet(customer_id: str | int, amount: float, description: str):
    return await _wallet_call("POST", "/internal/credit", json={
        "customer_id": str(customer_id),
        "amount": amount,
        "description": description
    })

async def debit_wallet(customer_id: str | int, amount: float, description: str):
    return await _wallet_call("POST", "/internal/debit", json={
        "customer_id": str(customer_id),
        "amount": amount,
        "description": description
    })
