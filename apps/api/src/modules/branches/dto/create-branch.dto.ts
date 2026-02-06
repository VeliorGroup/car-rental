import { IsString, IsEmail, IsOptional, IsBoolean, Length, MinLength, ValidateIf } from 'class-validator';

export class CreateBranchDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @Length(2, 10)
  code: string;

  @IsString()
  @MinLength(5)
  address: string;

  @IsString()
  @MinLength(2)
  city: string;

  @IsOptional()
  @IsString()
  country?: string = 'AL';

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @ValidateIf((o) => o.email !== '' && o.email !== null && o.email !== undefined)
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;

  @IsOptional()
  openingHours?: Record<string, string>;

  @IsOptional()
  coordinates?: { lat: number; lng: number };

  @IsOptional()
  @IsString()
  notes?: string;
}
