import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Mission, MissionState, MissionType, MissionPriority } from './entities/mission.entity';
import { MissionStatus } from './entities/mission-status.entity';
import { Vehicle, VehicleStatus } from '../vehicle/entities/vehicle.entity';
import { MqttService } from '../mqtt/mqtt.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';

@Injectable()
export class MissionService {
  private readonly logger = new Logger(MissionService.name);

  constructor(
    @InjectRepository(Mission, 'default')
    private missionRepository: Repository<Mission>,
    @InjectRepository(Vehicle, 'default')
    private vehicleRepository: Repository<Vehicle>,
    @InjectRepository(MissionStatus, 'timescale')
    private missionStatusRepository: Repository<MissionStatus>,
    private mqttService: MqttService,
  ) {}

  async createMission(createDto: CreateMissionDto) {
    const {
      name,
      description,
      type,
      priority,
      assignedVehicleId,
      waypoints,
      parameters,
      scheduledStartTime,
    } = createDto;

    // Validate vehicle if assigned
    if (assignedVehicleId) {
      const vehicle = await this.vehicleRepository.findOne({
        where: { vehicleId: assignedVehicleId },
      });

      if (!vehicle) {
        throw new NotFoundException('Assigned vehicle not found');
      }

      if (vehicle.status !== VehicleStatus.ACTIVE) {
        throw new BadRequestException('Vehicle is not active');
      }
    }

    // Create mission
    const mission = this.missionRepository.create({
      missionId: `MISSION-${uuidv4()}`,
      name,
      description,
      type: type || MissionType.CUSTOM,
      priority: priority || MissionPriority.MEDIUM,
      state: assignedVehicleId ? MissionState.ASSIGNED : MissionState.PENDING,
      assignedVehicleId,
      waypoints,
      parameters,
      scheduledStartTime,
    });

    const savedMission = await this.missionRepository.save(mission);

    // If vehicle is assigned, publish mission command
    if (assignedVehicleId) {
      await this.publishMissionToVehicle(savedMission);
    }

    this.logger.log(`Mission ${savedMission.missionId} created`);

    return savedMission;
  }

  async getAllMissions() {
    return this.missionRepository.find({
      relations: ['assignedVehicle'],
      order: { createdAt: 'DESC' },
    });
  }

  async getMissionById(missionId: string) {
    const mission = await this.missionRepository.findOne({
      where: { missionId },
      relations: ['assignedVehicle'],
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    return mission;
  }

  async updateMission(missionId: string, updateDto: UpdateMissionDto) {
    const mission = await this.getMissionById(missionId);

    // Update fields
    Object.assign(mission, updateDto);

    const updatedMission = await this.missionRepository.save(mission);

    // If vehicle assignment changed, publish to new vehicle
    if (updateDto.assignedVehicleId && updateDto.assignedVehicleId !== mission.assignedVehicleId) {
      await this.publishMissionToVehicle(updatedMission);
    }

    return updatedMission;
  }

  async assignMission(missionId: string, vehicleId: string) {
    const mission = await this.getMissionById(missionId);

    // Check vehicle exists and is active
    const vehicle = await this.vehicleRepository.findOne({
      where: { vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    if (vehicle.status !== VehicleStatus.ACTIVE) {
      throw new BadRequestException('Vehicle is not active');
    }

    // Update mission
    mission.assignedVehicleId = vehicleId;
    mission.state = MissionState.ASSIGNED;

    const updatedMission = await this.missionRepository.save(mission);

    // Publish mission to vehicle
    await this.publishMissionToVehicle(updatedMission);

    this.logger.log(`Mission ${missionId} assigned to vehicle ${vehicleId}`);

    return updatedMission;
  }

  async cancelMission(missionId: string) {
    const mission = await this.getMissionById(missionId);

    mission.state = MissionState.CANCELLED;
    const updatedMission = await this.missionRepository.save(mission);

    // Notify vehicle if assigned
    if (mission.assignedVehicleId) {
      await this.mqttService.publish(`vehicle/${mission.assignedVehicleId}/mission/cancel`, {
        missionId,
        timestamp: Date.now(),
      });
    }

    this.logger.log(`Mission ${missionId} cancelled`);

    return updatedMission;
  }

  async getMissionStatus(missionId: string, startDate?: Date, endDate?: Date) {
    const whereCondition: any = { missionId };

    if (startDate && endDate) {
      whereCondition.timestamp = Between(startDate, endDate);
    }

    return this.missionStatusRepository.find({
      where: whereCondition,
      order: { timestamp: 'DESC' },
      take: 1000,
    });
  }

  async getMissionsByVehicle(vehicleId: string) {
    return this.missionRepository.find({
      where: { assignedVehicleId: vehicleId },
      order: { createdAt: 'DESC' },
    });
  }

  async getMissionsByState(state: MissionState) {
    return this.missionRepository.find({
      where: { state },
      relations: ['assignedVehicle'],
      order: { createdAt: 'DESC' },
    });
  }

  private async publishMissionToVehicle(mission: Mission) {
    if (!mission.assignedVehicleId) {
      return;
    }

    const missionPayload = {
      missionId: mission.missionId,
      name: mission.name,
      description: mission.description,
      type: mission.type,
      priority: mission.priority,
      waypoints: mission.waypoints,
      parameters: mission.parameters,
      scheduledStartTime: mission.scheduledStartTime,
    };

    await this.mqttService.publishMissionCommand(mission.assignedVehicleId, missionPayload);
  }
}
