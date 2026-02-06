import { IsString, IsEmail, IsOptional, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  @IsOptional()
  totpCode?: string;
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  roleId: string;
}

export class RegisterTenantDto {
  @IsString()
  companyName: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  planId: string;

  @IsString()
  @IsOptional()
  vatNumber?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  referralCode?: string;

  @IsString()
  @IsOptional()
  interval?: 'MONTHLY' | 'YEARLY';
}

export class TwoFADto {
  @IsString()
  totpCode: string;
}

export class TwoFAVerifyDto {
  @IsString()
  totpCode: string;
}

export class TwoFADisableDto {
  @IsString()
  password: string;
}

export class BackupCodeDto {
  @IsString()
  backupCode: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  newPassword: string;
}

export class ResetPasswordRequestDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  newPassword: string;
}

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}

export class UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: any;
  is2FAEnabled: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
}

export class AuthResponseDto {
  access_token?: string;
  user?: UserResponseDto;
  requires2FA?: boolean;
}

export class TwoFASecretDto {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}