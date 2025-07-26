import { Controller, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';
import { UserQueryDto } from './dto/user-query.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async handleUserQuery(@Body() userQueryDto: UserQueryDto): Promise<string> {
    return this.chatService.processUserQuery(userQueryDto.query);
  }
}