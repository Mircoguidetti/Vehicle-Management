import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Mission, MissionState } from '../mission/entities/mission.entity';
import { MissionStatus } from '../mission/entities/mission-status.entity';
import { Vehicle, VehicleStatus } from '../vehicle/entities/vehicle.entity';
import { VehicleTelemetry } from '../vehicle/entities/vehicle-telemetry.entity';
import { VehicleHealth } from '../vehicle/entities/vehicle-health.entity';

export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  vehicleIds?: string[];
  missionStates?: MissionState[];
  missionTypes?: string[];
}

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Mission, 'default')
    private missionRepository: Repository<Mission>,
    @InjectRepository(Vehicle, 'default')
    private vehicleRepository: Repository<Vehicle>,
    @InjectRepository(MissionStatus, 'timescale')
    private missionStatusRepository: Repository<MissionStatus>,
    @InjectRepository(VehicleTelemetry, 'timescale')
    private telemetryRepository: Repository<VehicleTelemetry>,
    @InjectRepository(VehicleHealth, 'timescale')
    private healthRepository: Repository<VehicleHealth>,
  ) {}

  async generateMissionReport(filters: ReportFilters = {}) {
    const { startDate, endDate, vehicleIds, missionStates, missionTypes } = filters;

    const whereConditions: any = {};

    if (startDate && endDate) {
      whereConditions.createdAt = Between(startDate, endDate);
    }

    if (vehicleIds && vehicleIds.length > 0) {
      whereConditions.assignedVehicleId = In(vehicleIds);
    }

    if (missionStates && missionStates.length > 0) {
      whereConditions.state = In(missionStates);
    }

    if (missionTypes && missionTypes.length > 0) {
      whereConditions.type = In(missionTypes);
    }

    const missions = await this.missionRepository.find({
      where: whereConditions,
      relations: ['assignedVehicle'],
      order: { createdAt: 'DESC' },
    });

    // Calculate statistics
    const statistics = {
      totalMissions: missions.length,
      byState: this.groupByField(missions, 'state'),
      byType: this.groupByField(missions, 'type'),
      byPriority: this.groupByField(missions, 'priority'),
      completionRate: this.calculateCompletionRate(missions),
      averageDuration: this.calculateAverageDuration(missions),
    };

    // Get detailed mission data
    const missionDetails = await Promise.all(
      missions.map(async (mission) => {
        const statusHistory = await this.missionStatusRepository.find({
          where: { missionId: mission.missionId },
          order: { timestamp: 'ASC' },
          take: 100,
        });

        return {
          missionId: mission.missionId,
          name: mission.name,
          type: mission.type,
          state: mission.state,
          priority: mission.priority,
          assignedVehicle: mission.assignedVehicle
            ? {
                vehicleId: mission.assignedVehicle.vehicleId,
                name: mission.assignedVehicle.name,
              }
            : null,
          scheduledStartTime: mission.scheduledStartTime,
          actualStartTime: mission.actualStartTime,
          actualCompletionTime: mission.actualCompletionTime,
          progressPercentage: mission.progressPercentage,
          duration: this.calculateMissionDuration(mission),
          statusUpdates: statusHistory.length,
          createdAt: mission.createdAt,
        };
      }),
    );

    return {
      reportMetadata: {
        generatedAt: new Date(),
        filters,
      },
      statistics,
      missions: missionDetails,
    };
  }

  async generateVehicleReport(filters: ReportFilters = {}) {
    const { startDate, endDate, vehicleIds } = filters;

    const whereConditions: any = {};

    if (vehicleIds && vehicleIds.length > 0) {
      whereConditions.vehicleId = In(vehicleIds);
    }

    const vehicles = await this.vehicleRepository.find({
      where: whereConditions,
    });

    const vehicleDetails = await Promise.all(
      vehicles.map(async (vehicle) => {
        // Get mission statistics
        const missionCount = await this.missionRepository.count({
          where: {
            assignedVehicleId: vehicle.vehicleId,
            ...(startDate && endDate
              ? { createdAt: Between(startDate, endDate) }
              : {}),
          },
        });

        // Get telemetry statistics
        const telemetryWhere: any = { vehicleId: vehicle.vehicleId };
        if (startDate && endDate) {
          telemetryWhere.timestamp = Between(startDate, endDate);
        }

        const telemetryCount = await this.telemetryRepository.count({
          where: telemetryWhere,
        });

        // Get latest health status
        const latestHealth = await this.healthRepository.findOne({
          where: { vehicleId: vehicle.vehicleId },
          order: { timestamp: 'DESC' },
        });

        return {
          vehicleId: vehicle.vehicleId,
          name: vehicle.name,
          model: vehicle.model,
          manufacturer: vehicle.manufacturer,
          status: vehicle.status,
          capabilities: vehicle.capabilities,
          lastSeenAt: vehicle.lastSeenAt,
          lastKnownLocation: {
            latitude: vehicle.lastKnownLatitude,
            longitude: vehicle.lastKnownLongitude,
          },
          statistics: {
            totalMissions: missionCount,
            telemetryDataPoints: telemetryCount,
            currentHealth: latestHealth
              ? {
                  status: latestHealth.overallStatus,
                  timestamp: latestHealth.timestamp,
                  batteryHealth: latestHealth.batteryHealth,
                }
              : null,
          },
          createdAt: vehicle.createdAt,
        };
      }),
    );

    return {
      reportMetadata: {
        generatedAt: new Date(),
        filters,
      },
      statistics: {
        totalVehicles: vehicles.length,
        byStatus: this.groupByField(vehicles, 'status'),
      },
      vehicles: vehicleDetails,
    };
  }

  async generateFleetSummary() {
    const vehicles = await this.vehicleRepository.find();
    const missions = await this.missionRepository.find();

    const activeMissions = missions.filter((m) => m.state === MissionState.IN_PROGRESS);
    const activeVehicles = vehicles.filter((v) => v.status === VehicleStatus.ACTIVE);

    return {
      generatedAt: new Date(),
      fleet: {
        totalVehicles: vehicles.length,
        activeVehicles: activeVehicles.length,
        vehiclesByStatus: this.groupByField(vehicles, 'status'),
      },
      missions: {
        totalMissions: missions.length,
        activeMissions: activeMissions.length,
        missionsByState: this.groupByField(missions, 'state'),
        missionsByType: this.groupByField(missions, 'type'),
      },
    };
  }

  private groupByField(items: any[], field: string): Record<string, number> {
    return items.reduce((acc, item) => {
      const value = item[field];
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  private calculateCompletionRate(missions: Mission[]): number {
    if (missions.length === 0) return 0;
    const completed = missions.filter((m) => m.state === MissionState.COMPLETED).length;
    return (completed / missions.length) * 100;
  }

  private calculateAverageDuration(missions: Mission[]): number | null {
    const completedMissions = missions.filter(
      (m) => m.actualStartTime && m.actualCompletionTime,
    );

    if (completedMissions.length === 0) return null;

    const totalDuration = completedMissions.reduce((sum, mission) => {
      const duration =
        new Date(mission.actualCompletionTime).getTime() -
        new Date(mission.actualStartTime).getTime();
      return sum + duration;
    }, 0);

    return totalDuration / completedMissions.length / 1000; // Return in seconds
  }

  private calculateMissionDuration(mission: Mission): number | null {
    if (!mission.actualStartTime || !mission.actualCompletionTime) {
      return null;
    }

    return (
      (new Date(mission.actualCompletionTime).getTime() -
        new Date(mission.actualStartTime).getTime()) /
      1000
    ); // Return in seconds
  }
}
