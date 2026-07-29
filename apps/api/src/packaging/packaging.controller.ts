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
  Inject,
  Query,
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
import { Public } from "../common/tenant/public.decorator.js";
import { CreatePackagingDto } from "./dto/create-packaging.dto.js";
import { TransitionPackagingDto } from "./dto/transition-packaging.dto.js";
import {
  PackagingService,
  type PublicPackagingLookupResult,
} from "./packaging.service.js";

@ApiTags("packaging")
@ApiHeader({
  description:
    "Development tenant context; replaced by authenticated membership",
  name: "x-tenant-id",
  required: true,
})
@ApiBadRequestResponse({ description: "Tenant context or payload is invalid" })
@Controller({ path: ["packaging", "packagings"], version: "1" })
@UseGuards(TenantContextGuard)
export class PackagingController {
  public constructor(
    @Inject(PackagingService) private readonly service: PackagingService,
  ) {}

  @Get("public/lookup/:externalQrHash")
  @Public()
  @ApiOkResponse({ description: "Packaging was found" })
  @ApiNotFoundResponse({ description: "Packaging not found" })
  public lookupPublic(
    @Param("externalQrHash") externalQrHash: string,
  ): Promise<PublicPackagingLookupResult> {
    return this.service.findPublicByExternalQrHash(externalQrHash);
  }

  @Get()
  public async list(
    @CurrentTenant() tenantId: string,
    @Query("batchId") batchId?: string,
    @Query("status") status?: string,
  ): Promise<PackagingSnapshot[]> {
    return this.service.list(tenantId, { batchId, status } as any);
  }

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

  @Get(":packagingId/events")
  public async getEvents(
    @CurrentTenant() tenantId: string,
    @Param("packagingId", new ParseUUIDPipe()) packagingId: string,
  ): Promise<any[]> {
    return this.service.findEvents(tenantId, packagingId);
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
