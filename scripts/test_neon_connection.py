"""
Test script to verify Neon database connection.
Run: python scripts/test_neon_connection.py
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import engine
from app.core.config import get_settings
from sqlalchemy import text


async def test_connection():
    """Test database connection and basic query."""
    settings = get_settings()
    
    print("─" * 50)
    print("Testing Neon Database Connection")
    print("─" * 50)
    print(f"Database URL: {settings.database_url[:50]}...")
    print()
    
    try:
        async with engine.connect() as conn:
            # Test basic connection
            result = await conn.execute(text("SELECT version()"))
            version = result.scalar()
            print("✅ Successfully connected to database!")
            print(f"📊 PostgreSQL version: {version[:50]}...")
            
            # Test current database
            result = await conn.execute(text("SELECT current_database()"))
            db_name = result.scalar()
            print(f"🗄️  Current database: {db_name}")
            
            # Test current user
            result = await conn.execute(text("SELECT current_user"))
            user = result.scalar()
            print(f"👤 Current user: {user}")
            
            print()
            print("─" * 50)
            print("✅ All database connection tests passed!")
            print("─" * 50)
            
    except Exception as e:
        print()
        print("─" * 50)
        print("❌ Database connection failed!")
        print("─" * 50)
        print(f"Error: {str(e)}")
        print()
        print("Please check your .env file and ensure:")
        print("1. DATABASE_URL is set correctly")
        print("2. Your Neon password is included in the connection string")
        print("3. Your Neon database is active")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(test_connection())