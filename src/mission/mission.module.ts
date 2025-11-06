import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MissionService } from './mission.service';
import { MissionController } from './mission.controller';
import { Mission } from './entities/mission.entity';
import { MissionStatus } from './entities/mission-status.entity';
import { Vehicle } from '../vehicle/entities/vehicle.entity';
import { MqttModule } from '../mqtt/mqtt.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Mission, Vehicle], 'default'),
    TypeOrmModule.forFeature([MissionStatus], 'timescale'),
    MqttModule,
  ],
  providers: [MissionService],
  controllers: [MissionController],
  exports: [MissionService],
})
export class MissionModule {}
