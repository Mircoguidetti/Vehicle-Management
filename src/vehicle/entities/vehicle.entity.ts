import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum VehicleStatus {
  REGISTERED = 'registered',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  DECOMMISSIONED = 'decommissioned',
}

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  vehicleId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  model: string;

  @Column({ nullable: true })
  manufacturer: string;

  @Column({
    type: 'enum',
    enum: VehicleStatus,
    default: VehicleStatus.REGISTERED,
  })
  status: VehicleStatus;

  @Column()
  passwordHash: string;

  @Column({ nullable: true })
  currentToken: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  capabilities: string[];

  @Column({ nullable: true })
  lastSeenAt: Date;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  lastKnownLatitude: number;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  lastKnownLongitude: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
