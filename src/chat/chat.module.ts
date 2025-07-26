import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { OpenAIService } from './openai/openai.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService, OpenAIService],
})
export class ChatModule {}
