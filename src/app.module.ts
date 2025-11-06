import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from './config/database.module';
import { MqttModule } from './mqtt/mqtt.module';
import { VehicleModule } from './vehicle/vehicle.module';
import { MissionModule } from './mission/mission.module';
import { ReportModule } from './report/report.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    MqttModule,
    VehicleModule,
    MissionModule,
    ReportModule,
  ],
})
export class AppModule {}
