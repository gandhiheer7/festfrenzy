# api/models.py
from sqlalchemy import (
    Column, Integer, String, Boolean,
    DateTime, ForeignKey, Text, Float, UniqueConstraint
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    events_created = relationship("Event", back_populates="creator")
    registrations = relationship("Registration", back_populates="user")


class Venue(Base):
    __tablename__ = "venues"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    capacity = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    events = relationship("Event", back_populates="venue")


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String, nullable=False, default="General")
    event_datetime = Column(DateTime, nullable=False)
    end_datetime = Column(DateTime, nullable=False)
    capacity = Column(Integer, nullable=False, default=100)
    cost = Column(Float, nullable=False, default=0.0)
    image_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    venue_id = Column(Integer, ForeignKey("venues.id"), nullable=False)

    creator = relationship("User", back_populates="events_created")
    venue = relationship("Venue", back_populates="events")
    registrations = relationship("Registration", back_populates="event")


class Registration(Base):
    __tablename__ = "registrations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    registered_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Prevents the same user from registering for the same event twice
    __table_args__ = (
        UniqueConstraint("user_id", "event_id", name="uq_user_event"),
    )

    user = relationship("User", back_populates="registrations")
    event = relationship("Event", back_populates="registrations")