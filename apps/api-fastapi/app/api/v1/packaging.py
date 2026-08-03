from typing import List, Optional
from fastapi import APIRouter, status
from app.schemas.packaging import PackagingCreate, PackagingResponse
from app.services import packaging_service

router = APIRouter(prefix="/packaging", tags=["Packaging & Catálogo"])


@router.post("", response_model=PackagingResponse, status_code=status.HTTP_201_CREATED)
async def register_packaging(payload: PackagingCreate):
    return await packaging_service.create_packaging(payload)


@router.get("", response_model=List[PackagingResponse])
async def get_packagings(brand_id: Optional[str] = None):
    return await packaging_service.list_packagings(brand_id)
