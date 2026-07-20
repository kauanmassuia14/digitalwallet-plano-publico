import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { TenantContextGuard } from "../common/tenant/tenant-context.guard.js";
import type { TenantAwareRequest } from "../common/tenant/tenant-context.js";
import {
  CollectionService,
  type CollectionRequestResponse,
} from "./collection.service.js";
import { CreateRequestDto } from "./dto/create-request.dto.js";
import { MatchRequestDto } from "./dto/match-request.dto.js";

@Controller({ path: "collections", version: "1" })
@UseGuards(TenantContextGuard)
export class CollectionController {
  public constructor(private readonly collectionService: CollectionService) {}

  @Post("requests")
  @HttpCode(HttpStatus.CREATED)
  public async createRequest(
    @Req() req: TenantAwareRequest,
    @Body() dto: CreateRequestDto,
  ): Promise<CollectionRequestResponse> {
    const scheduledFor = dto.scheduledFor
      ? new Date(dto.scheduledFor)
      : undefined;
    return this.collectionService.createRequest(
      req.tenantId!,
      dto.condominiumId,
      scheduledFor,
    );
  }

  @Post("match")
  @HttpCode(HttpStatus.OK)
  public async matchCollection(
    @Req() req: TenantAwareRequest,
    @Body() dto: MatchRequestDto,
  ): Promise<CollectionRequestResponse | null> {
    return this.collectionService.matchCollection(
      req.tenantId!,
      dto.cooperativeId,
    );
  }

  @Post("requests/:id/complete")
  @HttpCode(HttpStatus.OK)
  public async completeRequest(
    @Req() req: TenantAwareRequest,
    @Param("id") requestId: string,
  ): Promise<CollectionRequestResponse> {
    return this.collectionService.completeRequest(req.tenantId!, requestId);
  }

  @Post("requests/:id/cancel")
  @HttpCode(HttpStatus.OK)
  public async cancelRequest(
    @Req() req: TenantAwareRequest,
    @Param("id") requestId: string,
  ): Promise<CollectionRequestResponse> {
    return this.collectionService.cancelRequest(req.tenantId!, requestId);
  }
}
