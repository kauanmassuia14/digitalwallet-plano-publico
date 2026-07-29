import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Inject,
} from "@nestjs/common";

import { FileInterceptor } from "@nestjs/platform-express";
import { ApiConsumes, ApiHeader, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import type { ImportJobSnapshot } from "@digitalwallet/domain";
import { TenantMembershipRole } from "@digitalwallet/database";

import { CurrentTenant } from "../common/tenant/tenant-context.js";
import { TenantContextGuard } from "../common/tenant/tenant-context.guard.js";
import { RolesGuard } from "../common/tenant/roles.guard.js";
import { Roles } from "../common/tenant/roles.decorator.js";
import { UploadImportDto } from "./dto/upload-import.dto.js";
import { ImportService } from "./import.service.js";

@ApiTags("Imports")
@Controller({ path: "imports", version: "1" })
@UseGuards(TenantContextGuard, RolesGuard)
@ApiHeader({
  name: "x-user-id",
  required: true,
  description: "Authenticated User UUID",
})
@ApiHeader({
  name: "x-tenant-id",
  required: false,
  description: "Tenant UUID context",
})
export class ImportController {
  public constructor(
    @Inject(ImportService) private readonly importService: ImportService,
  ) {}

  @Post()
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file"))
  public async uploadFile(
    @CurrentTenant() tenantId: string,
    @Headers("x-user-id") userId: string,
    @Body() dto: UploadImportDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ImportJobSnapshot> {
    if (file === undefined) {
      throw new BadRequestException("No file uploaded");
    }
    return this.importService.upload(
      tenantId,
      userId,
      file.buffer,
      file.originalname,
      dto,
    );
  }

  @Get()
  public async listJobs(
    @CurrentTenant() tenantId: string,
  ): Promise<ImportJobSnapshot[]> {
    return this.importService.listJobs(tenantId);
  }

  @Get(":jobId")
  public async getJob(
    @CurrentTenant() tenantId: string,
    @Param("jobId") jobId: string,
  ): Promise<ImportJobSnapshot> {
    return this.importService.getJob(tenantId, jobId);
  }

  @Get(":jobId/errors")
  public async getErrorReport(
    @CurrentTenant() tenantId: string,
    @Param("jobId") jobId: string,
    @Res() response: Response,
  ): Promise<void> {
    const reportJson = await this.importService.getErrorReport(tenantId, jobId);
    response.setHeader("Content-Type", "application/json");
    response.send(reportJson);
  }

  @Post(":jobId/commit")
  public async commit(
    @CurrentTenant() tenantId: string,
    @Param("jobId") jobId: string,
  ): Promise<ImportJobSnapshot> {
    return this.importService.commitJob(tenantId, jobId);
  }

  @Post("cleanup")
  @Roles(TenantMembershipRole.ADMIN)
  public async cleanup(): Promise<{ expiredCount: number }> {
    const expiredCount = await this.importService.expirePendingImports();
    return { expiredCount };
  }
}
