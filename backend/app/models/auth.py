"""Authentication models"""
from pydantic import BaseModel, EmailStr
from typing import Optional


class UserLogin(BaseModel):
    """User login request"""
    email: EmailStr
    password: str


class UserRegister(BaseModel):
    """User registration request"""
    email: EmailStr
    password: str
    firstname: Optional[str] = None
    lastname: Optional[str] = None


class Token(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Token payload data"""
    user_id: Optional[int] = None


class UserResponse(BaseModel):
    """User response model"""
    id: int
    email: str
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    is_active: bool = True
    
    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    """Authentication response with user and token"""
    user: UserResponse
    access_token: str
    token_type: str = "bearer"

