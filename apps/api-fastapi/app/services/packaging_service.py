import hashlib
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional
from app.schemas.packaging import PackagingCreate, PackagingResponse

_packaging_db: Dict[str, PackagingResponse] = {}


def generate_qr_hashes(brand_id: str, sku: str, pkg_id: str):
    """Gera hashes SHA-256 distintos para os QR Codes externo e interno."""
    ext_raw = f"EXT-{brand_id}-{sku}-{pkg_id}"
    int_raw = f"INT-{brand_id}-{sku}-{pkg_id}-SECRET"

    ext_hash = hashlib.sha256(ext_raw.encode("utf-8")).hexdigest()
    int_hash = hashlib.sha256(int_raw.encode("utf-8")).hexdigest()

    return ext_hash, int_hash


async def create_packaging(payload: PackagingCreate) -> PackagingResponse:
    pkg_id = str(uuid.uuid4())
    ext_hash, int_hash = generate_qr_hashes(payload.brand_id, payload.sku, pkg_id)
    now = datetime.now(timezone.utc)

    pkg = PackagingResponse(
        id=pkg_id,
        brand_id=payload.brand_id,
        sku=payload.sku,
        name=payload.name,
        material_type=payload.material_type,
        weight_grams=payload.weight_grams,
        external_qr_hash=ext_hash,
        internal_qr_hash=int_hash,
        created_at=now,
    )
    _packaging_db[pkg_id] = pkg
    return pkg


async def list_packagings(brand_id: Optional[str] = None) -> List[PackagingResponse]:
    if brand_id:
        return [pkg for pkg in _packaging_db.values() if pkg.brand_id == brand_id]
    return list(_packaging_db.values())
