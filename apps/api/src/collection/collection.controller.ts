import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  Inject,
} from "@nestjs/common";
import { TenantContextGuard } from "../common/tenant/tenant-context.guard.js";
import type { TenantAwareRequest } from "../common/tenant/tenant-context.js";
import {
  CollectionService,
  type CollectionRequestResponse,
  type CollectionRequestListQuery,
} from "./collection.service.js";
import { CreateRequestDto } from "./dto/create-request.dto.js";
import { MatchRequestDto } from "./dto/match-request.dto.js";
import { SyncOfflineDto } from "./dto/sync-offline.dto.js";

@Controller({ path: "collections", version: "1" })
@UseGuards(TenantContextGuard)
export class CollectionController {
  public constructor(
    @Inject(CollectionService)
    private readonly collectionService: CollectionService,
  ) {}

  @Get("requests")
  @HttpCode(HttpStatus.OK)
  public async listRequests(
    @Req() req: TenantAwareRequest,
    @Query() query: CollectionRequestListQuery,
  ): Promise<CollectionRequestResponse[]> {
    return this.collectionService.listRequests(req.tenantId!, query);
  }

  @Get("requests/:id")
  @HttpCode(HttpStatus.OK)
  public async getRequest(
    @Req() req: TenantAwareRequest,
    @Param("id") requestId: string,
  ): Promise<CollectionRequestResponse> {
    return this.collectionService.getRequest(req.tenantId!, requestId);
  }

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

  @Post("sync")
  @HttpCode(HttpStatus.OK)
  public async syncOffline(
    @Req() req: TenantAwareRequest,
    @Body() dto: SyncOfflineDto,
  ): Promise<{ successCount: number; failedScans: any[] }> {
    return this.collectionService.syncOfflineCollections(req.tenantId!, dto);
  }
}
