import sys
import os
from datetime import datetime
import asyncio
from getpass import getpass

# 1. Setup paths
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'services', 'auth-service'))

# 2. FORCE Environment Variables
os.environ["MONGODB_URI"] = "mongodb://pycrest:pycrest123@paycrest-mongodb:27017/pycrest?authSource=admin"
os.environ["MONGODB_DB"] = "pycrest"

# 3. Now import app modules
from app.database.mongo import get_db
from app.core.security import hash_password
from app.models.enums import Roles
from app.utils.sequences import next_customer_id

async def create_admin(email: str, full_name: str, password: str):
    # Ensure we get the database connection inside the async loop
    db = await get_db()
    
    # Check if user exists
    existing = await db.staff_users.find_one({"email": email})
    if not existing:
        existing = await db.users.find_one({"email": email})
        
    if existing:
        print(f"User with email {email} already exists (id={existing.get('_id')}).")
        return

    # Generate custom ID if your system requires it
    cust_id = await next_customer_id()

    doc = {
        "_id": cust_id,
        "full_name": full_name,
        "email": email,
        "password": hash_password(password),
        "phone": None,
        "dob": None,
        "gender": None,
        "pan_number": None,
        "role": Roles.ADMIN.value if hasattr(Roles.ADMIN, 'value') else Roles.ADMIN,
        "is_active": True,
        "created_at": datetime.utcnow(),
    }
    
    await db.staff_users.insert_one(doc)
    print(f"✅ Successfully created admin user: {email} (id={cust_id})")

def main():
    print("--- Create initial admin user for PAY CREST ---")
    email = input("Admin email: ")
    full_name = input("Full name: ")
    password = getpass("Password (hidden): ")
    password2 = getpass("Confirm password: ")
    
    if password != password2:
        print("❌ Passwords do not match")
        return
        
    asyncio.run(create_admin(email, full_name, password))

if __name__ == '__main__':
    main()