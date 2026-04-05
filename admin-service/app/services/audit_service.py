from __future__ import annotations

from datetime import datetime
from typing import Any

from ..database.mongo import get_db


async def write_audit_log(
    *,
    action: str,
    actor_role: str | None = None,
    actor_id: str | int | None = None,
    entity_type: str | None = None,
    entity_id: str | int | None = None,
    details: dict | None = None,
):
    """Append-only audit logging.

    This is best-effort and intentionally exposes no update/delete operations.
    """
    try:
        db = await get_db()
        doc = {
            "action": action,
            "actor_role": actor_role,
            "actor_id": str(actor_id) if actor_id is not None else None,
            "entity_type": entity_type,
            "entity_id": str(entity_id) if entity_id is not None else None,
            "details": details or {},
            "created_at": datetime.utcnow(),
        }
        await db.audit_logs.insert_one(doc)
    except Exception:
        # Audit logging must never block core business flows.
        return


async def list_audit_logs(
    *,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    actor_id: str | None = None,
    action: str | None = None,
    entity_id: str | None = None,
    limit: int = 200,
    next_cursor: str | None = None,
):
    db = await get_db()

    filt: dict = {}
    if date_from or date_to:
        filt["created_at"] = {}
        if date_from:
            filt["created_at"]["$gte"] = date_from
        if date_to:
            filt["created_at"]["$lte"] = date_to

    if actor_id:
        filt["actor_id"] = str(actor_id)
    if action:
        filt["action"] = action
    if entity_id:
        filt["entity_id"] = str(entity_id)

    safe_limit = max(1, min(int(limit or 200), 1000))
    # support cursor-based pagination. cursor is base64(json({"created_at":iso,"_id":id}))
    import base64, json
    from ..utils.serializers import normalize_doc

    if next_cursor:
        try:
            raw = base64.b64decode(next_cursor.encode()).decode()
            cur = json.loads(raw)
            cur_dt = datetime.fromisoformat(cur.get("created_at")) if cur.get("created_at") else None
            cur_id = cur.get("_id")
            if cur_dt and cur_id:
                # for descending sort: created_at < cur_dt OR (created_at == cur_dt AND _id < cur_id)
                filt["$or"] = [
                    {"created_at": {"$lt": cur_dt}},
                    {"created_at": cur_dt, "_id": {"$lt": cur_id}},
                ]
        except Exception:
            # ignore invalid cursor
            next_cursor = None

    logs = (
        await db.audit_logs.find(filt)
        .sort([("created_at", -1), ("_id", -1)])
        .to_list(length=safe_limit)
    )

    norm = [normalize_doc(l) for l in logs]
    out: dict[str, Any] = {"items": norm}
    if len(norm) == safe_limit:
        last = norm[-1]
        try:
            token = base64.b64encode(json.dumps({"created_at": last.get("created_at"), "_id": last.get("_id")}).encode()).decode()
            out["next_cursor"] = token
        except Exception:
            pass
    return out
