# api/schemas.py
from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime
from typing import Optional


# --- Token ---
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


# --- User ---
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
    model_config = ConfigDict(from_attributes=True)


# --- Venue ---
class VenueBase(BaseModel):
    name: str
    location: str
    capacity: int


class VenueCreate(VenueBase):
    pass


class VenueResponse(VenueBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# --- Event ---
class EventBase(BaseModel):
    title: str
    description: str
    category: str
    event_datetime: datetime
    end_datetime: datetime
    capacity: int = 100
    cost: float = 0.0
    image_url: Optional[str] = None
    venue_id: int


class EventCreate(EventBase):
    pass


class EventResponse(EventBase):
    id: int
    creator_id: int
    created_at: datetime
    venue: VenueResponse
    creator: UserResponse
    registration_count: int = 0
    model_config = ConfigDict(from_attributes=True)


# --- Registration ---
class RegistrationCreate(BaseModel):
    event_id: int


class RegistrationResponse(BaseModel):
    id: int
    user_id: int
    event_id: int
    registered_at: datetime
    model_config = ConfigDict(from_attributes=True)