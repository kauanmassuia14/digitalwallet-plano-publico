import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../common/database/database.service.js";
import { CollectionQueue } from "./collection-queue.js";

export interface CollectionRequestResponse {
  id: string;
  tenantId: string;
  condominiumId: string;
  cooperativeId: string | null;
  status: "PENDING" | "ASSIGNED" | "COMPLETED" | "CANCELLED";
  scheduledFor: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CollectionService {
  public constructor(
    private readonly database: DatabaseService,
    private readonly queue: CollectionQueue,
  ) {}

  public async createRequest(
    tenantId: string,
    condominiumId: string,
    scheduledFor?: Date,
  ): Promise<CollectionRequestResponse> {
    const condominium = await this.database.client.condominium.findFirst({
      where: { id: condominiumId, tenantId },
    });

    if (condominium === null) {
      throw new NotFoundException("Condominium not found for this tenant");
    }

    const request = await this.database.client.collectionRequest.create({
      data: {
        condominiumId,
        scheduledFor,
        status: "PENDING",
        tenantId,
      },
    });

    await this.queue.push(tenantId, request.id);

    return request;
  }

  public async matchCollection(
    tenantId: string,
    cooperativeId: string,
  ): Promise<CollectionRequestResponse | null> {
    const cooperative = await this.database.client.cooperative.findFirst({
      where: { id: cooperativeId, tenantId },
    });

    if (cooperative === null) {
      throw new NotFoundException("Cooperative not found for this tenant");
    }

    // Loop until we find a valid pending request or the queue is empty
    while (true) {
      const requestId = await this.queue.pop(tenantId);
      if (requestId === null) {
        return null;
      }

      const request = await this.database.client.collectionRequest.findFirst({
        where: { id: requestId, tenantId },
      });

      if (request !== null && request.status === "PENDING") {
        const updated = await this.database.client.collectionRequest.update({
          data: {
            cooperativeId,
            status: "ASSIGNED",
          },
          where: { id: requestId },
        });
        return updated;
      }
    }
  }

  public async completeRequest(
    tenantId: string,
    requestId: string,
  ): Promise<CollectionRequestResponse> {
    const request = await this.database.client.collectionRequest.findFirst({
      where: { id: requestId, tenantId },
    });

    if (request === null) {
      throw new NotFoundException("Collection request not found");
    }

    if (request.status !== "ASSIGNED") {
      throw new BadRequestException(
        `Only assigned requests can be completed. Current status: ${request.status}`,
      );
    }

    const updated = await this.database.client.collectionRequest.update({
      data: {
        completedAt: new Date(),
        status: "COMPLETED",
      },
      where: { id: requestId },
    });

    return updated;
  }

  public async cancelRequest(
    tenantId: string,
    requestId: string,
  ): Promise<CollectionRequestResponse> {
    const request = await this.database.client.collectionRequest.findFirst({
      where: { id: requestId, tenantId },
    });

    if (request === null) {
      throw new NotFoundException("Collection request not found");
    }

    if (request.status === "COMPLETED" || request.status === "CANCELLED") {
      throw new BadRequestException(
        `Cannot cancel a request that is already ${request.status.toLowerCase()}`,
      );
    }

    if (request.status === "PENDING") {
      await this.queue.remove(tenantId, requestId);
    }

    const updated = await this.database.client.collectionRequest.update({
      data: {
        status: "CANCELLED",
      },
      where: { id: requestId },
    });

    return updated;
  }
}
