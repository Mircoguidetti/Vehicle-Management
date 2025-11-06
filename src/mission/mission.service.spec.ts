import { Test, TestingModule } from '@nestjs/testing';
import { MissionService } from './mission.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Mission } from './entities/mission.entity';
import { MissionStatus } from './entities/mission-status.entity';
import { Vehicle } from '../vehicle/entities/vehicle.entity';
import { MqttService } from '../mqtt/mqtt.service';

describe('MissionService', () => {
  let service: MissionService;
  let missionRepository: any;
  let vehicleRepository: any;
  let mqttService: any;

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    };

    const mockMqttService = {
      publishMissionCommand: jest.fn(),
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionService,
        {
          provide: getRepositoryToken(Mission, 'default'),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Vehicle, 'default'),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(MissionStatus, 'timescale'),
          useValue: mockRepository,
        },
        {
          provide: MqttService,
          useValue: mockMqttService,
        },
      ],
    }).compile();

    service = module.get<MissionService>(MissionService);
    missionRepository = module.get(getRepositoryToken(Mission, 'default'));
    vehicleRepository = module.get(getRepositoryToken(Vehicle, 'default'));
    mqttService = module.get<MqttService>(MqttService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createMission', () => {
    it('should create a mission successfully', async () => {
      const createDto = {
        name: 'Test Mission',
        description: 'Test Description',
        waypoints: [
          { latitude: 40.7128, longitude: -74.006 },
          { latitude: 40.7614, longitude: -73.9776 },
        ],
      };

      missionRepository.create.mockReturnValue({ ...createDto, missionId: 'MISSION-123' });
      missionRepository.save.mockResolvedValue({ ...createDto, missionId: 'MISSION-123' });

      const result = await service.createMission(createDto as any);

      expect(result).toHaveProperty('missionId');
      expect(missionRepository.save).toHaveBeenCalled();
    });
  });

  describe('assignMission', () => {
    it('should assign mission to vehicle successfully', async () => {
      const missionId = 'MISSION-123';
      const vehicleId = 'VEHICLE-001';

      missionRepository.findOne.mockResolvedValue({
        id: '1',
        missionId,
        name: 'Test Mission',
      });

      vehicleRepository.findOne.mockResolvedValue({
        id: '1',
        vehicleId,
        status: 'active',
      });

      missionRepository.save.mockResolvedValue({
        missionId,
        assignedVehicleId: vehicleId,
      });

      mqttService.publishMissionCommand.mockResolvedValue(true);

      const result = await service.assignMission(missionId, vehicleId);

      expect(result.assignedVehicleId).toBe(vehicleId);
      expect(mqttService.publishMissionCommand).toHaveBeenCalled();
    });
  });
});
