import { IsString, IsNotEmpty, IsOptional, IsArray, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterVehicleDto {
  @ApiProperty({ description: 'Unique vehicle identifier' })
  @IsString()
  @IsNotEmpty()
  vehicleId: string;

  @ApiProperty({ description: 'Vehicle authentication password' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: 'Vehicle name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Vehicle model' })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiPropertyOptional({ description: 'Vehicle manufacturer' })
  @IsString()
  @IsOptional()
  manufacturer?: string;

  @ApiPropertyOptional({ description: 'Vehicle capabilities', type: [String] })
  @IsArray()
  @IsOptional()
  capabilities?: string[];

  @ApiPropertyOptional({ description: 'Additional vehicle metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
