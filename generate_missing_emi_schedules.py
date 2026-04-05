"""
Run this ONCE to generate missing EMI schedules for all active loans.
This fixes loan 3 (and any other loans that were directly set to active
without going through the normal pipeline).

HOW TO RUN (from the paycrest root folder in PowerShell):
  python generate_missing_emi_schedules.py
"""
import asyncio
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = "mongodb://pycrest:pycrest123@localhost:27017/pycrest?authSource=admin"
DB_NAME = "pycrest"


def next_month_date(from_date: datetime) -> datetime:
    month = from_date.month + 1
    year = from_date.year
    if month > 12:
        month = 1
        year += 1
    day = min(from_date.day, 28)  # Safe day for all months
    return from_date.replace(year=year, month=month, day=day,
                              hour=0, minute=0, second=0, microsecond=0)


async def generate_schedule_for_loan(db, col_name: str, loan: dict):
    loan_id = loan.get("loan_id")
    customer_id = loan.get("customer_id")

    # Check if schedule already exists
    existing_count = await db.emi_schedules.count_documents({"loan_id": loan_id})
    if existing_count > 0:
        print(f"  [{col_name}] loan_id={loan_id}: already has {existing_count} schedule rows, skipping")
        return

    tenure = int(loan.get("tenure_months") or loan.get("remaining_tenure") or 0)
    emi_amount = float(loan.get("emi_per_month") or 0)

    if not tenure or not emi_amount:
        print(f"  [{col_name}] loan_id={loan_id}: missing tenure={tenure} or emi_per_month={emi_amount}, skipping")
        return

    start_date = (
        loan.get("disbursed_at")
        or loan.get("approved_at")
        or loan.get("applied_at")
        or datetime.utcnow()
    )

    interest_rate = float(loan.get("interest_rate") or 12.0)
    total_loan = float(loan.get("loan_amount") or 0)

    if total_loan and interest_rate:
        monthly_rate = interest_rate / 12 / 100
        interest_component = round(total_loan * monthly_rate, 2)
        principal_component = round(emi_amount - interest_component, 2)
    else:
        principal_component = round(emi_amount * 0.85, 2)
        interest_component = round(emi_amount * 0.15, 2)

    schedule = []
    due_date = next_month_date(start_date)
    now = datetime.utcnow()

    for i in range(1, tenure + 1):
        status = "overdue" if due_date < now else "pending"
        doc = {
            "loan_id": loan_id,
            "loan_type": col_name,
            "loan_collection": col_name,
            "customer_id": customer_id,
            "installment_no": i,
            "instalment_number": i,
            "due_date": due_date,
            "emi_amount": emi_amount,
            "principal_amount": principal_component,
            "interest_amount": interest_component,
            "principal_component": principal_component,
            "interest_component": interest_component,
            "penalty_amount": 0.0,
            "status": status,
            "paid_at": None,
            "paid_amount": None,
            "created_at": now,
        }
        schedule.append(doc)
        due_date = next_month_date(due_date)

    if schedule:
        await db.emi_schedules.insert_many(schedule)
        print(f"  [{col_name}] loan_id={loan_id}: generated {len(schedule)} EMI rows for customer_id={customer_id}")


async def main():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]

    total = 0
    for col_name in ["personal_loans", "vehicle_loans", "education_loans", "home_loans"]:
        loans = await db[col_name].find(
            {"status": {"$in": ["active", "disbursed"]}}
        ).to_list(length=1000)

        if not loans:
            print(f"[{col_name}] no active loans found")
            continue

        print(f"\n[{col_name}] found {len(loans)} active loans")
        for loan in loans:
            await generate_schedule_for_loan(db, col_name, loan)
            total += 1

    print(f"\nDone. Processed {total} active loans.")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())