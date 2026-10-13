"""
Authentication endpoints — register, login, password reset, and get current user info.
"""

import hashlib
import uuid
from datetime import datetime, timezone, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field, field_validator

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import (
    create_jwt, decode_jwt, generate_api_key, hash_api_key,
    generate_reset_token
)
from app.db.session import get_db
from app.db.models import Merchant, RoleEnum, PasswordResetToken
from app.services.email_service import EmailService

router = APIRouter()
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Pydantic Models ─────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    """Request model for user registration."""
    name: str = Field(..., min_length=1, max_length=255, description="Merchant name")
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, max_length=100, description="Password (min 8 characters)")
    security_question: str = Field(..., description="Security question for password recovery")
    security_answer: str = Field(..., min_length=1, max_length=255, description="Answer to security question")

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v


class RegisterResponse(BaseModel):
    """Response model for successful registration."""
    access_token: str
    token_type: str = "bearer"
    merchant_id: str
    name: str
    message: str


class LoginRequest(BaseModel):
    """Request model for user login."""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class LoginResponse(BaseModel):
    """Response model for successful login."""
    access_token: str
    token_type: str = "bearer"
    merchant_id: str
    name: str


class UserResponse(BaseModel):
    """Response model for current user info."""
    merchant_id: str
    name: str
    email: str
    role: str
    created_at: str


class ForgotPasswordRequest(BaseModel):
    """Request model for forgot password."""
    email: EmailStr = Field(..., description="Email address associated with the account")


class ForgotPasswordVerifyRequest(BaseModel):
    """Request model for verifying security question."""
    email: EmailStr = Field(..., description="Email address associated with the account")
    security_answer: str = Field(..., description="Answer to security question")


class ForgotPasswordResponse(BaseModel):
    """Response model for forgot password."""
    message: str
    security_question: str | None = None


class ForgotPasswordVerifyResponse(BaseModel):
    """Response model for verifying security question."""
    verified: bool
    reset_token: str | None = None


class ResetPasswordRequest(BaseModel):
    """Request model for reset password."""
    token: str = Field(..., description="Password reset token from email")
    new_password: str = Field(..., min_length=8, max_length=100, description="New password (min 8 characters)")
    
    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v


class ResetPasswordResponse(BaseModel):
    """Response model for reset password."""
    message: str


class ChangePasswordRequest(BaseModel):
    """Request model for changing password."""
    current_password: str = Field(..., description="Current password for verification")
    new_password: str = Field(..., min_length=8, max_length=100, description="New password (min 8 characters)")
    
    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v


class ChangePasswordResponse(BaseModel):
    """Response model for changing password."""
    message: str


# ── Helper Functions ─────────────────────────────────────────────────────────────

async def get_current_merchant(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: AsyncSession = Depends(get_db),
) -> Merchant:
    """
    Dependency to get the current authenticated merchant from JWT token.
    Raises 401 if token is invalid or merchant not found.
    """
    token = credentials.credentials
    payload = decode_jwt(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    merchant_id = payload.get("merchant_id")
    if not merchant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    result = await db.execute(
        select(Merchant).where(Merchant.id == uuid.UUID(merchant_id))
    )
    merchant = result.scalar_one_or_none()
    
    if merchant is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Merchant not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return merchant


# ── Endpoints ───────────────────────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new merchant account",
    description=(
        "Creates a new merchant account with email/password authentication. "
        "Returns an initial API key that will only be shown once. "
        "The password must be at least 8 characters long."
    ),
)
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> RegisterResponse:
    """Register a new merchant account."""

    # Check if email already exists
    result = await db.execute(
        select(Merchant).where(Merchant.email == request.email)
    )
    existing_merchant = result.scalar_one_or_none()

    if existing_merchant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Hash password
    hashed_password = pwd_context.hash(request.password)

    # Create merchant (no initial API key - users create them via the API keys endpoint)
    merchant = Merchant(
        name=request.name,
        email=request.email,
        password_hash=hashed_password,
        api_key_hash="",  # Empty since we're using the new api_keys table
        role=RoleEnum.MERCHANT,
        is_active=True,
        security_question=request.security_question,
        security_answer=request.security_answer.lower().strip(),
    )

    db.add(merchant)
    await db.commit()
    await db.refresh(merchant)

    # Create JWT token
    access_token = create_jwt({
        "merchant_id": str(merchant.id),
        "role": "MERCHANT"
    })

    return RegisterResponse(
        access_token=access_token,
        token_type="bearer",
        merchant_id=str(merchant.id),
        name=merchant.name,
        message="Account created. Please create an API key in the dashboard to start using the API."
    )


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Login with email and password",
    description=(
        "Authenticates a merchant using email and password. "
        "Returns a JWT access token for authenticated requests."
    ),
)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    """Login with email and password."""
    
    # Find merchant by email
    result = await db.execute(
        select(Merchant).where(Merchant.email == request.email)
    )
    merchant = result.scalar_one_or_none()
    
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not pwd_context.verify(request.password, merchant.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if merchant is active
    if not merchant.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact support."
        )
    
    # Create JWT token
    access_token = create_jwt({
        "merchant_id": str(merchant.id),
        "role": merchant.role.value
    })
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        merchant_id=str(merchant.id),
        name=merchant.name
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current merchant info",
    description=(
        "Returns information about the currently authenticated merchant. "
        "Requires a valid JWT bearer token."
    ),
)
async def get_me(
    current_merchant: Merchant = Depends(get_current_merchant),
) -> UserResponse:
    """Get current merchant information."""
    
    return UserResponse(
        merchant_id=str(current_merchant.id),
        name=current_merchant.name,
        email=current_merchant.email,
        role=current_merchant.role.value,
        created_at=current_merchant.created_at.isoformat()
    )


@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
    summary="Request password reset - get security question",
    description=(
        "Initiates the password reset process by returning the security question "
        "for the given email. Returns 200 even if email doesn't exist to prevent email enumeration."
    ),
)
async def forgot_password(
    request: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> ForgotPasswordResponse:
    """Request password reset - get security question."""

    # Find merchant by email
    result = await db.execute(
        select(Merchant).where(Merchant.email == request.email)
    )
    merchant = result.scalar_one_or_none()

    # Return security question if merchant exists
    if merchant and merchant.security_question:
        return ForgotPasswordResponse(
            message="Account found. Please answer your security question.",
            security_question=merchant.security_question
        )

    # Return generic message if no merchant or no security question
    return ForgotPasswordResponse(
        message="If that email exists, you can proceed to verify your identity."
    )


@router.post(
    "/forgot-password/verify",
    response_model=ForgotPasswordVerifyResponse,
    summary="Verify security answer and get reset token",
    description=(
        "Verifies the security answer and returns a reset token if correct. "
        "The token can be used to reset the password."
    ),
)
async def forgot_password_verify(
    request: ForgotPasswordVerifyRequest,
    db: AsyncSession = Depends(get_db),
) -> ForgotPasswordVerifyResponse:
    """Verify security answer and return reset token."""

    # Find merchant by email
    result = await db.execute(
        select(Merchant).where(Merchant.email == request.email)
    )
    merchant = result.scalar_one_or_none()

    if not merchant or not merchant.security_answer:
        return ForgotPasswordVerifyResponse(verified=False, reset_token=None)

    # Check if security answer matches (case-insensitive)
    if merchant.security_answer.lower().strip() != request.security_answer.lower().strip():
        return ForgotPasswordVerifyResponse(verified=False, reset_token=None)

    # Generate reset token
    raw_token, hashed_token = generate_reset_token()

    # Calculate expiry (1 hour from now)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

    # Store token in database
    reset_token = PasswordResetToken(
        merchant_id=merchant.id,
        token_hash=hashed_token,
        expires_at=expires_at,
    )
    db.add(reset_token)
    await db.commit()

    return ForgotPasswordVerifyResponse(verified=True, reset_token=raw_token)


@router.post(
    "/reset-password",
    response_model=ResetPasswordResponse,
    summary="Reset password with token",
    description=(
        "Resets the user's password using a valid reset token from the email. "
        "The token must be unused, not expired, and the merchant must be active."
    ),
)
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> ResetPasswordResponse:
    """Reset password using a token."""
    
    # Hash the incoming token to match against stored hash
    token_hash = hashlib.sha256(request.token.encode()).hexdigest()
    
    # Find the reset token in database
    result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == token_hash
        )
    )
    reset_token = result.scalar_one_or_none()
    
    if not reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Check if token is already used
    if reset_token.used_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset token has already been used"
        )
    
    # Check if token is expired
    if datetime.now(timezone.utc) > reset_token.expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired"
        )
    
    # Get the merchant
    merchant_result = await db.execute(
        select(Merchant).where(Merchant.id == reset_token.merchant_id)
    )
    merchant = merchant_result.scalar_one_or_none()
    
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token"
        )
    
    # Check if merchant is active
    if not merchant.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact support."
        )
    
    # Hash the new password
    hashed_password = pwd_context.hash(request.new_password)
    
    # Update merchant's password
    merchant.password_hash = hashed_password
    
    # Mark token as used
    reset_token.used_at = datetime.now(timezone.utc)
    
    await db.commit()
    
    return ResetPasswordResponse(
        message="Password updated successfully."
    )


@router.post(
    "/change-password",
    response_model=ChangePasswordResponse,
    summary="Change password for authenticated user",
    description=(
        "Allows an authenticated user to change their password by providing "
        "their current password for verification. Requires a valid JWT bearer token."
    ),
)
async def change_password(
    request: ChangePasswordRequest,
    current_merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
) -> ChangePasswordResponse:
    """Change password for authenticated user."""
    
    # Verify current password
    if not pwd_context.verify(request.current_password, current_merchant.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Check if new password is same as current
    if pwd_context.verify(request.new_password, current_merchant.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password"
        )
    
    # Hash the new password
    hashed_password = pwd_context.hash(request.new_password)
    
    # Update merchant's password
    current_merchant.password_hash = hashed_password
    
    await db.commit()
    
    return ChangePasswordResponse(
        message="Password changed successfully."
    )