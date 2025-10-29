from pydantic import BaseModel, EmailStr, field_validator, root_validator, confloat
from typing import Optional
from datetime import datetime 
from . import models
import enum

# --- User Schemas (No changes) ---
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: models.UserRole

    @field_validator('password')
    @classmethod
    def validate_password_length(cls, v):
        if len(v.encode('utf-8')) > 72:
            raise ValueError("Password must be 72 characters or less.")
        return v
    
    # --- NEW VALIDATOR FOR ATTENDEE RULES ---
    @root_validator(pre=False, skip_on_failure=True)
    def check_attendee_rules(cls, values):
        role = values.get('role')
        email = values.get('email')
        password = values.get('password')

        if role == models.UserRole.attendee:
            # Rule 1: Email must end with @spit.ac.in
            if not email or not email.endswith('@spit.ac.in'):
                raise ValueError('Attendee email must end with @spit.ac.in')
            # Rule 2: Password must match email
            if password != email:
                raise ValueError('Attendee password must match their email address')
        # No specific rules for organizer password matching email here
        return values

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class User(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    is_approved: bool

    class Config:
        from_attributes = True

# --- ADD THESE NEW VENUE SCHEMAS ---
class VenueBase(BaseModel):
    name: str
    location: str
    capacity: int

class VenueCreate(VenueBase):
    pass

class Venue(VenueBase):
    id: int

    class Config:
        from_attributes = True

# --- ADD THESE NEW EVENT SCHEMAS ---
class EventBase(BaseModel):
    title: str
    description: str
    event_datetime: datetime
    end_datetime: datetime
    capacity: int
    venue_id: int
    cost: confloat(ge=0.0)

class EventCreate(EventBase):
    @root_validator(pre=False, skip_on_failure=True)
    def check_dates(cls, values):
        start = values.get('event_datetime')
        end = values.get('end_datetime')
        if start and end and end <= start:
            raise ValueError('End date & time must be after start date & time')
        return values

class Event(EventBase):
    id: int
    organizer_id: int
    # Include nested Venue and Organizer info when returning an Event
    venue: Venue
    organizer: User # Use the existing User schema

    class Config:
        from_attributes = True

class BookingStatus(str, enum.Enum):
    PENDING_PAYMENT = "pending_payment"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

# --- ADD BOOKING SCHEMAS ---
class BookingBase(BaseModel):
    event_id: int

class BookingCreate(BookingBase):
    # Attendee ID will come from the logged-in user (token)
    pass

class Booking(BookingBase):
    id: int
    attendee_id: int
    booking_time: datetime
    status: BookingStatus
    event: Event # Include full event details

    class Config:
        from_attributes = True

