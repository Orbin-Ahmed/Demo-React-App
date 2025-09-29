from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class ComputeRequest(BaseModel):
    data: str
    parameters: Optional[Dict[str, Any]] = {}
    priority: Optional[str] = "normal"
    
class ComputeResponse(BaseModel):
    success: bool
    result: Dict[str, Any]
    computation_time: float
    timestamp: str
    request_id: str
    
class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str
    gpu_available: bool
    
class ErrorResponse(BaseModel):
    error: str
    details: Optional[str] = None
    timestamp: str