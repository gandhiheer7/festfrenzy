# api/main.py
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from typing import List

import crud, models, schemas, security, database

# Create tables on startup
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(
    title="FestFrenzy API",
    description="Backend API for FestFrenzy Event Management",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")


# --- Auth Dependencies ---

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(database.get_db),
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = crud.get_user_by_email(db, email=email)
    if user is None:
        raise credentials_exception
    return user


def get_current_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# =============================================================================
# AUTH ROUTES
# =============================================================================

@app.post("/api/register", response_model=schemas.UserResponse, status_code=201)
def register_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    if crud.get_user_by_email(db, email=user.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)


@app.post("/api/login", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db),
):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = security.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/users/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


# =============================================================================
# VENUE ROUTES
# =============================================================================

@app.get("/api/venues", response_model=List[schemas.VenueResponse])
def list_venues(db: Session = Depends(database.get_db)):
    return crud.get_venues(db)


@app.post("/api/venues", response_model=schemas.VenueResponse, status_code=201)
def create_venue(
    venue: schemas.VenueCreate,
    db: Session = Depends(database.get_db),
    _: models.User = Depends(get_current_admin),
):
    return crud.create_venue(db=db, venue=venue)


@app.delete("/api/venues/{venue_id}")
def delete_venue(
    venue_id: int,
    db: Session = Depends(database.get_db),
    _: models.User = Depends(get_current_admin),
):
    return crud.delete_venue(db=db, venue_id=venue_id)


# =============================================================================
# EVENT ROUTES
# =============================================================================

@app.get("/api/events", response_model=List[schemas.EventResponse])
def list_events(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(database.get_db),
):
    events = crud.get_events(db, skip=skip, limit=limit)
    result = []
    for event in events:
        count = crud.get_registration_count(db, event.id)
        event_data = schemas.EventResponse.model_validate(event)
        event_data.registration_count = count
        result.append(event_data)
    return result


@app.get("/api/events/{event_id}", response_model=schemas.EventResponse)
def get_event(event_id: int, db: Session = Depends(database.get_db)):
    event = crud.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    count = crud.get_registration_count(db, event_id)
    event_data = schemas.EventResponse.model_validate(event)
    event_data.registration_count = count
    return event_data


@app.post("/api/events", response_model=schemas.EventResponse, status_code=201)
def create_event(
    event: schemas.EventCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only admins can create events")
    return crud.create_event(db=db, event=event, creator_id=current_user.id)


@app.delete("/api/events/{event_id}")
def delete_event(
    event_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.delete_event(db=db, event_id=event_id, requesting_user=current_user)


# =============================================================================
# REGISTRATION ROUTES
# =============================================================================

@app.post("/api/events/{event_id}/register", response_model=schemas.RegistrationResponse, status_code=201)
def register_for_event(
    event_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.create_registration(db=db, event_id=event_id, user_id=current_user.id)


@app.delete("/api/events/{event_id}/register")
def cancel_registration(
    event_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.cancel_registration(db=db, event_id=event_id, user_id=current_user.id)


@app.get("/api/users/me/registrations", response_model=List[schemas.RegistrationResponse])
def my_registrations(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.get_user_registrations(db=db, user_id=current_user.id)


# =============================================================================
# ADMIN ROUTES
# =============================================================================

@app.get("/api/admin/users", response_model=List[schemas.UserResponse])
def list_all_users(
    db: Session = Depends(database.get_db),
    _: models.User = Depends(get_current_admin),
):
    return crud.get_all_users(db)


@app.patch("/api/admin/users/{user_id}/make-admin", response_model=schemas.UserResponse)
def make_admin(
    user_id: int,
    db: Session = Depends(database.get_db),
    _: models.User = Depends(get_current_admin),
):
    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_admin = True
    db.commit()
    db.refresh(user)
    return user


@app.patch("/api/admin/users/{user_id}/remove-admin", response_model=schemas.UserResponse)
def remove_admin(
    user_id: int,
    db: Session = Depends(database.get_db),
    current_admin: models.User = Depends(get_current_admin),
):
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot remove your own admin role")
    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_admin = False
    db.commit()
    db.refresh(user)
    return user