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
  ChatService,
  type ChatMessageResponse,
  type SendMessageDto,
} from "./chat.service.js";

@Controller({ path: "chat", version: "1" })
@UseGuards(TenantContextGuard)
export class ChatController {
  public constructor(
    @Inject(ChatService) private readonly chatService: ChatService,
  ) {}

  /**
   * GET /api/v1/chat/:requestId/messages
   * Poll for new messages. Use ?after=<ISO timestamp> for incremental fetch.
   */
  @Get(":requestId/messages")
  @HttpCode(HttpStatus.OK)
  public async getMessages(
    @Req() req: TenantAwareRequest,
    @Param("requestId") requestId: string,
    @Query("after") after?: string,
  ): Promise<ChatMessageResponse[]> {
    return this.chatService.getMessages(req.tenantId!, requestId, after);
  }

  /**
   * POST /api/v1/chat/:requestId/messages
   * Send a message (CONDOMINIUM or COOPERATIVE senderType).
   */
  @Post(":requestId/messages")
  @HttpCode(HttpStatus.CREATED)
  public async sendMessage(
    @Req() req: TenantAwareRequest,
    @Param("requestId") requestId: string,
    @Body() dto: SendMessageDto,
  ): Promise<ChatMessageResponse> {
    return this.chatService.sendMessage(req.tenantId!, requestId, dto);
  }
}
