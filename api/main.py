# api/main.py
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from . import crud, models, schemas, security, database

# Create the database tables automatically (SQLite only, use Alembic for production)
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="FestFrenzy API", description="Backend API for FestFrenzy Event Management")

# Configure CORS so the Next.js frontend can make requests to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Next.js default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Authentication Dependency ---

# This tells FastAPI where the login endpoint is, to generate the Swagger UI correctly
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    """Validates the JWT token and returns the current authenticated user."""
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
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    user = crud.get_user_by_email(db, email=token_data.email)
    if user is None:
        raise credentials_exception
    return user

# --- API Routes ---

@app.post("/api/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    """Register a new user."""
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)

@app.post("/api/login", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    """Authenticate a user and return a JWT token."""
    user = crud.get_user_by_email(db, email=form_data.username) # OAuth2 form uses 'username'
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create token with the user's email as the "subject" (sub)
    access_token = security.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/events", response_model=list[schemas.EventResponse])
def read_events(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    """Fetch a list of all events. Publicly accessible."""
    events = crud.get_events(db, skip=skip, limit=limit)
    return events

@app.post("/api/events", response_model=schemas.EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    event: schemas.EventCreate, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create a new event. Requires authentication."""
    # In a fully fleshed out app, you might check if `current_user.is_admin` is True here
    return crud.create_event(db=db, event=event, user_id=current_user.id)

@app.post("/api/events/{event_id}/register", response_model=schemas.RegistrationResponse, status_code=status.HTTP_201_CREATED)
def register_for_event(
    event_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Register the currently logged-in user for a specific event."""
    registration_data = schemas.RegistrationCreate(event_id=event_id)
    return crud.create_registration(db=db, registration=registration_data, user_id=current_user.id)