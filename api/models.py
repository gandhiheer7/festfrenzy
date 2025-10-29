import enum
from sqlalchemy import Column, Integer, String, Boolean, Enum, ForeignKey, DateTime, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

# --- NEW Booking Status Enum ---
class BookingStatus(str, enum.Enum):
    PENDING_PAYMENT = "pending_payment" # For paid events before verification
    CONFIRMED = "confirmed"           # For free events or after payment verification
    REJECTED = "rejected"             # If payment is rejected
    CANCELLED = "cancelled"           # If attendee cancels

class UserRole(str, enum.Enum):
    attendee = "attendee"
    organizer = "organizer"
    admin = "admin"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    is_approved = Column(Boolean, default=False)

    events = relationship("Event", back_populates="organizer")
    # --- ADD RELATIONSHIP TO BOOKINGS (as attendee) ---
    bookings = relationship("Booking", back_populates="attendee")

class Venue(Base):
    __tablename__ = "venues"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    location = Column(String, nullable=False)
    capacity = Column(Integer, nullable=False)

    events = relationship("Event", back_populates="venue")

class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(String, nullable=False)
    event_datetime = Column(DateTime, nullable=False)
    end_datetime = Column(DateTime, nullable=False)
    capacity = Column(Integer, nullable=False)
    cost = Column(Float, nullable=False, default=0.0)

    organizer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    venue_id = Column(Integer, ForeignKey("venues.id"), nullable=False)

    organizer = relationship("User", back_populates="events")
    venue = relationship("Venue", back_populates="events")
    bookings = relationship("Booking", back_populates="event")

# --- ADD THIS NEW BOOKING MODEL ---
class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_time = Column(DateTime, default=datetime.utcnow)
    status = Column(Enum(BookingStatus), nullable=False, default=BookingStatus.CONFIRMED)
    # payment_proof_url = Column(String, nullable=True) # Add later if needed for paid events

    attendee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)

    attendee = relationship("User", back_populates="bookings")
    event = relationship("Event", back_populates="bookings")