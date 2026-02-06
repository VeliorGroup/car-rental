import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsDateString,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterCustomerDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: '+39123456789' })
  @IsString()
  phone: string;
}

export class LoginCustomerDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  password: string;
}

export class UpdateCustomerProfileDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '+39123456789' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'Rome' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Via Roma 123' })
  @IsOptional()
  @IsString()
  address?: string;
}

export class UploadDocumentsDto {
  @ApiPropertyOptional({ example: 'AB1234567' })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiPropertyOptional({ example: '2028-12-31' })
  @IsOptional()
  @IsDateString()
  licenseExpiry?: string;

  @ApiPropertyOptional({ example: 'ID12345678' })
  @IsOptional()
  @IsString()
  idCardNumber?: string;
}

export class CustomerAuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  customer: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    isVerified: boolean;
  };
}

export class ResetPasswordRequestDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  newPassword: string;
}
