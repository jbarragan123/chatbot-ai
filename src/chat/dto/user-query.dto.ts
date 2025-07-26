import { IsString } from 'class-validator';

export class UserQueryDto {
  @IsString()
  query: string;
}