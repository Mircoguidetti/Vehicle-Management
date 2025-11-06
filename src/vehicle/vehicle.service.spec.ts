import { Test, TestingModule } from '@nestjs/testing';
import { VehicleService } from './vehicle.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Vehicle } from './entities/vehicle.entity';
import { VehicleTelemetry } from './entities/vehicle-telemetry.entity';
import { VehicleHealth } from './entities/vehicle-health.entity';
import { MqttService } from '../mqtt/mqtt.service';

describe('VehicleService', () => {
  let service: VehicleService;
  let vehicleRepository: any;
  let jwtService: any;
  let mqttService: any;

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const mockMqttService = {
      publishAuthToken: jest.fn(),
      publishMissionCommand: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleService,
        {
          provide: getRepositoryToken(Vehicle, 'default'),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(VehicleTelemetry, 'timescale'),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(VehicleHealth, 'timescale'),
          useValue: mockRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: MqttService,
          useValue: mockMqttService,
        },
      ],
    }).compile();

    service = module.get<VehicleService>(VehicleService);
    vehicleRepository = module.get(getRepositoryToken(Vehicle, 'default'));
    jwtService = module.get<JwtService>(JwtService);
    mqttService = module.get<MqttService>(MqttService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerVehicle', () => {
    it('should register a new vehicle successfully', async () => {
      const registerDto = {
        vehicleId: 'TEST-001',
        password: 'password123',
        name: 'Test Vehicle',
        model: 'Model X',
        manufacturer: 'Test Manufacturer',
      };

      vehicleRepository.findOne.mockResolvedValue(null);
      vehicleRepository.create.mockReturnValue({ ...registerDto, id: '123' });
      vehicleRepository.save.mockResolvedValue({ ...registerDto, id: '123' });
      jwtService.sign.mockReturnValue('test-token');
      vehicleRepository.update.mockResolvedValue({});
      mqttService.publishAuthToken.mockResolvedValue(true);

      const result = await service.registerVehicle(registerDto);

      expect(result).toHaveProperty('vehicleId', 'TEST-001');
      expect(result).toHaveProperty('token');
      expect(mqttService.publishAuthToken).toHaveBeenCalled();
    });

    it('should throw ConflictException if vehicle already exists', async () => {
      const registerDto = {
        vehicleId: 'TEST-001',
        password: 'password123',
        name: 'Test Vehicle',
      };

      vehicleRepository.findOne.mockResolvedValue({ id: '123', ...registerDto });

      await expect(service.registerVehicle(registerDto as any)).rejects.toThrow();
    });
  });
});
