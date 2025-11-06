import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('mission_status')
@Index(['missionId', 'timestamp'])
export class MissionStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  missionId: string;

  @Column()
  @Index()
  vehicleId: string;

  @Column({ type: 'timestamptz' })
  @Index()
  timestamp: Date;

  @Column()
  currentState: string;

  @Column('decimal', { precision: 5, scale: 2 })
  progressPercentage: number;

  @Column({ nullable: true })
  currentWaypointIndex: number;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  currentLatitude: number;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  currentLongitude: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  distanceRemaining: number;

  @Column({ nullable: true })
  estimatedTimeRemaining: number;

  @Column({ type: 'jsonb', nullable: true })
  statusMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  additionalData: Record<string, any>;
}
