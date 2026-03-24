import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class LoginRequestDto {
  @ApiProperty({
    description: 'The email address of the employee or consumer',
    example: 'manager@pns.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
