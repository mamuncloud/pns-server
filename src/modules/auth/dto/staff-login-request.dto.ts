import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class StaffLoginRequestDto {
  @ApiProperty({
    description: 'The email address or phone number of the employee',
    example: 'manager@pns.com or 628123456789',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string;
}
