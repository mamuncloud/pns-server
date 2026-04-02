import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginRequestDto {
  @ApiProperty({
    description: 'The email address or phone number of the employee or consumer',
    example: '08123456789 or manager@pns.com',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string;
}
