import { ApiProperty } from '@nestjs/swagger';

export class LoginUserDto {
  @ApiProperty({ example: '35be995f-664c-4bd3-9733-e753f5a574e6' })
  id: string;

  @ApiProperty({ example: 'manager@pns.com', nullable: true })
  email: string | null;

  @ApiProperty({ example: 'Manager One', nullable: true })
  name: string | null;

  @ApiProperty({ example: 'MANAGER', description: 'Role of the user (e.g. MANAGER, CASHIER, CUSTOMER)' })
  role: string;

  @ApiProperty({ enum: ['EMPLOYEE', 'USER'], example: 'EMPLOYEE' })
  type: 'EMPLOYEE' | 'USER';
}

export class LoginResponseDto {
  @ApiProperty({ description: 'The JWT access token' })
  access_token: string;

  @ApiProperty({ type: LoginUserDto })
  user: LoginUserDto;
}
