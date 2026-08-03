from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.exceptions import (
    APIException,
    api_exception_handler,
    generic_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)
from app.api.v1.health import router as health_router
from app.api.v1.chat import router as chat_router
from app.api.v1.ai import router as ai_router
from app.api.v1.packaging import router as packaging_router


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url=f"{settings.API_V1_STR}/docs",
        redoc_url=f"{settings.API_V1_STR}/redoc",
    )

    # Configuração de CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Registro dos Exception Handlers Uniformes
    app.add_exception_handler(APIException, api_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)

    # Registro de Routers
    app.include_router(health_router, prefix=settings.API_V1_STR)
    app.include_router(chat_router, prefix=settings.API_V1_STR)
    app.include_router(ai_router, prefix=settings.API_V1_STR)
    app.include_router(packaging_router, prefix=settings.API_V1_STR)

    return app


app = create_app()
