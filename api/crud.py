# api/crud.py
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
import models, schemas, security


# --- User ---

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def get_user_by_id(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()


def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_all_users(db: Session):
    return db.query(models.User).all()


# --- Venue ---

def get_venues(db: Session):
    return db.query(models.Venue).all()


def get_venue_by_id(db: Session, venue_id: int):
    return db.query(models.Venue).filter(models.Venue.id == venue_id).first()


def create_venue(db: Session, venue: schemas.VenueCreate):
    db_venue = models.Venue(**venue.model_dump())
    db.add(db_venue)
    db.commit()
    db.refresh(db_venue)
    return db_venue


def delete_venue(db: Session, venue_id: int):
    db_venue = get_venue_by_id(db, venue_id)
    if not db_venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    db.delete(db_venue)
    db.commit()
    return {"detail": "Venue deleted"}


# --- Event ---

def get_events(db: Session, skip: int = 0, limit: int = 50):
    return db.query(models.Event).offset(skip).limit(limit).all()


def get_event_by_id(db: Session, event_id: int):
    return db.query(models.Event).filter(models.Event.id == event_id).first()


def create_event(db: Session, event: schemas.EventCreate, creator_id: int):
    # Validate venue exists
    venue = get_venue_by_id(db, event.venue_id)
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")

    db_event = models.Event(**event.model_dump(), creator_id=creator_id)
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event


def delete_event(db: Session, event_id: int, requesting_user: models.User):
    db_event = get_event_by_id(db, event_id)
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    # Only the creator or an admin can delete
    if db_event.creator_id != requesting_user.id and not requesting_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this event")
    db.delete(db_event)
    db.commit()
    return {"detail": "Event deleted"}


# --- Registration ---

def get_registration_count(db: Session, event_id: int) -> int:
    return db.query(models.Registration).filter(
        models.Registration.event_id == event_id
    ).count()


def get_user_registrations(db: Session, user_id: int):
    return db.query(models.Registration).filter(
        models.Registration.user_id == user_id
    ).all()


def create_registration(db: Session, event_id: int, user_id: int):
    # 1. Check event exists
    event = get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # 2. Check capacity
    current_count = get_registration_count(db, event_id)
    if current_count >= event.capacity:
        raise HTTPException(status_code=400, detail="Event is fully booked")

    # 3. Attempt insert — UniqueConstraint handles duplicate registrations
    db_registration = models.Registration(user_id=user_id, event_id=event_id)
    db.add(db_registration)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="You are already registered for this event")
    db.refresh(db_registration)
    return db_registration


def cancel_registration(db: Session, event_id: int, user_id: int):
    reg = db.query(models.Registration).filter(
        models.Registration.event_id == event_id,
        models.Registration.user_id == user_id,
    ).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    db.delete(reg)
    db.commit()
    return {"detail": "Registration cancelled"}