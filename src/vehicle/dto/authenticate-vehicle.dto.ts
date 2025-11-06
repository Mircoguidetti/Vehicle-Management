import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AuthenticateVehicleDto {
  @ApiProperty({ description: 'Vehicle identifier' })
  @IsString()
  @IsNotEmpty()
  vehicleId: string;

  @ApiProperty({ description: 'Vehicle password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
