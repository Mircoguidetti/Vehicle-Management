import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Vehicle } from '../vehicle/entities/vehicle.entity';
import { Mission } from '../mission/entities/mission.entity';
import { VehicleTelemetry } from '../vehicle/entities/vehicle-telemetry.entity';
import { VehicleHealth } from '../vehicle/entities/vehicle-health.entity';
import { MissionStatus } from '../mission/entities/mission-status.entity';

@Module({
  imports: [
    // PostgreSQL connection for relational data
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      name: 'default',
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [Vehicle, Mission],
        synchronize: configService.get('DB_SYNCHRONIZE') === 'true',
        logging: configService.get('DB_LOGGING') === 'true',
      }),
    }),
    // TimescaleDB connection for time-series data
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      name: 'timescale',
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('TIMESCALE_HOST'),
        port: configService.get('TIMESCALE_PORT'),
        username: configService.get('TIMESCALE_USERNAME'),
        password: configService.get('TIMESCALE_PASSWORD'),
        database: configService.get('TIMESCALE_DATABASE'),
        entities: [VehicleTelemetry, VehicleHealth, MissionStatus],
        synchronize: configService.get('DB_SYNCHRONIZE') === 'true',
        logging: configService.get('DB_LOGGING') === 'true',
      }),
    }),
  ],
})
export class DatabaseModule {}
