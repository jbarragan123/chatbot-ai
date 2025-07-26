import { Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';
import { ChatCompletionMessageParam, ChatCompletionCreateParams } from 'openai/resources/chat';

@Injectable()
export class OpenAIService {
  private readonly openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async chatWithFunctions(
    messages: ChatCompletionMessageParam[],
    functions: ChatCompletionCreateParams.Function[] // For function calling definitions
  ) {
    const chatCompletion = await this.openai.chat.completions.create({
      model: 'gpt-4-0613', 
      messages,
      functions,
      function_call: 'auto',
    });

    return chatCompletion.choices[0].message;
  }
}
