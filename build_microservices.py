import os
import shutil

ROOT_DIR = "/Users/chandana/Desktop/Pycrest/paycrest"
SERVICES_DIR = os.path.join(ROOT_DIR, "services")
API_GATEWAY_DIR = os.path.join(ROOT_DIR, "api-gateway")
BACKEND_DIR = os.path.join(ROOT_DIR, "lms_backend")

SERVICES = {
    "auth-service": {"port": 3001},
    "loan-service": {"port": 3002},
    "emi-service": {"port": 3003},
    "wallet-service": {"port": 3004},
    "payment-service": {"port": 3005},
    "verification-service": {"port": 3006},
    "admin-service": {"port": 3007},
    "manager-service": {"port": 3008},
}

REQUIREMENTS = """fastapi==0.104.1
uvicorn[standard]==0.24.0
motor==3.3.1
pydantic==2.4.2
pydantic-settings==2.0.3
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
httpx==0.25.1
python-dotenv==1.0.0
"""

CONFIG_PY = """from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    service_name: str
    port: int
    mongo_uri: str
    mongo_db_name: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    environment: str = "development"

    class Config:
        env_file = ".env"

settings = Settings()
"""

MONGO_PY = """from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

client: AsyncIOMotorClient = None

async def connect_db():
    global client
    client = AsyncIOMotorClient(settings.mongo_uri)
    print(f"[{settings.service_name}] \u2705 Connected to MongoDB: {settings.mongo_db_name}")

async def close_db():
    global client
    if client:
        client.close()

def get_db():
    return client[settings.mongo_db_name]
"""

# Ensure services dir
os.makedirs(SERVICES_DIR, exist_ok=True)

# 1. Create Service Structures
for svc_name, svc_info in SERVICES.items():
    svc_path = os.path.join(SERVICES_DIR, svc_name)
    app_path = os.path.join(svc_path, "app")
    port = svc_info["port"]
    
    # Folders
    folders_to_create = [
        "core", "database", "middleware", "models", 
        "routers", "schemas", "services", "utils"
    ]
    if svc_name == "payment-service":
        folders_to_create.append("mock")
        
    for f in folders_to_create:
        os.makedirs(os.path.join(app_path, f), exist_ok=True)
        # Create empty __init__.py files for packages
        open(os.path.join(app_path, f, "__init__.py"), "w").close()
    
    open(os.path.join(app_path, "__init__.py"), "w").close()

    # Requirements
    with open(os.path.join(svc_path, "requirements.txt"), "w") as f:
        f.write(REQUIREMENTS)

    # ENV
    env_content = f"""SERVICE_NAME={svc_name}
PORT={port}
MONGO_URI=mongodb://pycrest:pycrest123@localhost:27017/pycrest?authSource=admin
MONGO_DB_NAME=pycrest
SECRET_KEY=pycrest_jwt_secret_devops_2024
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
ENVIRONMENT=development

AUTH_SERVICE_URL=http://localhost:3001
LOAN_SERVICE_URL=http://localhost:3002
EMI_SERVICE_URL=http://localhost:3003
WALLET_SERVICE_URL=http://localhost:3004
PAYMENT_SERVICE_URL=http://localhost:3005
VERIFICATION_SERVICE_URL=http://localhost:3006
ADMIN_SERVICE_URL=http://localhost:3007
MANAGER_SERVICE_URL=http://localhost:3008
"""
    with open(os.path.join(svc_path, ".env"), "w") as f:
        f.write(env_content)

    # Core/Database Base Config
    with open(os.path.join(app_path, "core", "config.py"), "w") as f:
        f.write(CONFIG_PY)
        
    with open(os.path.join(app_path, "database", "mongo.py"), "w") as f:
        f.write(MONGO_PY)

print("Scaffolding Complete.")
