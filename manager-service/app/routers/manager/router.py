"""
services/manager-service/app/routers/manager/router.py
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import io

from ...core.security import require_roles
from ...models.enums import Roles, LoanCollection
from .service import (
    get_loans_for_manager,
    list_pending_signature_verifications,
    list_verification_team,
    assign_verification,
    manager_approve_or_reject,
    manager_forward_to_admin,
    manager_verify_signed_sanction,
    find_loan_any,
    get_document_binary,
    compute_customer_eligibility,
)

router = APIRouter(prefix="", tags=["manager"])


# ── Pydantic models ───────────────────────────────────────────────────────────

class SignatureVerifyPayload(BaseModel):
    approve: bool
    remarks: Optional[str] = None


class ForwardToAdminPayload(BaseModel):
    recommendation: Optional[str] = None
    remarks: Optional[str] = None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/loans")
async def list_loans(user=Depends(require_roles(Roles.MANAGER))):
    return await get_loans_for_manager()


@router.get("/verification-team")
async def get_verification_team(active_only: bool = True, user=Depends(require_roles(Roles.MANAGER))):
    return await list_verification_team(active_only=active_only)


@router.put("/assign-verification/{loan_collection}/{loan_id}/{verification_id}")
async def assign_verification_route(
    loan_collection: LoanCollection,
    loan_id: str,
    verification_id: str,
    user=Depends(require_roles(Roles.MANAGER)),
):
    return await assign_verification(loan_collection.value, loan_id, verification_id, user["_id"])


@router.put("/approve/{loan_collection}/{loan_id}")
async def approve_route(
    loan_collection: LoanCollection,
    loan_id: str,
    user=Depends(require_roles(Roles.MANAGER)),
):
    return await manager_approve_or_reject(loan_collection.value, loan_id, user["_id"], True)


@router.put("/reject/{loan_collection}/{loan_id}")
async def reject_route(
    loan_collection: LoanCollection,
    loan_id: str,
    user=Depends(require_roles(Roles.MANAGER)),
):
    return await manager_approve_or_reject(loan_collection.value, loan_id, user["_id"], False)


@router.get("/sanction-letters/pending-verification")
async def pending_signature_verifications(user=Depends(require_roles(Roles.MANAGER))):
    return await list_pending_signature_verifications()


@router.post("/sanction-letters/{loan_id}/verify-signature")
async def verify_signature_route(
    loan_id: str,
    payload: SignatureVerifyPayload,
    user=Depends(require_roles(Roles.MANAGER)),
):
    return await manager_verify_signed_sanction(loan_id, user["_id"], payload.approve, payload.remarks)


@router.get("/loans/{loan_id}/sanction-letter")
async def download_sanction_letter_for_manager(
    loan_id: str,
    user=Depends(require_roles(Roles.MANAGER)),
):
    loan_collection, loan = await find_loan_any(loan_id)
    if not loan_collection or not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    doc_id = loan.get("sanction_letter_document_id")
    if not doc_id:
        raise HTTPException(status_code=404, detail="Sanction letter not generated yet")
    doc = await get_document_binary(str(doc_id))
    return StreamingResponse(
        io.BytesIO(doc["data"]),
        media_type=doc["content_type"],
        headers={"Content-Disposition": f'inline; filename="sanction_letter_{loan_id}.pdf"'},
    )


@router.get("/loans/{loan_id}/signed-sanction-letter")
async def download_signed_sanction_letter_for_manager(
    loan_id: str,
    user=Depends(require_roles(Roles.MANAGER)),
):
    loan_collection, loan = await find_loan_any(loan_id)
    if not loan_collection or not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    doc_id = loan.get("signed_sanction_letter_document_id")
    if not doc_id:
        raise HTTPException(status_code=404, detail="Signed sanction letter not uploaded yet")
    doc = await get_document_binary(str(doc_id))
    return StreamingResponse(
        io.BytesIO(doc["data"]),
        media_type=doc["content_type"],
        headers={"Content-Disposition": f'inline; filename="signed_sanction_{loan_id}.pdf"'},
    )


@router.post("/loans/{loan_id}/forward-to-admin")
async def forward_to_admin_route(
    loan_id: str,
    payload: ForwardToAdminPayload,
    user=Depends(require_roles(Roles.MANAGER)),
):
    loan_collection, loan = await find_loan_any(loan_id)
    if not loan_collection or not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    return await manager_forward_to_admin(
        loan_collection,
        loan_id,
        user["_id"],
        payload.recommendation,
        payload.remarks,
    )


@router.get("/customer/{customer_id}/eligibility")
async def customer_eligibility(
    customer_id: str,
    user=Depends(require_roles(Roles.MANAGER)),
):
    return await compute_customer_eligibility(customer_id)