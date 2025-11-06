import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VehicleService } from './vehicle.service';
import { VehicleController } from './vehicle.controller';
import { Vehicle } from './entities/vehicle.entity';
import { VehicleTelemetry } from './entities/vehicle-telemetry.entity';
import { VehicleHealth } from './entities/vehicle-health.entity';
import { MqttModule } from '../mqtt/mqtt.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vehicle], 'default'),
    TypeOrmModule.forFeature([VehicleTelemetry, VehicleHealth], 'timescale'),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('VEHICLE_JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('VEHICLE_JWT_EXPIRATION'),
        },
      }),
    }),
    MqttModule,
  ],
  providers: [VehicleService],
  controllers: [VehicleController],
  exports: [VehicleService],
})
export class VehicleModule {}
