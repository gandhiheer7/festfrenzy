# api/schemas.py
from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime
from typing import Optional

# --- Token Schemas (For Authentication later) ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    created_at: datetime

    # This tells Pydantic to read data even if it's not a standard dictionary 
    # (i.e., read directly from our SQLAlchemy database models)
    model_config = ConfigDict(from_attributes=True)

# --- Event Schemas ---
class EventBase(BaseModel):
    title: str
    description: str
    date: datetime
    location: str
    capacity: int = 100
    image_url: Optional[str] = None

class EventCreate(EventBase):
    pass

class EventResponse(EventBase):
    id: int
    creator_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Registration Schemas ---
class RegistrationBase(BaseModel):
    event_id: int

class RegistrationCreate(RegistrationBase):
    pass

class RegistrationResponse(RegistrationBase):
    id: int
    user_id: int
    registered_at: datetime

    model_config = ConfigDict(from_attributes=True)