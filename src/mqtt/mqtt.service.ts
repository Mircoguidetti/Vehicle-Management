import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as mqtt from 'mqtt';
import { Vehicle, VehicleStatus } from '../vehicle/entities/vehicle.entity';
import { VehicleTelemetry } from '../vehicle/entities/vehicle-telemetry.entity';
import { VehicleHealth } from '../vehicle/entities/vehicle-health.entity';
import { MissionStatus } from '../mission/entities/mission-status.entity';
import { Mission, MissionState } from '../mission/entities/mission.entity';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: mqtt.MqttClient;
  private readonly topics = {
    vehicleRegister: 'vehicle/+/register',
    vehicleAuth: 'vehicle/+/auth',
    vehicleTelemetry: 'vehicle/+/telemetry',
    vehicleHealth: 'vehicle/+/health',
    missionStatus: 'vehicle/+/mission/status',
    missionCommand: 'vehicle/+/mission/command',
  };

  constructor(
    private configService: ConfigService,
    @InjectRepository(Vehicle, 'default')
    private vehicleRepository: Repository<Vehicle>,
    @InjectRepository(Mission, 'default')
    private missionRepository: Repository<Mission>,
    @InjectRepository(VehicleTelemetry, 'timescale')
    private telemetryRepository: Repository<VehicleTelemetry>,
    @InjectRepository(VehicleHealth, 'timescale')
    private healthRepository: Repository<VehicleHealth>,
    @InjectRepository(MissionStatus, 'timescale')
    private missionStatusRepository: Repository<MissionStatus>,
  ) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.endAsync();
    }
  }

  private async connect() {
    const brokerUrl = this.configService.get('MQTT_BROKER_URL');
    const username = this.configService.get('MQTT_USERNAME');
    const password = this.configService.get('MQTT_PASSWORD');
    const clientId = this.configService.get('MQTT_CLIENT_ID');

    this.client = mqtt.connect(brokerUrl, {
      clientId,
      username,
      password,
      clean: true,
      reconnectPeriod: 5000,
    });

    this.client.on('connect', () => {
      this.logger.log('Connected to MQTT broker');
      this.subscribeToTopics();
    });

    this.client.on('error', (error) => {
      this.logger.error('MQTT connection error:', error);
    });

    this.client.on('message', (topic, payload) => {
      this.handleMessage(topic, payload);
    });
  }

  private subscribeToTopics() {
    Object.values(this.topics).forEach((topic) => {
      this.client.subscribe(topic, (err) => {
        if (err) {
          this.logger.error(`Failed to subscribe to ${topic}:`, err);
        } else {
          this.logger.log(`Subscribed to ${topic}`);
        }
      });
    });
  }

  private async handleMessage(topic: string, payload: Buffer) {
    try {
      const message = JSON.parse(payload.toString());
      const topicParts = topic.split('/');
      const vehicleId = topicParts[1];

      // Skip authentication check for registration and initial auth topics
      const skipAuthTopics = ['/register', '/auth'];
      const needsAuth = !skipAuthTopics.some((t) => topic.includes(t));

      if (needsAuth) {
        // Validate vehicle authentication
        const isAuthenticated = await this.validateVehicleMessage(vehicleId, message);
        if (!isAuthenticated) {
          this.logger.warn(
            `Rejected unauthenticated message from vehicle ${vehicleId} on topic ${topic}`,
          );
          return;
        }
      }

      if (topic.includes('/telemetry')) {
        await this.handleTelemetry(vehicleId, message);
      } else if (topic.includes('/health')) {
        await this.handleHealth(vehicleId, message);
      } else if (topic.includes('/mission/status')) {
        await this.handleMissionStatus(vehicleId, message);
      } else if (topic.includes('/auth')) {
        await this.handleAuth(vehicleId, message);
      } else if (topic.includes('/register')) {
        await this.handleRegistration(vehicleId, message);
      }
    } catch (error) {
      this.logger.error(`Error handling message on ${topic}:`, error);
    }
  }

  private async validateVehicleMessage(vehicleId: string, message: any): Promise<boolean> {
    try {
      // Check if message contains a token
      if (!message.token) {
        this.logger.warn(`Message from ${vehicleId} missing authentication token`);
        return false;
      }

      // Verify the JWT token
      const decoded = await this.verifyToken(message.token);

      // Verify the token is for this vehicle
      if (decoded.vehicleId !== vehicleId) {
        this.logger.warn(
          `Token vehicleId mismatch: expected ${vehicleId}, got ${decoded.vehicleId}`,
        );
        return false;
      }

      // Check if vehicle exists and is active
      const vehicle = await this.vehicleRepository.findOne({
        where: { vehicleId },
      });

      if (!vehicle) {
        this.logger.warn(`Vehicle ${vehicleId} not found in database`);
        return false;
      }

      // Optionally verify this is the current token (prevents token replay)
      if (vehicle.currentToken && vehicle.currentToken !== message.token) {
        this.logger.warn(`Vehicle ${vehicleId} using outdated token`);
        return false;
      }

      // Update last seen timestamp
      await this.vehicleRepository.update({ vehicleId }, { lastSeenAt: new Date() });

      return true;
    } catch (error) {
      this.logger.error(`Token validation failed for vehicle ${vehicleId}:`, error.message);
      return false;
    }
  }

  private async verifyToken(token: string): Promise<any> {
    try {
      const configService = this.configService;
      const secret = configService.get('VEHICLE_JWT_SECRET');
      // Import JwtService functionality directly
      const jwt = require('jsonwebtoken');
      return jwt.verify(token, secret);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  private async handleRegistration(vehicleId: string, message: any) {
    this.logger.log(`Registration request received for vehicle ${vehicleId}`);
    // Registration is handled via REST API, but we can acknowledge here
    // This allows vehicles to register via MQTT if needed
  }

  private async handleTelemetry(vehicleId: string, data: any) {
    try {
      const telemetry = this.telemetryRepository.create({
        vehicleId,
        timestamp: new Date(data.timestamp || Date.now()),
        latitude: data.latitude,
        longitude: data.longitude,
        altitude: data.altitude,
        speed: data.speed,
        heading: data.heading,
        batteryLevel: data.batteryLevel,
        sensors: data.sensors,
        additionalData: data.additionalData,
      });

      await this.telemetryRepository.save(telemetry);

      // Update vehicle's last known position
      await this.vehicleRepository.update(
        { vehicleId },
        {
          lastSeenAt: new Date(),
          lastKnownLatitude: data.latitude,
          lastKnownLongitude: data.longitude,
        },
      );

      this.logger.debug(`Telemetry received from vehicle ${vehicleId}`);
    } catch (error) {
      this.logger.error(`Error saving telemetry for ${vehicleId}:`, error);
    }
  }

  private async handleHealth(vehicleId: string, data: any) {
    try {
      const health = this.healthRepository.create({
        vehicleId,
        timestamp: new Date(data.timestamp || Date.now()),
        overallStatus: data.overallStatus,
        cpuUsage: data.cpuUsage,
        memoryUsage: data.memoryUsage,
        diskUsage: data.diskUsage,
        temperature: data.temperature,
        batteryHealth: data.batteryHealth,
        systemErrors: data.systemErrors,
        warnings: data.warnings,
        diagnostics: data.diagnostics,
      });

      await this.healthRepository.save(health);

      // Update vehicle status if critical
      if (data.overallStatus === 'critical' || data.overallStatus === 'error') {
        await this.vehicleRepository.update(
          { vehicleId },
          { status: VehicleStatus.MAINTENANCE },
        );
      }

      this.logger.debug(`Health data received from vehicle ${vehicleId}`);
    } catch (error) {
      this.logger.error(`Error saving health data for ${vehicleId}:`, error);
    }
  }

  private async handleMissionStatus(vehicleId: string, data: any) {
    try {
      const missionStatus = this.missionStatusRepository.create({
        missionId: data.missionId,
        vehicleId,
        timestamp: new Date(data.timestamp || Date.now()),
        currentState: data.currentState,
        progressPercentage: data.progressPercentage,
        currentWaypointIndex: data.currentWaypointIndex,
        currentLatitude: data.currentLatitude,
        currentLongitude: data.currentLongitude,
        distanceRemaining: data.distanceRemaining,
        estimatedTimeRemaining: data.estimatedTimeRemaining,
        statusMessage: data.statusMessage,
        additionalData: data.additionalData,
      });

      await this.missionStatusRepository.save(missionStatus);

      // Update mission progress in relational database
      const updateData: any = {
        progressPercentage: data.progressPercentage,
      };

      if (data.currentState === 'in_progress' && !data.actualStartTime) {
        updateData.actualStartTime = new Date();
        updateData.state = MissionState.IN_PROGRESS;
      }

      if (data.currentState === 'completed') {
        updateData.actualCompletionTime = new Date();
        updateData.state = MissionState.COMPLETED;
        updateData.progressPercentage = 100;
      }

      if (data.currentState === 'failed') {
        updateData.state = MissionState.FAILED;
      }

      await this.missionRepository.update({ missionId: data.missionId }, updateData);

      this.logger.debug(`Mission status received for ${data.missionId} from ${vehicleId}`);
    } catch (error) {
      this.logger.error(`Error saving mission status:`, error);
    }
  }

  private async handleAuth(vehicleId: string, data: any) {
    try {
      this.logger.log(`Authentication request from vehicle ${vehicleId}`);
      
      // Verify the vehicle exists and credentials are correct
      const vehicle = await this.vehicleRepository.findOne({
        where: { vehicleId },
        select: ['id', 'vehicleId', 'passwordHash', 'status', 'model'],
      });

      if (!vehicle) {
        this.logger.warn(`Authentication failed: vehicle ${vehicleId} not found`);
        return;
      }

      // Verify the password hash
      const bcrypt = require('bcrypt');
      const isPasswordValid = await bcrypt.compare(data.password, vehicle.passwordHash);

      if (!isPasswordValid) {
        this.logger.warn(`Authentication failed: invalid password for vehicle ${vehicleId}`);
        return;
      }

      // Generate JWT token
      const jwt = require('jsonwebtoken');
      const secret = this.configService.get('VEHICLE_JWT_SECRET');
      const token = jwt.sign(
        {
          vehicleId: vehicle.vehicleId,
          model: vehicle.model,
          jti: `${Date.now()}-${Math.random()}`,
        },
        secret,
        { expiresIn: '30d' },
      );

      // Store the current token
      await this.vehicleRepository.update(
        { vehicleId },
        { currentToken: token, lastSeenAt: new Date() },
      );

      // Publish the token back to the vehicle
      await this.publishAuthToken(vehicleId, token);

      this.logger.log(`Authentication successful for vehicle ${vehicleId}`);
    } catch (error) {
      this.logger.error(`Error handling authentication for ${vehicleId}:`, error);
    }
  }

  // Publish mission command to vehicle
  async publishMissionCommand(vehicleId: string, mission: any) {
    const topic = `vehicle/${vehicleId}/mission/command`;
    const message = JSON.stringify(mission);

    return new Promise((resolve, reject) => {
      this.client.publish(topic, message, { qos: 1 }, (error) => {
        if (error) {
          this.logger.error(`Failed to publish mission to ${vehicleId}:`, error);
          reject(error);
        } else {
          this.logger.log(`Mission published to vehicle ${vehicleId}`);
          resolve(true);
        }
      });
    });
  }

  // Publish authentication token to vehicle
  async publishAuthToken(vehicleId: string, token: string) {
    const topic = `vehicle/${vehicleId}/auth/token`;
    const message = JSON.stringify({ token, timestamp: Date.now() });

    return new Promise((resolve, reject) => {
      this.client.publish(topic, message, { qos: 1 }, (error) => {
        if (error) {
          this.logger.error(`Failed to publish auth token to ${vehicleId}:`, error);
          reject(error);
        } else {
          this.logger.log(`Auth token published to vehicle ${vehicleId}`);
          resolve(true);
        }
      });
    });
  }

  // Publish generic message to vehicle
  async publish(topic: string, message: any, qos: 0 | 1 | 2 = 1) {
    return new Promise((resolve, reject) => {
      this.client.publish(topic, JSON.stringify(message), { qos }, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve(true);
        }
      });
    });
  }
}
