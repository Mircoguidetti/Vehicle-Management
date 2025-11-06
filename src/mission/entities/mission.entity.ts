import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Vehicle } from '../../vehicle/entities/vehicle.entity';

export enum MissionType {
  DELIVERY = 'delivery',
  PATROL = 'patrol',
  INSPECTION = 'inspection',
  SURVEY = 'survey',
  CUSTOM = 'custom',
}

export enum MissionPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum MissionState {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('missions')
export class Mission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  missionId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: MissionType,
    default: MissionType.CUSTOM,
  })
  type: MissionType;

  @Column({
    type: 'enum',
    enum: MissionPriority,
    default: MissionPriority.MEDIUM,
  })
  priority: MissionPriority;

  @Column({
    type: 'enum',
    enum: MissionState,
    default: MissionState.PENDING,
  })
  state: MissionState;

  @Column({ nullable: true })
  @Index()
  assignedVehicleId: string;

  @ManyToOne(() => Vehicle, { nullable: true })
  @JoinColumn({ name: 'assignedVehicleId', referencedColumnName: 'vehicleId' })
  assignedVehicle: Vehicle;

  @Column({ type: 'jsonb' })
  waypoints: Array<{
    latitude: number;
    longitude: number;
    altitude?: number;
    action?: string;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  parameters: Record<string, any>;

  @Column({ nullable: true })
  scheduledStartTime: Date;

  @Column({ nullable: true })
  actualStartTime: Date;

  @Column({ nullable: true })
  estimatedCompletionTime: Date;

  @Column({ nullable: true })
  actualCompletionTime: Date;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  progressPercentage: number;

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
