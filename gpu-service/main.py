import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from datetime import datetime
import logging
from models import ComputeRequest, ComputeResponse, HealthResponse, ErrorResponse
from security import verify_token, get_client_ip
from compute_engine import GPUComputeEngine

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
compute_engine = GPUComputeEngine()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 GPU Service starting up...")
    logger.info(f"🔧 Environment: {os.getenv('ENVIRONMENT', 'development')}")
    logger.info(f"🔑 Token authentication: {'✅ Enabled' if os.getenv('GPU_SERVICE_TOKEN') else '❌ Disabled'}")
    yield
    logger.info("🛑 GPU Service shutting down...")

app = FastAPI(
    title="GPU Compute Service",
    description="Lightweight GPU computation service for the click counter app",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if os.getenv("ENVIRONMENT") == "development" else ["https://your-backend-domain.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="Internal server error",
            details=str(exc) if os.getenv("ENVIRONMENT") == "development" else None,
            timestamp=datetime.utcnow().isoformat()
        ).dict()
    )

@app.get("/", response_model=dict)
async def root():
    """Root endpoint"""
    return {
        "service": "GPU Compute Service",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    gpu_status = compute_engine.get_gpu_status()
    
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow().isoformat(),
        version="1.0.0",
        gpu_available=gpu_status["gpu_available"]
    )

@app.get("/gpu-status", response_model=dict)
async def gpu_status(request: Request, _: str = Depends(verify_token)):
    """Get detailed GPU status - requires authentication"""
    client_ip = get_client_ip(request)
    logger.info(f"GPU status requested from {client_ip}")
    
    return {
        "status": "success",
        "gpu_info": compute_engine.get_gpu_status(),
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/compute", response_model=dict)
async def run_computation(
    request: Request,
    compute_request: ComputeRequest,
    _: str = Depends(verify_token)
):
    client_ip = get_client_ip(request)
    logger.info(f"Computation requested from {client_ip}: {compute_request.data[:50]}...")
    
    try:
        if not compute_request.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No data provided for computation"
            )
        
        if len(compute_request.data) > 10000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Input data too large (max 10KB)"
            )
        
        result = await compute_engine.run_computation(
            data=compute_request.data,
            parameters=compute_request.parameters
        )
        
        logger.info(f"Computation completed for {client_ip} in {result.get('computation_time', 0):.2f}s")
        
        return {
            "status": "success",
            "computation": result,
            "priority": compute_request.priority,
            "client_ip": client_ip,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Computation error for {client_ip}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Computation failed: {str(e)}"
        )

@app.post("/batch-compute", response_model=dict)
async def batch_computation(
    request: Request,
    batch_requests: list[ComputeRequest],
    _: str = Depends(verify_token)
):
    client_ip = get_client_ip(request)
    if len(batch_requests) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch size too large (max 10 requests)"
        )
    
    logger.info(f"Batch computation requested from {client_ip}: {len(batch_requests)} items")
    
    results = []
    
    for i, compute_request in enumerate(batch_requests):
        try:
            result = await compute_engine.run_computation(
                data=compute_request.data,
                parameters=compute_request.parameters
            )
            results.append({
                "index": i,
                "success": True,
                "result": result
            })
        except Exception as e:
            results.append({
                "index": i,
                "success": False,
                "error": str(e)
            })
    
    successful_computations = sum(1 for r in results if r["success"])
    logger.info(f"Batch computation completed for {client_ip}: {successful_computations}/{len(batch_requests)} successful")
    
    return {
        "status": "completed",
        "total_requests": len(batch_requests),
        "successful": successful_computations,
        "failed": len(batch_requests) - successful_computations,
        "results": results,
        "client_ip": client_ip,
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=os.getenv("ENVIRONMENT") == "development",
        log_level="info"
    )