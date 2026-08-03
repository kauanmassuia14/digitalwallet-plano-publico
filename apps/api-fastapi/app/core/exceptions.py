from typing import Any, Dict, Optional
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException


class APIException(Exception):
    """Exceção base personalizada para respostas padronizadas da API."""

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        code: str = "BAD_REQUEST",
        details: Optional[Any] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details
        super().__init__(message)


def create_error_response(
    status_code: int, message: str, code: str, details: Optional[Any] = None
) -> JSONResponse:
    content: Dict[str, Any] = {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "status": status_code,
        },
    }
    if details is not None:
        content["error"]["details"] = details
    return JSONResponse(status_code=status_code, content=content)


async def api_exception_handler(request: Request, exc: APIException) -> JSONResponse:
    return create_error_response(
        status_code=exc.status_code,
        message=exc.message,
        code=exc.code,
        details=exc.details,
    )


async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    code = "HTTP_ERROR"
    if exc.status_code == 404:
        code = "NOT_FOUND"
    elif exc.status_code == 401:
        code = "UNAUTHORIZED"
    elif exc.status_code == 403:
        code = "FORBIDDEN"
    elif exc.status_code >= 500:
        code = "INTERNAL_SERVER_ERROR"

    return create_error_response(
        status_code=exc.status_code,
        message=str(exc.detail),
        code=code,
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    return create_error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        message="Erro de validação nos dados enviados.",
        code="VALIDATION_ERROR",
        details=exc.errors(),
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return create_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        message="Erro interno no servidor.",
        code="INTERNAL_SERVER_ERROR",
    )
