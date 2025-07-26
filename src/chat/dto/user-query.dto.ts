import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO used to validate and document user queries
 * submitted to the assistant service.
 */
export class UserQueryDto {
  @ApiProperty({
    description: 'The query provided by the user, typically a natural language question or request.',
    example: "I am looking for a phone",
  })
  @IsString()
  query: string;
}