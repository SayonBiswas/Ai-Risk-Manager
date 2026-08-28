"""
Declarative base that all ORM models inherit from.
Import every model module here so Alembic can detect them via autogenerate.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Models imported so Alembic autogenerate can discover all tables
from app.db import models  # noqa: E402, F401