from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from typing import List
from . import security, crud, models, schemas
from .database import SessionLocal, engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- LIST OF YOUR PRE-DEFINED ACCOUNTS ---
# Fill this list with the 20 committees and your admin account
# IMPORTANT: Use strong, unique passwords.
PRE_DEFINED_ACCOUNTS = [
    {"name": "Admin", "email": "admin@festfrenzy.com", "password": "admin@1", "role": "admin"},
    {"name": "SPark", "email": "spark@spit.com", "password": "spark@1", "role": "organizer"},
    {"name": "Speakers' Club", "email": "speakersclub@spit.com", "password": "speakersclub@1", "role": "organizer"},
    {"name": "SPCG", "email": "spcg@spit.com", "password": "spcg@1", "role": "organizer"},
    {"name": "IEEE CS", "email": "ieeecs@spit.com", "password": "ieeecs@1", "role": "organizer"},
    {"name": "Astrophysics Club", "email": "astrophysics@spit.com", "password": "astrophysics@1", "role": "organizer"},
    {"name": "Rotaract", "email": "rotaract@spit.com", "password": "rotaract@1", "role": "organizer"},
    {"name": "IEEE", "email": "ieee@spit.com", "password": "ieee@1", "role": "organizer"},
    {"name": "Ecell", "email": "ecell@spit.com", "password": "ecell@1", "role": "organizer"},
    {"name": "Sports", "email": "sports@spit.com", "password": "sports@1", "role": "organizer"},
    {"name": "MUDRA", "email": "mudra@spit.com", "password": "mudra@1", "role": "organizer"},
    {"name": "SDC", "email": "sdc@spit.com", "password": "sdc@1", "role": "organizer"},
    {"name": "NISP", "email": "nisp@spit.com", "password": "nisp@1", "role": "organizer"},
    {"name": "WIE", "email": "wie@spit.com", "password": "wie@1", "role": "organizer"},
    {"name": "FETS", "email": "fets@spit.com", "password": "fets@1", "role": "organizer"},
    {"name": "DRC", "email": "drc@spit.com", "password": "drc@1", "role": "organizer"},
    {"name": "Enactus", "email": "enactus@spit.com", "password": "enactus@1", "role": "organizer"},
    {"name": "IETE", "email": "iete@spit.com", "password": "iete@1", "role": "organizer"},
    {"name": "FEC", "email": "fec@spit.com", "password": "fec@1", "role": "organizer"},
    {"name": "ACSES", "email": "acses@spit.com", "password": "acses@1", "role": "organizer"},
    {"name": "IEEE AESS", "email": "ieeeaess@spit.com", "password": "ieeeaess@1", "role": "organizer"},
    {"name": "SURAKSHA", "email": "suraksha@spit.com", "password": "suraksha@1", "role": "organizer"},
    {"name": "CSI", "email": "csi@spit.com", "password": "csi@1", "role": "organizer"},
    {"name": "Oculus", "email": "oculus@spit.com", "password": "oculus@1", "role": "organizer"}
]

# --- TEMPORARY SETUP SCRIPT (Corrected and UNCOMMENTED) ---
@app.get("/api/admin/setup-all-accounts")
def setup_all_accounts(db: Session = Depends(get_db)):
    """
    A one-time-use endpoint to create all pre-defined admin and organizer accounts.
    """
    results = {"created": [], "exists": []}

    if 'PRE_DEFINED_ACCOUNTS' not in globals():
         raise HTTPException(status_code=500, detail="PRE_DEFINED_ACCOUNTS list not found in main.py")

    for account in PRE_DEFINED_ACCOUNTS:
        db_user = crud.get_user_by_email(db, email=account["email"])
        if db_user:
            results["exists"].append(account["email"])
        else:
            required_keys = ["name", "email", "password", "role"]
            if not all(key in account for key in required_keys):
                 print(f"Skipping account due to missing keys: {account.get('email', 'N/A')}")
                 continue

            try:
                # --- THIS IS THE FIX ---
                user_schema = schemas.UserCreate(
                    name=account["name"],
                    email=account["email"],
                    password=account["password"],
                    role=account["role"]  # <-- This line was missing/wrong
                )
                
                new_user = crud.create_user(db, user_schema)
                
                # Override the default approval for our pre-defined accounts
                new_user.is_approved = True
                db.commit() # Commit the 'is_approved = True' change
                results["created"].append(account["email"])
                
            except Exception as e:
                print(f"Error creating account {account.get('email', 'N/A')}: {e}")
                db.rollback()

    return {"message": "All accounts processed.", "results": results}
# --- END OF SCRIPT ---

# --- (read_users_me and login_for_access_token remain the same) ---
@app.get("/api/users/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(security.get_current_user)):
    if not current_user.is_approved and current_user.role == "organizer":
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your organizer account has not been approved by an admin yet."
        )
    return current_user

@app.post("/api/organizer/login", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.authenticate_user(db, email=form_data.username, password=form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# --- ADD NEW UNIFIED SIGNUP ENDPOINT ---
@app.post("/api/signup", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def create_new_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Handles signup for both Attendees (with validation) and Organizers.
    """
    # Check if email already exists
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # The schemas.UserCreate now performs the attendee rule validation
    try:
        new_user = crud.create_user(db=db, user=user)
        return new_user
    except ValueError as e: # Catch validation errors from the schema
         raise HTTPException(status_code=400, detail=str(e))
    except Exception as e: # Catch other potential errors during creation
        print(f"Error during user creation: {e}") # Log for debugging
        raise HTTPException(status_code=500, detail="Could not create user account.")

# --- (Admin endpoints remain the same) ---
@app.get("/api/admin/pending-organizers", response_model=List[schemas.User])
def get_all_pending_organizers(
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(security.get_current_admin_user)
):
    return crud.get_pending_organizers(db)

@app.post("/api/admin/approve-organizer/{user_id}", response_model=schemas.User)
def approve_organizer_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(security.get_current_admin_user)
):
    db_user = crud.approve_organizer(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="Organizer not found or already approved")
    return db_user

@app.get("/api/venues", response_model=List[schemas.Venue])
def read_all_venues(db: Session = Depends(get_db)):
    """
    Public endpoint to get a list of all venues.
    Organizers will use this for their create event form.
    """
    return crud.get_venues(db)

@app.post("/api/admin/venues", response_model=schemas.Venue, status_code=status.HTTP_201_CREATED)
def create_new_venue(
    venue: schemas.VenueCreate,
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(security.get_current_admin_user)
):
    """
    Admin-only route to create a new venue.
    """
    db_venue = crud.get_venue_by_name(db, name=venue.name)
    if db_venue:
        raise HTTPException(status_code=400, detail="A venue with this name already exists")
    return crud.create_venue(db=db, venue=venue)

@app.delete("/api/admin/venues/{venue_id}", response_model=schemas.Venue)
def delete_venue_by_id(
    venue_id: int,
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(security.get_current_admin_user)
):
    """
    Admin-only route to delete a venue.
    """
    db_venue = crud.delete_venue(db, venue_id=venue_id)
    if db_venue is None:
        raise HTTPException(status_code=404, detail="Venue not found")
    return db_venue

@app.post("/api/organizer/events", response_model=schemas.Event, status_code=status.HTTP_201_CREATED)
def create_new_event(
    event: schemas.EventCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user) # Ensures only logged-in users can create
):
    """
    Organizer-only route to create a new event.
    Requires user to be logged in (token needed).
    """
    # Ensure the user is an organizer (although /users/me already checks approval)
    if current_user.role != "organizer":
         raise HTTPException(status_code=403, detail="Only organizers can create events")

    # Attempt to create the event (includes conflict check)
    db_event = crud.create_event(db=db, event=event, organizer_id=current_user.id)
    
    if db_event is None:
        # Fetch the venue name here to use in the error message
        venue = db.query(models.Venue).filter(models.Venue.id == event.venue_id).first()
        venue_name_for_error = venue.name if venue else "Selected venue"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{venue_name_for_error} is already booked during the selected time slot. Please adjust start/end times or choose a different venue."
        )
        
    return db_event

@app.get("/api/organizer/events", response_model=List[schemas.Event])
def read_organizer_events(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user) # Ensures only logged-in users can view
):
    """
    Organizer-only route to get a list of events created by the current organizer.
    """
    if current_user.role != "organizer":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    return crud.get_events_by_organizer(db=db, organizer_id=current_user.id)

@app.get("/api/events", response_model=List[schemas.Event])
def read_upcoming_events(db: Session = Depends(get_db)):
    """
    Public endpoint to get a list of all upcoming events.
    No login required.
    """
    return crud.get_upcoming_events(db=db)

@app.post("/api/events/{event_id}/book", response_model=schemas.Booking)
def book_event_for_attendee(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user) # Require login
):
    """
    Endpoint for an authenticated user (attendee or maybe others) to book an event.
    """
    # Optional: Add stricter role check if needed, e.g., only "attendee" role can book.
    # if current_user.role != models.UserRole.attendee:
    #     raise HTTPException(status_code=403, detail="Only attendees can book events.")

    # Try to create the booking using the CRUD function
    result = crud.create_booking(db=db, event_id=event_id, attendee_id=current_user.id)

    # Check if the CRUD function returned an error dictionary
    if isinstance(result, dict) and "error" in result:
        error_detail = result["error"]
        status_code = 400 # Default Bad Request
        if "not found" in error_detail.lower():
            status_code = 404
        elif "full" in error_detail.lower() or "already booked" in error_detail.lower():
            status_code = 409 # Conflict
        raise HTTPException(status_code=status_code, detail=error_detail)

    # If no error, result is the booking object
    return result