from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class PackagingCreate(BaseModel):
    brand_id: str = Field(..., description="ID da Marca/Fábrica proprietária da embalagem")
    sku: str = Field(..., description="Código do produto / SKU")
    name: str = Field(..., description="Nome da embalagem / produto")
    material_type: str = Field(..., description="Tipo de material (PET, Alumínio, Vidro, Papelão, etc.)")
    weight_grams: float = Field(..., gt=0, description="Peso estimado da embalagem em gramas")


class PackagingResponse(BaseModel):
    id: str
    brand_id: str
    sku: str
    name: str
    material_type: str
    weight_grams: float
    external_qr_hash: str
    internal_qr_hash: str
    created_at: datetime

    class Config:
        from_attributes = True
