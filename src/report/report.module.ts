import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { Mission } from '../mission/entities/mission.entity';
import { MissionStatus } from '../mission/entities/mission-status.entity';
import { Vehicle } from '../vehicle/entities/vehicle.entity';
import { VehicleTelemetry } from '../vehicle/entities/vehicle-telemetry.entity';
import { VehicleHealth } from '../vehicle/entities/vehicle-health.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Mission, Vehicle], 'default'),
    TypeOrmModule.forFeature([MissionStatus, VehicleTelemetry, VehicleHealth], 'timescale'),
  ],
  providers: [ReportService],
  controllers: [ReportController],
})
export class ReportModule {}
