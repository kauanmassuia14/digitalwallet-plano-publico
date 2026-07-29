import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../common/database/database.service.js";

export interface ChatMessageResponse {
  id: string;
  collectionRequestId: string;
  senderType: "CONDOMINIUM" | "COOPERATIVE" | "AI_AGENT";
  senderName: string;
  content: string;
  createdAt: Date;
}

export interface SendMessageDto {
  senderType: "CONDOMINIUM" | "COOPERATIVE";
  senderName: string;
  content: string;
}

@Injectable()
export class ChatService {
  public constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  public async getMessages(
    tenantId: string,
    collectionRequestId: string,
    after?: string,
  ): Promise<ChatMessageResponse[]> {
    const request = await this.database.client.collectionRequest.findFirst({
      where: { id: collectionRequestId, tenantId },
    });
    if (!request) {
      throw new NotFoundException("Collection request not found");
    }

    return this.database.client.chatMessage.findMany({
      where: {
        tenantId,
        collectionRequestId,
        ...(after ? { createdAt: { gt: new Date(after) } } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
  }

  public async sendMessage(
    tenantId: string,
    collectionRequestId: string,
    dto: SendMessageDto,
  ): Promise<ChatMessageResponse> {
    const request = await this.database.client.collectionRequest.findFirst({
      where: { id: collectionRequestId, tenantId },
    });
    if (!request) {
      throw new NotFoundException("Collection request not found");
    }

    return this.database.client.chatMessage.create({
      data: {
        tenantId,
        collectionRequestId,
        senderType: dto.senderType,
        senderName: dto.senderName,
        content: dto.content,
      },
    });
  }
}
