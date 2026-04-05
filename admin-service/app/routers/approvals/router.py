"""
services/admin-service/app/routers/approvals/router.py
"""
import io
import os
from datetime import datetime
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import simpleSplit
from reportlab.pdfgen import canvas

from app.core.security import require_roles
from app.database.mongo import get_db
from app.models.enums import LoanCollection, LoanStatus, Roles
from app.schemas.settings import SystemSettingsUpdate
from app.routers.schemas import AdminApprovePayload, AdminRejectPayload
from app.services.admin_service import (
    find_loan_any,
    get_admin_approvals_dashboard,
    list_high_value_pending,
    list_pending_admin_approvals,
    list_ready_for_disbursement,
    ADMIN_QUEUE_STATUSES,
)
from app.services.settings_service import get_settings, update_settings
from app.utils.id import loan_id_filter
from app.utils.serializers import normalize_doc

router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _mask_pan(value: str | None) -> str | None:
    pan = str(value or "").strip().upper()
    if not pan:
        return None
    if len(pan) != 10:
        return pan
    return f"{pan[:2]}******{pan[-2:]}"


def _sanitize_loan_doc(doc: dict) -> dict:
    out = normalize_doc(doc)
    if not out.get("pan_masked"):
        out["pan_masked"] = _mask_pan(out.get("pan_number"))
    if not out.get("guarantor_pan_masked"):
        out["guarantor_pan_masked"] = _mask_pan(out.get("guarantor_pan"))
    out.pop("pan_number", None)
    out.pop("guarantor_pan", None)
    out.pop("pan_hash", None)
    out.pop("guarantor_pan_hash", None)
    return out


async def get_document_binary(doc_id: str):
    return {"data": b"", "content_type": "application/octet-stream", "filename": "placeholder.bin"}


async def _find_in_collection(db, collection_name: str, loan_id: str):
    filt = loan_id_filter(loan_id)
    loan = await db[collection_name].find_one(filt)
    if not loan:
        try:
            loan = await db[collection_name].find_one({"loan_id": int(loan_id)})
        except (ValueError, TypeError):
            pass
    return loan


# ── Sanction Letter PDF Generator ─────────────────────────────────────────────

def _fmt_money(value) -> str:
    try:
        return f"{float(value or 0):,.2f}"
    except Exception:
        return "0.00"


def _build_sanction_letter_pdf(loan: dict, collection_name: str) -> bytes:
    """Generate a sanction letter PDF for the given loan."""
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    left = 54
    right = width - 54
    max_w = right - left
    y = height - 56

    def ensure_space(min_y: int = 72):
        nonlocal y
        if y <= min_y:
            c.showPage()
            y = height - 56

    def draw_line(text: str, *, bold: bool = False, size: int = 10, gap_after: int = 4):
        nonlocal y
        ensure_space()
        c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
        c.drawString(left, y, str(text))
        y -= (size + gap_after)

    def draw_para(text: str, *, bold: bool = False, size: int = 10, gap_after: int = 8):
        nonlocal y
        c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
        lines = simpleSplit(str(text), "Helvetica-Bold" if bold else "Helvetica", size, max_w)
        for ln in lines:
            ensure_space()
            c.drawString(left, y, ln)
            y -= (size + 3)
        y -= gap_after

    # Extract loan fields
    customer_name = loan.get("full_name") or "Customer"
    loan_id = loan.get("loan_id") or "-"
    loan_type = collection_name.replace("_loans", "").capitalize()
    loan_amount = _fmt_money(loan.get("approved_amount") or loan.get("loan_amount"))
    interest_rate = loan.get("interest_rate", 12.0)
    tenure = loan.get("tenure_months", 0)
    emi = _fmt_money(loan.get("emi_per_month"))
    issue_date = datetime.utcnow().strftime("%d/%m/%Y")
    bank_name = "PayCrest"
    purpose = loan.get("purpose") or loan.get("loan_purpose") or f"{loan_type} Loan"
    address = loan.get("address") or loan.get("property_address") or "Address on record"
    pan_masked = loan.get("pan_masked") or _mask_pan(loan.get("pan_number")) or "XXXXX0000X"

    # Header
    draw_line(f"{bank_name.upper()} FINANCIAL SERVICES", bold=True, size=13, gap_after=4)
    draw_line("LOAN SANCTION LETTER", bold=True, size=12, gap_after=10)
    draw_line(f"Date: {issue_date}", size=10, gap_after=2)
    draw_line(f"Loan Reference No: {loan_id}", size=10, gap_after=10)

    # Addressee
    draw_line("To,", size=10, gap_after=2)
    draw_line(f"Mr./Ms. {customer_name}", size=10, gap_after=2)
    draw_para(str(address), size=10, gap_after=10)

    draw_para(
        f"Subject: Sanction of {loan_type} Loan — Loan Account No. {loan_id}",
        bold=True, size=10, gap_after=8,
    )
    draw_line(f"Dear Mr./Ms. {customer_name},", size=10, gap_after=8)

    draw_para(
        f"We are pleased to inform you that your application for a {loan_type} Loan has been reviewed "
        f"and sanctioned by {bank_name} Financial Services subject to the terms and conditions mentioned below.",
        size=10,
    )

    # Loan details table
    draw_line("SANCTIONED LOAN DETAILS", bold=True, size=11, gap_after=6)

    details = [
        ("Loan Type", f"{loan_type} Loan"),
        ("Sanctioned Loan Amount", f"INR {loan_amount}"),
        ("Rate of Interest (p.a.)", f"{interest_rate}%"),
        ("Loan Tenure", f"{tenure} months"),
        ("EMI Amount", f"INR {emi} per month"),
        ("Purpose of Loan", str(purpose)),
        ("Applicant PAN", str(pan_masked)),
    ]
    for label, value in details:
        ensure_space()
        c.setFont("Helvetica-Bold", 10)
        c.drawString(left, y, f"{label}:")
        c.setFont("Helvetica", 10)
        c.drawString(left + 180, y, str(value))
        y -= 14

    y -= 8

    # Terms
    draw_line("TERMS AND CONDITIONS", bold=True, size=11, gap_after=6)
    terms = [
        "1. This sanction is valid for 30 days from the date of this letter.",
        "2. The loan will be disbursed only after receipt of all required original documents.",
        "3. The loan is subject to satisfactory legal and technical verification where applicable.",
        "4. Interest will be calculated on a monthly reducing balance basis.",
        "5. Prepayment charges may apply as per the schedule of charges.",
        "6. The borrower must maintain adequate balance in the registered bank account on EMI due dates.",
        "7. Any default in repayment will attract penal interest and may affect the borrower's credit score.",
        "8. The bank reserves the right to recall the loan in case of misrepresentation of facts.",
    ]
    for term in terms:
        draw_para(term, size=9, gap_after=3)

    y -= 6
    draw_para(
        "Please sign and return the duplicate copy of this letter as a token of acceptance of the "
        "above terms and conditions within 7 days from the date of this letter.",
        size=10,
    )

    draw_para(
        f"We thank you for choosing {bank_name} and look forward to a long and mutually beneficial relationship.",
        size=10,
    )

    y -= 6
    draw_line(f"For {bank_name} Financial Services", bold=True, size=10, gap_after=8)
    draw_line("Authorized Signatory", size=10, gap_after=2)
    draw_line("Name: _______________________", size=10, gap_after=2)
    draw_line("Designation: __________________", size=10, gap_after=2)
    draw_line("Date: ________________________", size=10, gap_after=2)
    draw_line("(Official Seal)", size=10, gap_after=16)

    draw_line("─" * 80, size=8, gap_after=4)
    draw_line("BORROWER'S ACCEPTANCE", bold=True, size=10, gap_after=6)
    draw_para(
        f"I/We, {customer_name}, hereby accept the sanction of the loan on the terms and conditions "
        "stated above and agree to abide by the same.",
        size=10,
    )
    draw_line("Signature: ___________________", size=10, gap_after=2)
    draw_line("Date: ________________________", size=10, gap_after=2)

    c.save()
    return buffer.getvalue()


async def _store_sanction_document(
    customer_id,
    loan_id,
    pdf_bytes: bytes,
) -> str:
    """Store generated sanction letter PDF in MongoDB documents collection."""
    db = await get_db()
    doc = {
        "customer_id": customer_id,
        "filename": f"sanction_letter_{loan_id}.pdf",
        "doc_type": "sanction_letter",
        "content_type": "application/pdf",
        "data": pdf_bytes,
        "size": len(pdf_bytes),
        "metadata": {"loan_id": loan_id},
        "created_at": datetime.utcnow(),
    }
    result = await db.documents.insert_one(doc)
    return str(result.inserted_id)


# ── Loan action helpers ────────────────────────────────────────────────────────

async def _admin_approve(collection_name, loan_id, admin_id, approved_amount=None, interest_rate=None):
    db = await get_db()
    loan = await _find_in_collection(db, collection_name, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    update = {
        "status": LoanStatus.ADMIN_APPROVED,
        "admin_id": str(admin_id),
        "approved_at": datetime.utcnow(),
    }
    if approved_amount is not None:
        update["approved_amount"] = float(approved_amount)
    if interest_rate is not None:
        update["interest_rate"] = float(interest_rate)
    await db[collection_name].update_one({"_id": loan["_id"]}, {"$set": update})
    return normalize_doc(await db[collection_name].find_one({"_id": loan["_id"]}))


async def _admin_reject(collection_name, loan_id, admin_id, reason: str):
    db = await get_db()
    loan = await _find_in_collection(db, collection_name, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    await db[collection_name].update_one(
        {"_id": loan["_id"]},
        {"$set": {
            "status": LoanStatus.REJECTED,
            "admin_id": str(admin_id),
            "rejection_reason": reason,
            "rejected_at": datetime.utcnow(),
        }},
    )
    return normalize_doc(await db[collection_name].find_one({"_id": loan["_id"]}))


async def _send_sanction(collection_name, loan_id, admin_id):
    db = await get_db()
    loan = await _find_in_collection(db, collection_name, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    actual_loan_id = loan.get("loan_id")
    customer_id = loan.get("customer_id")

    # Check if sanction letter already exists for this loan
    existing = await db.documents.find_one({
        "doc_type": "sanction_letter",
        "metadata.loan_id": actual_loan_id,
    })

    if not existing:
        # Generate sanction letter PDF
        try:
            pdf_bytes = _build_sanction_letter_pdf(loan, collection_name)
            document_id = await _store_sanction_document(customer_id, actual_loan_id, pdf_bytes)
        except Exception as e:
            print(f"[ADMIN] Sanction letter PDF generation failed for loan {actual_loan_id}: {e}")
            document_id = None
    else:
        document_id = str(existing["_id"])

    # Update loan status to SANCTION_SENT and store document_id reference
    update_fields = {
        "status": LoanStatus.SANCTION_SENT,
        "admin_id": str(admin_id),
        "sanction_sent_at": datetime.utcnow(),
    }
    if document_id:
        update_fields["sanction_document_id"] = document_id

    await db[collection_name].update_one(
        {"_id": loan["_id"]},
        {"$set": update_fields},
    )

    # Notify customer
    try:
        await db.notifications.insert_one({
            "customer_id": customer_id,
            "title": "Sanction Letter Ready",
            "message": f"Your sanction letter for loan {actual_loan_id} is ready. Please review and sign.",
            "kind": "success",
            "read": False,
            "meta": {"loan_id": actual_loan_id, "document_type": "sanction_letter"},
            "created_at": datetime.utcnow(),
        })
    except Exception:
        pass

    return normalize_doc(await db[collection_name].find_one({"_id": loan["_id"]}))


async def _mark_signed(collection_name, loan_id, admin_id):
    db = await get_db()
    loan = await _find_in_collection(db, collection_name, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    await db[collection_name].update_one(
        {"_id": loan["_id"]},
        {"$set": {
            "status": LoanStatus.SIGNED_RECEIVED,
            "admin_id": str(admin_id),
            "signed_received_at": datetime.utcnow(),
        }},
    )
    return normalize_doc(await db[collection_name].find_one({"_id": loan["_id"]}))


async def _disburse(collection_name, loan_id, admin_id):
    db = await get_db()
    loan = await _find_in_collection(db, collection_name, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    await db[collection_name].update_one(
        {"_id": loan["_id"]},
        {"$set": {
            "status": LoanStatus.ACTIVE,
            "admin_id": str(admin_id),
            "disbursed_at": datetime.utcnow(),
        }},
    )
    return normalize_doc(await db[collection_name].find_one({"_id": loan["_id"]}))


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/pending-approvals")
async def pending(user=Depends(require_roles(Roles.ADMIN))):
    return await list_pending_admin_approvals()


@router.get("/approvals-dashboard")
async def approvals_dashboard(days: int = 30, user=Depends(require_roles(Roles.ADMIN))):
    return await get_admin_approvals_dashboard(days=days)


@router.get("/dashboard")
async def dashboard(user=Depends(require_roles(Roles.ADMIN))):
    db = await get_db()
    pending_count = 0
    ready_count = 0
    active_count = 0
    for col in ["personal_loans", "vehicle_loans", "education_loans", "home_loans"]:
        pending_count += await db[col].count_documents({
            "status": {"$in": ADMIN_QUEUE_STATUSES},
            "loan_amount": {"$gt": 1500000},
        })
        ready_count += await db[col].count_documents({"status": LoanStatus.READY_FOR_DISBURSEMENT})
        active_count += await db[col].count_documents({"status": LoanStatus.ACTIVE})
    from datetime import timedelta
    now = datetime.utcnow()
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    disb_today = await db.transactions.find(
        {"type": "disbursement", "created_at": {"$gte": day_start, "$lt": day_start + timedelta(days=1)}}
    ).to_list(length=5000)
    db_ping = True
    try:
        await db.command("ping")
    except Exception:
        db_ping = False
    return {
        "high_value_pending": pending_count,
        "ready_for_disbursement": ready_count,
        "active_loans": active_count,
        "total_disbursements_today": len(disb_today),
        "total_disbursed_amount_today": float(sum(float(t.get("amount") or 0) for t in disb_today)),
        "system_health": {"db_ping": db_ping},
    }


@router.get("/loans/high-value-pending")
async def high_value_pending(user=Depends(require_roles(Roles.ADMIN))):
    return await list_high_value_pending()


@router.get("/loans/ready-for-disbursement")
async def ready_for_disbursement_queue(user=Depends(require_roles(Roles.ADMIN))):
    return await list_ready_for_disbursement()


@router.get("/loans/{loan_id}/review")
async def review_any_loan(loan_id: str, user=Depends(require_roles(Roles.ADMIN))):
    loan_collection, loan = await find_loan_any(loan_id)
    if not loan_collection or not loan:
        return {"error": "Loan not found"}
    return _sanitize_loan_doc(loan)


@router.get("/loans/{loan_id}/documents/{doc_type}")
async def download_loan_document_for_admin(loan_id: str, doc_type: str, user=Depends(require_roles(Roles.ADMIN))):
    loan_collection, loan = await find_loan_any(loan_id)
    if not loan_collection or not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    field_map = {
        "pay_slip": "pay_slip",
        "vehicle_price_doc": "vehicle_price_doc",
        "home_property_doc": "home_property_doc",
        "fees_structure": "fees_structure",
        "bonafide_certificate": "bonafide_certificate",
        "collateral_doc": "collateral_doc",
    }
    field = field_map.get(doc_type)
    if not field:
        raise HTTPException(status_code=400, detail="Unsupported document type")
    raw_value = loan.get(field)
    if not raw_value:
        raise HTTPException(status_code=404, detail="Document not uploaded")
    if isinstance(raw_value, str) and (
        raw_value.startswith("http://") or
        raw_value.startswith("https://") or
        raw_value.startswith("/")
    ):
        raise HTTPException(status_code=404, detail="Document binary not available")
    doc = await get_document_binary(str(raw_value))
    return StreamingResponse(
        io.BytesIO(doc["data"]),
        media_type=doc["content_type"],
        headers={"Content-Disposition": f'inline; filename="{doc["filename"]}"'},
    )


@router.post("/loans/{loan_id}/approve")
async def approve_high_value(
    loan_id: str,
    payload: AdminApprovePayload | None = None,
    user=Depends(require_roles(Roles.ADMIN)),
):
    loan_collection, loan = await find_loan_any(loan_id)
    if not loan_collection or not loan:
        return {"error": "Loan not found"}
    return await _admin_approve(
        loan_collection, loan_id, user["_id"],
        approved_amount=payload.approved_amount if payload else None,
        interest_rate=payload.interest_rate if payload else None,
    )


@router.post("/loans/{loan_id}/reject")
async def reject_high_value(
    loan_id: str,
    payload: AdminRejectPayload,
    user=Depends(require_roles(Roles.ADMIN)),
):
    loan_collection, loan = await find_loan_any(loan_id)
    if not loan_collection or not loan:
        return {"error": "Loan not found"}
    return await _admin_reject(loan_collection, loan_id, user["_id"], payload.reason)


@router.post("/loans/{loan_id}/sanction-letter/generate")
async def generate_sanction_letter(loan_id: str, user=Depends(require_roles(Roles.ADMIN))):
    loan_collection, loan = await find_loan_any(loan_id)
    if not loan_collection or not loan:
        return {"error": "Loan not found"}
    res = await _send_sanction(loan_collection, loan_id, user["_id"])
    return {**res, "download_url": f"/api/customer/loans/{loan.get('loan_id')}/sanction-letter"}


@router.post("/loans/{loan_id}/disburse")
async def disburse_any(loan_id: str, user=Depends(require_roles(Roles.ADMIN))):
    loan_collection, loan = await find_loan_any(loan_id)
    if not loan_collection or not loan:
        return {"error": "Loan not found"}
    return await _disburse(loan_collection, loan_id, user["_id"])


@router.put("/approve/{loan_collection}/{loan_id}")
async def approve_route(
    loan_collection: LoanCollection,
    loan_id: str,
    payload: AdminApprovePayload | None = None,
    user=Depends(require_roles(Roles.ADMIN)),
):
    return await _admin_approve(
        loan_collection.value, loan_id, user["_id"],
        approved_amount=payload.approved_amount if payload else None,
        interest_rate=payload.interest_rate if payload else None,
    )


@router.put("/sanction/{loan_collection}/{loan_id}")
async def sanction_route(
    loan_collection: LoanCollection,
    loan_id: str,
    user=Depends(require_roles(Roles.ADMIN)),
):
    return await _send_sanction(loan_collection.value, loan_id, user["_id"])


@router.put("/signed/{loan_collection}/{loan_id}")
async def signed_route(
    loan_collection: LoanCollection,
    loan_id: str,
    user=Depends(require_roles(Roles.ADMIN)),
):
    return await _mark_signed(loan_collection.value, loan_id, user["_id"])


@router.put("/disburse/{loan_collection}/{loan_id}")
async def disburse_route(
    loan_collection: LoanCollection,
    loan_id: str,
    user=Depends(require_roles(Roles.ADMIN)),
):
    return await _disburse(loan_collection.value, loan_id, user["_id"])


@router.put("/settings")
async def settings_update(payload: SystemSettingsUpdate, user=Depends(require_roles(Roles.ADMIN))):
    return await update_settings(user["_id"], payload.dict())


@router.get("/settings")
async def settings_get(user=Depends(require_roles(Roles.ADMIN))):
    return await get_settings()


@router.get("/loan/{loan_collection}/{loan_id}")
async def get_loan(
    loan_collection: LoanCollection,
    loan_id: str,
    user=Depends(require_roles(Roles.ADMIN)),
):
    db = await get_db()
    loan = await db[loan_collection.value].find_one(loan_id_filter(loan_id))
    if not loan:
        return {"error": "Loan not found"}
    return _sanitize_loan_doc(loan)