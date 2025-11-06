import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MqttService } from './mqtt.service';
import { MqttController } from './mqtt.controller';
import { Vehicle } from '../vehicle/entities/vehicle.entity';
import { VehicleTelemetry } from '../vehicle/entities/vehicle-telemetry.entity';
import { VehicleHealth } from '../vehicle/entities/vehicle-health.entity';
import { MissionStatus } from '../mission/entities/mission-status.entity';
import { Mission } from '../mission/entities/mission.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Vehicle, Mission], 'default'),
    TypeOrmModule.forFeature([VehicleTelemetry, VehicleHealth, MissionStatus], 'timescale'),
  ],
  providers: [MqttService],
  controllers: [MqttController],
  exports: [MqttService],
})
export class MqttModule {}
