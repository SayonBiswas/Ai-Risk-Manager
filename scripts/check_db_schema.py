"""
Check if database tables exist.
Run: python scripts/check_db_schema.py
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import engine
from sqlalchemy import text


async def check_schema():
    """Check if required tables exist."""
    print("─" * 50)
    print("Checking Database Schema")
    print("─" * 50)
    
    try:
        async with engine.connect() as conn:
            # Check if tables exist
            result = await conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name;
            """))
            tables = [row[0] for row in result.fetchall()]
            
            print(f"📊 Found {len(tables)} tables:")
            for table in tables:
                print(f"  ✓ {table}")
            
            # Check for required tables
            required_tables = ['merchants', 'transactions', 'risk_decisions', 'audit_logs']
            missing_tables = [t for t in required_tables if t not in tables]
            
            if missing_tables:
                print(f"\n❌ Missing required tables: {missing_tables}")
                return False
            else:
                print(f"\n✅ All required tables exist!")
                
            # Check enum types
            result = await conn.execute(text("""
                SELECT typname 
                FROM pg_type 
                WHERE typtype = 'e';
            """))
            enums = [row[0] for row in result.fetchall()]
            
            print(f"\n📋 Found {len(enums)} enum types:")
            for enum in enums:
                print(f"  ✓ {enum}")
                
            print("\n─" * 50)
            print("✅ Database schema check complete!")
            print("─" * 50)
            return True
            
    except Exception as e:
        print(f"\n❌ Error checking schema: {str(e)}")
        return False


if __name__ == "__main__":
    result = asyncio.run(check_schema())
    sys.exit(0 if result else 1)