
from fastapi import APIRouter, Depends
from ...core.security import require_roles
from ...models.enums import Roles
from .service import list_transactions

router = APIRouter(prefix="", tags=["transactions"])

@router.get('/')
async def list_txn(user=Depends(require_roles(Roles.CUSTOMER))):
    cid = user.get("customer_id") or user.get("_id")
    return await list_transactions(cid)


from datetime import datetime
from ...models.enums import LoanStatus
from .service import get_db

@router.post('/_run-emi-penalty-scan', tags=["maintenance"])
async def run_emi_penalty_scan(user=Depends(require_roles(Roles.ADMIN))):
    """Scan ACTIVE loans with next_emi_date in past and penalize CIBIL (-5, min 300)."""
    db = await get_db()
    now = datetime.utcnow()
    penalized = 0
    for coll_name in ['personal_loans', 'vehicle_loans', 'education_loans', 'home_loans']:
        loans = await db[coll_name].find({"status": LoanStatus.ACTIVE, "next_emi_date": {"$lt": now}}).to_list(length=1000)
        for loan in loans:
            kyc = await db.kyc_details.find_one({"customer_id": loan['customer_id']})
            if kyc:
                new_cibil = max(300, int(kyc.get('cibil_score', 0)) - 5)
                await db.kyc_details.update_one({"_id": kyc['_id']}, {"$set": {"cibil_score": new_cibil}})
            # push due to next cycle to avoid repeated penalty until next scan
            await db[coll_name].update_one({"_id": loan['_id']}, {"$set": {"next_emi_date": now}})
            penalized += 1
    return {"penalized": penalized}




