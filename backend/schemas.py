from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class PhoneLoginRequest(BaseModel):
    phone: str

class PhoneVerifyRequest(BaseModel):
    phone: str
    code: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshRequest(BaseModel):
    refresh_token: str

class PushSubscriptionKeys(BaseModel):
    p256dh: str
    auth: str

class PushSubscribeRequest(BaseModel):
    endpoint: str
    keys: PushSubscriptionKeys

class TokenData(BaseModel):
    user_id: Optional[int] = None
    phone: Optional[str] = None

class UserBase(BaseModel):
    phone: str
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = "master"
    is_active: Optional[bool] = True
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class UserCreate(UserBase):
    pass

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    is_verified: bool
    role: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: datetime
    class Config:
        from_attributes = True

class JobBase(BaseModel):
    customer_name: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    address: Optional[str] = None
    customer_phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    price: Optional[float] = None
    status: Optional[str] = "scheduled"
    priority: Optional[str] = "medium"
    job_type: Optional[str] = "repair"
    services: Optional[list] = []
    checklist: Optional[List[dict]] = [] # [{"text": "text", "done": bool}]
    user_id: Optional[int] = None

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    customer_name: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    address: Optional[str] = None
    customer_phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    price: Optional[float] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    job_type: Optional[str] = None
    services: Optional[list] = None
    checklist: Optional[List[dict]] = None

class JobResponse(JobBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class DashboardStats(BaseModel):
    total_jobs: int
    today_jobs: int
    scheduled_jobs: int
    active_jobs: int
    completed_jobs: int
    cancelled_jobs: int
    total_revenue: float
    today_revenue: float

class ServiceBase(BaseModel):
    name: str
    price: float = 0.0

class ServiceCreate(ServiceBase):
    pass

class ServiceResponse(ServiceBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True
