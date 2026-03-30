import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum EmployeeRole {
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
}

export class CreateEmployeeDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ enum: EmployeeRole, example: EmployeeRole.CASHIER, default: EmployeeRole.CASHIER })
  @IsEnum(EmployeeRole)
  @IsNotEmpty()
  role: EmployeeRole;
}
