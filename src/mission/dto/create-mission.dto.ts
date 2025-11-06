import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsObject,
  IsEnum,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MissionType, MissionPriority } from '../entities/mission.entity';

class WaypointDto {
  @ApiProperty()
  @IsNotEmpty()
  latitude: number;

  @ApiProperty()
  @IsNotEmpty()
  longitude: number;

  @ApiPropertyOptional()
  @IsOptional()
  altitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  action?: string;
}

export class CreateMissionDto {
  @ApiProperty({ description: 'Mission name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Mission description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: MissionType, description: 'Mission type' })
  @IsEnum(MissionType)
  @IsOptional()
  type?: MissionType;

  @ApiPropertyOptional({ enum: MissionPriority, description: 'Mission priority' })
  @IsEnum(MissionPriority)
  @IsOptional()
  priority?: MissionPriority;

  @ApiPropertyOptional({ description: 'Vehicle ID to assign the mission to' })
  @IsString()
  @IsOptional()
  assignedVehicleId?: string;

  @ApiProperty({ description: 'Mission waypoints', type: [WaypointDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WaypointDto)
  waypoints: WaypointDto[];

  @ApiPropertyOptional({ description: 'Mission parameters' })
  @IsObject()
  @IsOptional()
  parameters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Scheduled start time' })
  @IsDateString()
  @IsOptional()
  scheduledStartTime?: Date;
}
