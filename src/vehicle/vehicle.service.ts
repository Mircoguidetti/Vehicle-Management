import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Vehicle, VehicleStatus } from './entities/vehicle.entity';
import { VehicleTelemetry } from './entities/vehicle-telemetry.entity';
import { VehicleHealth } from './entities/vehicle-health.entity';
import { MqttService } from '../mqtt/mqtt.service';
import { RegisterVehicleDto } from './dto/register-vehicle.dto';
import { AuthenticateVehicleDto } from './dto/authenticate-vehicle.dto';

@Injectable()
export class VehicleService {
  private readonly logger = new Logger(VehicleService.name);

  constructor(
    @InjectRepository(Vehicle, 'default')
    private vehicleRepository: Repository<Vehicle>,
    @InjectRepository(VehicleTelemetry, 'timescale')
    private telemetryRepository: Repository<VehicleTelemetry>,
    @InjectRepository(VehicleHealth, 'timescale')
    private healthRepository: Repository<VehicleHealth>,
    private jwtService: JwtService,
    private mqttService: MqttService,
  ) {}

  async registerVehicle(registerDto: RegisterVehicleDto) {
    const { vehicleId, password, name, model, manufacturer, capabilities, metadata } =
      registerDto;

    // Check if vehicle already exists
    const existingVehicle = await this.vehicleRepository.findOne({
      where: { vehicleId },
    });

    if (existingVehicle) {
      throw new ConflictException('Vehicle already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create vehicle
    const vehicle = this.vehicleRepository.create({
      vehicleId,
      name,
      model,
      manufacturer,
      passwordHash,
      capabilities,
      metadata,
      status: VehicleStatus.REGISTERED,
    });

    const savedVehicle = await this.vehicleRepository.save(vehicle);

    // Generate JWT token
    const token = this.generateToken(vehicleId);

    // Update vehicle with token
    await this.vehicleRepository.update(savedVehicle.id, { currentToken: token });

    // Publish token to vehicle via MQTT
    await this.mqttService.publishAuthToken(vehicleId, token);

    this.logger.log(`Vehicle ${vehicleId} registered successfully`);

    return {
      vehicleId: savedVehicle.vehicleId,
      token,
      status: savedVehicle.status,
    };
  }

  async authenticateVehicle(authDto: AuthenticateVehicleDto) {
    const { vehicleId, password } = authDto;

    // Find vehicle
    const vehicle = await this.vehicleRepository.findOne({
      where: { vehicleId },
    });

    if (!vehicle) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, vehicle.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate new token
    const token = this.generateToken(vehicleId);

    // Update vehicle
    await this.vehicleRepository.update(vehicle.id, {
      currentToken: token,
      status: VehicleStatus.ACTIVE,
      lastSeenAt: new Date(),
    });

    // Publish token to vehicle via MQTT
    await this.mqttService.publishAuthToken(vehicleId, token);

    this.logger.log(`Vehicle ${vehicleId} authenticated successfully`);

    return {
      vehicleId: vehicle.vehicleId,
      token,
      status: VehicleStatus.ACTIVE,
    };
  }

  async verifyToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private generateToken(vehicleId: string): string {
    return this.jwtService.sign({
      vehicleId,
      type: 'vehicle',
      jti: uuidv4(),
    });
  }

  async getAllVehicles() {
    return this.vehicleRepository.find({
      select: [
        'id',
        'vehicleId',
        'name',
        'model',
        'manufacturer',
        'status',
        'capabilities',
        'metadata',
        'lastSeenAt',
        'lastKnownLatitude',
        'lastKnownLongitude',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  async getVehicleById(vehicleId: string) {
    const vehicle = await this.vehicleRepository.findOne({
      where: { vehicleId },
      select: [
        'id',
        'vehicleId',
        'name',
        'model',
        'manufacturer',
        'status',
        'capabilities',
        'metadata',
        'lastSeenAt',
        'lastKnownLatitude',
        'lastKnownLongitude',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }

  async getVehicleTelemetry(vehicleId: string, startDate?: Date, endDate?: Date) {
    const whereCondition: any = { vehicleId };

    if (startDate && endDate) {
      whereCondition.timestamp = Between(startDate, endDate);
    }

    return this.telemetryRepository.find({
      where: whereCondition,
      order: { timestamp: 'DESC' },
      take: 1000, // Limit results
    });
  }

  async getVehicleHealth(vehicleId: string, startDate?: Date, endDate?: Date) {
    const whereCondition: any = { vehicleId };

    if (startDate && endDate) {
      whereCondition.timestamp = Between(startDate, endDate);
    }

    return this.healthRepository.find({
      where: whereCondition,
      order: { timestamp: 'DESC' },
      take: 1000, // Limit results
    });
  }

  async updateVehicleStatus(vehicleId: string, status: VehicleStatus) {
    const vehicle = await this.getVehicleById(vehicleId);

    await this.vehicleRepository.update(vehicle.id, { status });

    return this.getVehicleById(vehicleId);
  }

  async decommissionVehicle(vehicleId: string) {
    return this.updateVehicleStatus(vehicleId, VehicleStatus.DECOMMISSIONED);
  }
}
