from sqlalchemy.orm import Session
from . import models, schemas, security
from datetime import datetime, timedelta # <-- ADD THIS IMPORT
from sqlalchemy import and_, or_

# --- User Functions (No changes) ---
def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user:
        return False
    if not security.verify_password(password, user.hashed_password):
        return False
    return user

def create_user(db: Session, user: schemas.UserCreate):
    """Create a new user in the database."""
    hashed_password = security.get_password_hash(user.password)
    is_approved = True if user.role == models.UserRole.attendee else False
    db_user = models.User(
        email=user.email,
        name=user.name,
        hashed_password=hashed_password,
        role=user.role, # Use the role from the input schema
        is_approved=is_approved # Set based on role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_pending_organizers(db: Session):
    return db.query(models.User).filter(
        models.User.role == "organizer",
        models.User.is_approved == False
    ).all()

def approve_organizer(db: Session, user_id: int):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user and db_user.role == "organizer":
        db_user.is_approved = True
        db.commit()
        db.refresh(db_user)
        return db_user
    return None

# --- ADD THESE NEW VENUE FUNCTIONS ---
def get_venue_by_name(db: Session, name: str):
    """Finds a venue by its name."""
    return db.query(models.Venue).filter(models.Venue.name == name).first()

def get_venues(db: Session):
    """Returns a list of all venues."""
    return db.query(models.Venue).all()

def create_venue(db: Session, venue: schemas.VenueCreate):
    """Creates a new venue in the database."""
    db_venue = models.Venue(
        name=venue.name,
        location=venue.location,
        capacity=venue.capacity
    )
    db.add(db_venue)
    db.commit()
    db.refresh(db_venue)
    return db_venue

def delete_venue(db: Session, venue_id: int):
    """Deletes a venue by its ID."""
    db_venue = db.query(models.Venue).filter(models.Venue.id == venue_id).first()
    if db_venue:
        db.delete(db_venue)
        db.commit()
        return db_venue
    return None

def check_event_conflict(db: Session, venue_id: int, start_time: datetime, end_time: datetime):
    """
    Checks if there's any existing event for the venue that overlaps
    with the proposed start_time and end_time.
    """
    conflict = db.query(models.Event).filter(
        models.Event.venue_id == venue_id,
        # Check if new event starts during an existing event OR
        # ends during an existing event OR
        # completely envelops an existing event
        or_(
            and_(models.Event.event_datetime < end_time, models.Event.end_datetime > start_time),
        )
    ).first()
    return conflict is not None # True if conflict exists

# --- UPDATED CREATE EVENT ---
def create_event(db: Session, event: schemas.EventCreate, organizer_id: int):
    """Creates a new event, checking for conflicts first."""

    # Use start and end times for conflict check
    is_conflict = check_event_conflict(db,
                                       venue_id=event.venue_id,
                                       start_time=event.event_datetime,
                                       end_time=event.end_datetime)
    if is_conflict:
        return None # Indicate conflict

    db_event = models.Event(
        **event.model_dump(),
        organizer_id=organizer_id
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

# --- (get_events_by_organizer remains the same) ---
def get_events_by_organizer(db: Session, organizer_id: int):
     return db.query(models.Event).filter(models.Event.organizer_id == organizer_id).order_by(models.Event.event_datetime).all()

def get_upcoming_events(db: Session):
    """Gets all events where the end time is in the future, ordered by start time."""
    now = datetime.utcnow()
    return db.query(models.Event).filter(
        models.Event.end_datetime > now
    ).order_by(models.Event.event_datetime).all()

def get_event_by_id(db: Session, event_id: int):
    """Gets a single event by its ID."""
    return db.query(models.Event).filter(models.Event.id == event_id).first()

def get_booking_by_attendee_and_event(db: Session, attendee_id: int, event_id: int):
    """Checks if a specific attendee has already booked a specific event."""
    return db.query(models.Booking).filter(
        models.Booking.attendee_id == attendee_id,
        models.Booking.event_id == event_id
    ).first()

def create_booking(db: Session, event_id: int, attendee_id: int):
    """Creates a new booking for an attendee."""
    
    # 1. Check if event exists
    db_event = get_event_by_id(db, event_id)
    if not db_event:
        return {"error": "Event not found."}

    # 2. Check if user already booked this event
    existing_booking = get_booking_by_attendee_and_event(db, attendee_id, event_id)
    if existing_booking:
        # Allow re-booking only if cancelled? Or just prevent duplicates?
        # For now, prevent duplicates unless cancelled.
        if existing_booking.status != models.BookingStatus.CANCELLED:
             return {"error": "You have already booked this event."}
        # If cancelled, potentially allow re-booking by updating status? Or create new? Let's create new for now.

    # 3. Check for capacity
    # Count current *confirmed* bookings for this event
    current_bookings_count = db.query(models.Booking).filter(
        models.Booking.event_id == event_id,
        models.Booking.status == models.BookingStatus.CONFIRMED # Only count confirmed
        # Add PENDING_PAYMENT later if implementing paid flow
    ).count()

    if current_bookings_count >= db_event.capacity:
        return {"error": "Sorry, this event is already full."}

    # 4. Create the booking (Assume free event for now -> CONFIRMED)
    #    (Later, we'll check event type and set to PENDING_PAYMENT if needed)
    db_booking = models.Booking(
        attendee_id=attendee_id,
        event_id=event_id,
        status=models.BookingStatus.CONFIRMED # Default to confirmed for now
    )
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    
    # Eager load event details for the response
    db.refresh(db_booking.event)
    db.refresh(db_booking.event.venue)
    db.refresh(db_booking.event.organizer)

    return db_booking # Return the successful booking object