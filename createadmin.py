import getpass
import sys
import bcrypt
from uuid import uuid4

from sqlalchemy import select, create_engine
from sqlalchemy.orm import sessionmaker

from Backend.core.config import settings
from Backend.database.models import Member


def create_admin():
    print("\n=== City Issue Super Admin Creator ===\n")
    print("Super Admin has full system access and is NOT tied to any department.\n")
    
    email = input("Admin Email: ").strip()
    if not email:
        print("Error: Email is required")
        sys.exit(1)
    
    name = input("Admin Name: ").strip()
    if not name:
        print("Error: Name is required")
        sys.exit(1)
    
    password = getpass.getpass("Password: ")
    if len(password) < 8:
        print("Error: Password must be at least 8 characters")
        sys.exit(1)
    
    confirm = getpass.getpass("Confirm Password: ")
    if password != confirm:
        print("Error: Passwords do not match")
        sys.exit(1)
    
    db_url = settings.database_url.replace("postgresql+asyncpg://", "postgresql://")
    engine = create_engine(db_url, echo=False)
    SessionLocal = sessionmaker(bind=engine)
    
    with SessionLocal() as db:
        existing = db.execute(select(Member).where(Member.email == email)).scalar_one_or_none()
        if existing:
            print(f"Error: Member with email {email} already exists")
            sys.exit(1)
        
        password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        
        admin = Member(
            id=uuid4(),
            department_id=None,
            name=name,
            email=email,
            password_hash=password_hash,
            role="admin",
            is_active=True,
        )
        
        db.add(admin)
        db.commit()
        
        print(f"\n✓ Super Admin account created successfully!")
        print(f"  Email: {email}")
        print(f"  Role: admin (Super Admin)")
        print(f"  Department: None (System-wide access)")
        print(f"\nYou can now login at /signin")


if __name__ == "__main__":
    create_admin()
