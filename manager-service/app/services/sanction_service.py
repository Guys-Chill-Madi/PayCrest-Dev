from __future__ import annotations

from datetime import datetime
from io import BytesIO

from bson import Binary
from reportlab.lib.colors import black
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import simpleSplit
from reportlab.pdfgen import canvas

from ..database.mongo import get_db


def build_sanction_letter_pdf_bytes(payload: dict) -> bytes:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    left = 56
    right = width - 56
    top = height - 52
    bottom = 52
    usable_width = right - left
    y = top

    def _to_dt(value):
        if isinstance(value, datetime):
            return value
        if value is None:
            return None
        try:
            text = str(value).strip()
            if not text:
                return None
            return datetime.fromisoformat(text.replace("Z", "+00:00"))
        except Exception:
            return None

    def _fmt_date_ddmmyyyy(value) -> str:
        dt = _to_dt(value)
        if dt:
            return dt.strftime("%d/%m/%Y")
        return "[DD/MM/YYYY]"

    def _fmt_money_inr(value) -> str:
        try:
            n = float(value)
            return f"{n:,.2f}"
        except Exception:
            return "[Amount]"

    def _fmt_rate(value) -> str:
        try:
            n = float(value)
            return f"{n:.2f}% per annum"
        except Exception:
            return "[X% per annum]"

    def _fmt_text(value, fallback: str) -> str:
        text = str(value).strip() if value is not None else ""
        return text if text else fallback

    def _next_page():
        nonlocal y
        c.showPage()
        c.setFillColor(black)
        y = top

    def _ensure_space(lines_count: int, leading: int = 14):
        nonlocal y
        required = max(1, lines_count) * leading
        if y - required < bottom:
            _next_page()

    def draw_wrapped(text: str, *, font_name: str = "Helvetica", font_size: int = 10, leading: int = 14, gap_after: int = 4):
        nonlocal y
        lines = simpleSplit(text, font_name, font_size, usable_width)
        _ensure_space(len(lines), leading)
        c.setFont(font_name, font_size)
        for line in lines:
            c.drawString(left, y, line)
            y -= leading
        y -= gap_after

    issue_date = _fmt_date_ddmmyyyy(payload.get("issue_date") or payload.get("generated_at"))
    sanction_reference_number = _fmt_text(payload.get("sanction_reference_number"), f"SL-{_fmt_text(payload.get('loan_id'), 'NA')}")
    customer_full_name = _fmt_text(payload.get("full_name"), "[Customer Full Name]")
    address_line_1 = _fmt_text(payload.get("address_line_1"), "[Address Line 1, Address Line 2]")
    city = _fmt_text(payload.get("city"), "[City]")
    state = _fmt_text(payload.get("state"), "[State]")
    pin_code = _fmt_text(payload.get("pin_code"), "[PIN Code]")
    mobile_number = _fmt_text(payload.get("mobile_number"), "[Mobile Number]")
    email_id = _fmt_text(payload.get("email"), "[Email ID]")
    customer_name = _fmt_text(payload.get("customer_name"), customer_full_name)
    loan_type = _fmt_text(payload.get("loan_type"), "[Loan Type - Personal / Education / Vehicle / Home / Business]")
    approved_amount = _fmt_money_inr(payload.get("approved_amount"))
    loan_account_number = _fmt_text(payload.get("loan_account_number"), _fmt_text(payload.get("loan_id"), "[Loan Account Number]"))
    loan_purpose = _fmt_text(payload.get("loan_purpose"), "[Loan Purpose]")
    interest_rate = _fmt_rate(payload.get("interest_rate"))
    interest_basis = _fmt_text(payload.get("interest_rate_basis"), "[fixed/floating]")
    tenure_text = _fmt_text(payload.get("tenure_text"), _fmt_text(payload.get("tenure_months"), "[XX months/years]"))
    emi_amount = _fmt_money_inr(payload.get("emi_per_month"))
    emi_start_dt = payload.get("emi_start_date")
    emi_start_date = _fmt_date_ddmmyyyy(emi_start_dt) if emi_start_dt else "[EMI Start Date]"
    repayment_mode = _fmt_text(payload.get("repayment_mode"), "[Auto Debit/NACH/UPI/Bank Mandate/Online Transfer]")
    disbursement_mode = _fmt_text(payload.get("disbursement_mode"), "[Bank Transfer/Cheque/Demand Draft]")
    validity_days = _fmt_text(payload.get("validity_days"), "[X days]")
    lender_name = _fmt_text(payload.get("lender_name"), "[Lender / Bank / NBFC Name]")

    c.setFont("Helvetica-Bold", 14)
    c.drawString(left, y, "LOAN SANCTION LETTER")
    y -= 20

    draw_wrapped(f"Date: {issue_date}", font_name="Helvetica", font_size=10, leading=13, gap_after=2)
    draw_wrapped(f"Sanction Reference Number: {sanction_reference_number}", font_name="Helvetica", font_size=10, leading=13, gap_after=12)

    draw_wrapped("To", font_name="Helvetica", font_size=10, leading=13, gap_after=0)
    draw_wrapped(customer_full_name, font_name="Helvetica", font_size=10, leading=13, gap_after=0)
    draw_wrapped(address_line_1, font_name="Helvetica", font_size=10, leading=13, gap_after=0)
    draw_wrapped(f"{city}, {state}, {pin_code}", font_name="Helvetica", font_size=10, leading=13, gap_after=0)
    draw_wrapped(mobile_number, font_name="Helvetica", font_size=10, leading=13, gap_after=0)
    draw_wrapped(email_id, font_name="Helvetica", font_size=10, leading=13, gap_after=10)

    draw_wrapped("Subject: Sanction of Loan Facility", font_name="Helvetica-Bold", font_size=10, leading=13, gap_after=8)
    draw_wrapped(f"Dear {customer_name},", font_name="Helvetica", font_size=10, leading=13, gap_after=10)

    draw_wrapped(
        "We are pleased to inform you that your loan application submitted to us has been reviewed based on the information and documents provided by you, including identity proof, address proof, income details, and credit assessment. Based on our internal evaluation and eligibility criteria, we are happy to sanction a loan facility in your favor subject to the terms and conditions mentioned in this letter. This sanction is granted after careful verification of your repayment capacity, financial background, and compliance with applicable lending policies and regulatory requirements."
    )
    draw_wrapped(
        f"The loan sanctioned to you is categorized under {loan_type}, and the total approved loan amount is Rs {approved_amount}. The loan account will be created under the number {loan_account_number}, and the purpose of this loan has been recorded as {loan_purpose}. The loan will carry an interest rate of {interest_rate}, calculated on a {interest_basis} basis, and will be repayable over a tenure of {tenure_text}. The equated monthly installment (EMI) payable by you will be Rs {emi_amount}, and repayment will commence from {emi_start_date}. The EMI will be recovered through {repayment_mode}, as authorized by you at the time of loan processing."
    )
    draw_wrapped(
        f"The loan amount will be disbursed through {disbursement_mode} into the bank account details provided by you, subject to completion of all documentation and compliance formalities. Any applicable processing fee, documentation charges, or administrative costs will be deducted or collected as per the agreed terms. The loan may also attract prepayment charges, penal interest in case of delayed payment, and late fees wherever applicable under the lender's policies and prevailing regulations."
    )
    draw_wrapped(
        "Wherever collateral or security has been offered by you, the same shall remain hypothecated or pledged in favor of the lender until full repayment of the loan along with applicable interest, penalties, and charges. The lender reserves the right to verify and reassess the value or ownership of the collateral at any point during the loan tenure if required."
    )

    draw_wrapped("TERMS, CONDITIONS, AND DECLARATION", font_name="Helvetica-Bold", font_size=10, leading=13, gap_after=6)
    draw_wrapped(
        "By accepting this sanction, you acknowledge and agree that the loan must be repaid strictly in accordance with the repayment schedule communicated to you. Any delay, missed payment, or default may attract penal charges, affect your credit score, and may result in recovery proceedings as per applicable laws. The lender retains the right to recall the loan, suspend further disbursements, or initiate legal recovery action in case of non-compliance, fraud, misrepresentation, or breach of any loan agreement terms."
    )
    draw_wrapped(
        "You further confirm that all information and documents submitted by you during the loan application process are true, complete, and accurate to the best of your knowledge. Any discrepancy, falsification, or concealment of facts may lead to immediate cancellation of the loan and legal action as deemed appropriate. You also authorize the lender to verify your employment, income, residence, and credit history through authorized agencies and to report your repayment behavior to credit bureaus."
    )
    draw_wrapped(
        "You agree to inform the lender promptly in case of any change in your address, employment, income, contact details, or financial condition during the loan tenure. The lender may communicate with you through digital channels, SMS, email, or phone regarding repayment reminders, account statements, and loan-related updates. You consent to the use of electronic records and digital processing for documentation, communication, and servicing of your loan."
    )
    draw_wrapped(
        "If loan protection insurance or any financial safeguard product is applicable to your loan, the same shall be governed by the terms of the respective insurance provider, and the premium may be included in or charged separately as agreed. The coverage, claims, and benefits shall be subject to the insurer's policy terms."
    )
    draw_wrapped(
        f"This sanction letter is valid for a period of {validity_days} from the date of issue. If the acceptance and required documentation are not completed within this period, the sanction may lapse and may require fresh approval."
    )

    draw_wrapped("CUSTOMER DECLARATION & ACCEPTANCE", font_name="Helvetica-Bold", font_size=10, leading=13, gap_after=6)
    draw_wrapped(
        "I hereby confirm that I have read, understood, and accepted all the terms and conditions mentioned in this loan sanction letter. I acknowledge my responsibility to repay the loan along with applicable interest, charges, and penalties within the agreed tenure. I authorize the lender to debit my bank account for EMI payments and to process this loan digitally using the information and documents submitted by me. I also consent to electronic communication and credit bureau reporting related to this loan account."
    )

    draw_wrapped("E-SIGNATURE AUTHORIZATION", font_name="Helvetica-Bold", font_size=10, leading=13, gap_after=6)
    draw_wrapped(
        "To proceed with the loan disbursement, the borrower is required to provide digital consent and complete the electronic signature process. The borrower will authenticate the acceptance using Aadhaar-based OTP verification or any approved digital signature method. This electronic acceptance shall be treated as legally valid and equivalent to a physical signature under applicable electronic transaction laws."
    )

    draw_wrapped("Borrower Details for E-Sign:", font_name="Helvetica-Bold", font_size=10, leading=13, gap_after=6)
    draw_wrapped("Name: ___________________________", gap_after=2)
    draw_wrapped("Date: ___________________________", gap_after=2)
    draw_wrapped("Place: __________________________", gap_after=2)
    draw_wrapped("Registered Mobile Number: __________________", gap_after=2)
    draw_wrapped("IP Address (System Captured): __________________", gap_after=2)
    draw_wrapped("Device Information (System Captured): __________________", gap_after=10)

    draw_wrapped("Borrower E-Signature", font_name="Helvetica-Bold", font_size=10, leading=13, gap_after=4)
    draw_wrapped("[ Aadhaar OTP eSign / Digital Signature / Click to Accept ]", gap_after=12)

    draw_wrapped(f"For {lender_name}", font_name="Helvetica-Bold", font_size=10, leading=13, gap_after=6)
    draw_wrapped("This loan sanction has been issued electronically and does not require a physical signature.")
    draw_wrapped("Authorized Signatory", gap_after=2)
    draw_wrapped("Name: ____________________", gap_after=2)
    draw_wrapped("Designation: ______________", gap_after=2)
    draw_wrapped("Organization Seal: _____________", gap_after=2)

    c.save()
    return buffer.getvalue()


async def store_pdf_document(
    *,
    customer_id: str | int,
    doc_type: str,
    filename: str,
    data: bytes,
) -> str:
    db = await get_db()
    doc = {
        "customer_id": customer_id,
        "doc_type": doc_type,
        "filename": filename,
        "content_type": "application/pdf",
        "size": len(data),
        "data": Binary(data),
        "uploaded_at": datetime.utcnow(),
    }
    res = await db.documents.insert_one(doc)
    return str(res.inserted_id)
