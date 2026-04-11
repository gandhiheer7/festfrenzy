# api/crud.py
from sqlalchemy.orm import Session
from . import models, schemas, security

# --- User Operations ---

def get_user_by_email(db: Session, email: str):
    """Fetches a user by their email address."""
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    """Hashes the password and saves a new user to the database."""
    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# --- Event Operations ---

def get_events(db: Session, skip: int = 0, limit: int = 100):
    """Fetches a list of events with optional pagination."""
    return db.query(models.Event).offset(skip).limit(limit).all()

def create_event(db: Session, event: schemas.EventCreate, user_id: int):
    """Creates a new event, associating it with the user who created it."""
    # model_dump() converts the Pydantic schema to a dictionary
    db_event = models.Event(**event.model_dump(), creator_id=user_id)
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

# --- Registration Operations ---

def create_registration(db: Session, registration: schemas.RegistrationCreate, user_id: int):
    """Registers a user for a specific event."""
    db_registration = models.Registration(
        user_id=user_id,
        event_id=registration.event_id
    )
    db.add(db_registration)
    db.commit()
    db.refresh(db_registration)
    return db_registration