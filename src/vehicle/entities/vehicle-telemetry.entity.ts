import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('vehicle_telemetry')
@Index(['vehicleId', 'timestamp'])
export class VehicleTelemetry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  vehicleId: string;

  @Column({ type: 'timestamptz' })
  @Index()
  timestamp: Date;

  @Column('decimal', { precision: 10, scale: 7 })
  latitude: number;

  @Column('decimal', { precision: 10, scale: 7 })
  longitude: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  altitude: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  speed: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  heading: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  batteryLevel: number;

  @Column({ type: 'jsonb', nullable: true })
  sensors: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  additionalData: Record<string, any>;
}
