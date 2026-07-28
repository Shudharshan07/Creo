import uuid
from datetime import datetime
from pydantic import BaseModel


class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str | None = None
    role: str = "director"


class UserLogin(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str | None
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
