import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from "@nestjs/swagger";
import type { PackagingSnapshot } from "@digitalwallet/domain";

import { CurrentTenant } from "../common/tenant/tenant-context.js";
import { TenantContextGuard } from "../common/tenant/tenant-context.guard.js";
import { CreatePackagingDto } from "./dto/create-packaging.dto.js";
import { TransitionPackagingDto } from "./dto/transition-packaging.dto.js";
import { PackagingService } from "./packaging.service.js";

@ApiTags("packaging")
@ApiHeader({
  description:
    "Development tenant context; replaced by authenticated membership",
  name: "x-tenant-id",
  required: true,
})
@ApiBadRequestResponse({ description: "Tenant context or payload is invalid" })
@Controller({ path: "packaging", version: "1" })
@UseGuards(TenantContextGuard)
export class PackagingController {
  public constructor(private readonly service: PackagingService) {}

  @Post()
  @ApiCreatedResponse({ description: "Packaging was created as MINTED" })
  @ApiConflictResponse({ description: "Serial already exists in this tenant" })
  public create(
    @CurrentTenant() tenantId: string,
    @Body() input: CreatePackagingDto,
  ): Promise<PackagingSnapshot> {
    return this.service.create(tenantId, input);
  }

  @Get(":packagingId")
  @ApiOkResponse({ description: "Packaging belongs to the current tenant" })
  @ApiNotFoundResponse({
    description: "Packaging does not exist in this tenant",
  })
  public findById(
    @CurrentTenant() tenantId: string,
    @Param("packagingId", new ParseUUIDPipe()) packagingId: string,
  ): Promise<PackagingSnapshot> {
    return this.service.findById(tenantId, packagingId);
  }

  @Post(":packagingId/transitions")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: "Transition was applied once" })
  @ApiConflictResponse({ description: "Transition or version conflicts" })
  @ApiNotFoundResponse({
    description: "Packaging does not exist in this tenant",
  })
  @ApiUnprocessableEntityResponse({
    description: "Timestamp or measured weight violates a domain rule",
  })
  public transition(
    @CurrentTenant() tenantId: string,
    @Param("packagingId", new ParseUUIDPipe()) packagingId: string,
    @Body() input: TransitionPackagingDto,
  ): Promise<PackagingSnapshot> {
    return this.service.transition(tenantId, packagingId, input);
  }
}
