import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { VehicleService } from './vehicle.service';
import { RegisterVehicleDto } from './dto/register-vehicle.dto';
import { AuthenticateVehicleDto } from './dto/authenticate-vehicle.dto';
import { VehicleStatus } from './entities/vehicle.entity';

@ApiTags('vehicles')
@Controller('vehicles')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new vehicle' })
  @ApiResponse({ status: 201, description: 'Vehicle registered successfully' })
  @ApiResponse({ status: 409, description: 'Vehicle already registered' })
  async register(@Body() registerDto: RegisterVehicleDto) {
    return this.vehicleService.registerVehicle(registerDto);
  }

  @Post('authenticate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate a vehicle' })
  @ApiResponse({ status: 200, description: 'Vehicle authenticated successfully' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async authenticate(@Body() authDto: AuthenticateVehicleDto) {
    return this.vehicleService.authenticateVehicle(authDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all vehicles' })
  @ApiResponse({ status: 200, description: 'List of all vehicles' })
  async getAllVehicles() {
    return this.vehicleService.getAllVehicles();
  }

  @Get(':vehicleId')
  @ApiOperation({ summary: 'Get vehicle by ID' })
  @ApiResponse({ status: 200, description: 'Vehicle details' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async getVehicle(@Param('vehicleId') vehicleId: string) {
    return this.vehicleService.getVehicleById(vehicleId);
  }

  @Get(':vehicleId/telemetry')
  @ApiOperation({ summary: 'Get vehicle telemetry data' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Vehicle telemetry data' })
  async getTelemetry(
    @Param('vehicleId') vehicleId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.vehicleService.getVehicleTelemetry(vehicleId, start, end);
  }

  @Get(':vehicleId/health')
  @ApiOperation({ summary: 'Get vehicle health data' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Vehicle health data' })
  async getHealth(
    @Param('vehicleId') vehicleId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.vehicleService.getVehicleHealth(vehicleId, start, end);
  }

  @Patch(':vehicleId/status')
  @ApiOperation({ summary: 'Update vehicle status' })
  @ApiResponse({ status: 200, description: 'Vehicle status updated' })
  async updateStatus(
    @Param('vehicleId') vehicleId: string,
    @Body('status') status: VehicleStatus,
  ) {
    return this.vehicleService.updateVehicleStatus(vehicleId, status);
  }

  @Delete(':vehicleId')
  @ApiOperation({ summary: 'Decommission a vehicle' })
  @ApiResponse({ status: 200, description: 'Vehicle decommissioned' })
  async decommission(@Param('vehicleId') vehicleId: string) {
    return this.vehicleService.decommissionVehicle(vehicleId);
  }
}
