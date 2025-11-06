import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

export enum HealthStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
  ERROR = 'error',
}

@Entity('vehicle_health')
@Index(['vehicleId', 'timestamp'])
export class VehicleHealth {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  vehicleId: string;

  @Column({ type: 'timestamptz' })
  @Index()
  timestamp: Date;

  @Column({
    type: 'enum',
    enum: HealthStatus,
    default: HealthStatus.HEALTHY,
  })
  overallStatus: HealthStatus;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  cpuUsage: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  memoryUsage: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  diskUsage: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  temperature: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  batteryHealth: number;

  @Column({ type: 'jsonb', nullable: true })
  systemErrors: string[];

  @Column({ type: 'jsonb', nullable: true })
  warnings: string[];

  @Column({ type: 'jsonb', nullable: true })
  diagnostics: Record<string, any>;
}
