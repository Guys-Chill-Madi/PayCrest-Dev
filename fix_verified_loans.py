"""
Run this ONCE to migrate existing loans stuck at "verified" → "verification_done"
so they appear in manager/admin queues immediately.

HOW TO RUN (from the paycrest folder in PowerShell):
  python fix_verified_loans.py

OR paste into a Python shell connected to MongoDB.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = "mongodb://pycrest:pycrest123@localhost:27017/pycrest?authSource=admin"
DB_NAME = "pycrest"

async def migrate():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    
    total_updated = 0
    for col_name in ["personal_loans", "vehicle_loans", "education_loans", "home_loans"]:
        result = await db[col_name].update_many(
            {"status": "verified", "verification_approved": True},
            {"$set": {"status": "verification_done"}}
        )
        if result.modified_count:
            print(f"  {col_name}: {result.modified_count} loans updated verified → verification_done")
            total_updated += result.modified_count
        
        # Also fix verification_rejected → rejected for rejected ones
        result2 = await db[col_name].update_many(
            {"status": "verification_rejected"},
            {"$set": {"status": "rejected"}}
        )
        if result2.modified_count:
            print(f"  {col_name}: {result2.modified_count} loans updated verification_rejected → rejected")
    
    print(f"\nTotal migrated: {total_updated} loans")
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate())