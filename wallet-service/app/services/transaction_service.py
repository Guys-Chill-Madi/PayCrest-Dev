
from ..database.mongo import get_db

async def list_transactions(customer_id: str):
    db = await get_db()
    txns = await db.transactions.find({"customer_id": customer_id}).sort("created_at", -1).to_list(length=200)
    out = []
    for t in txns:
        # Some parts of the codebase use different timestamp fields
        ts = t.get("created_at") or t.get("initiated_at") or t.get("completed_at") or t.get("updated_at")
        created_iso = ts.isoformat() if ts is not None else None

        out.append({
            "id": str(t["_id"]),
            "loan_id": t.get("loan_id"),
            "loan_type": t.get("loan_type"),
            "type": t.get("type"),
            "amount": float(t.get("amount", 0)),
            "balance_after": float(t.get("balance_after", 0)),
            "created_at": created_iso,
        })
    return out
