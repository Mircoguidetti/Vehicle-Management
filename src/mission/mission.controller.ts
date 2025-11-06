import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { MissionService } from './mission.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { MissionState } from './entities/mission.entity';

@ApiTags('missions')
@Controller('missions')
export class MissionController {
  constructor(private readonly missionService: MissionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new mission' })
  @ApiResponse({ status: 201, description: 'Mission created successfully' })
  async create(@Body() createDto: CreateMissionDto) {
    return this.missionService.createMission(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all missions' })
  @ApiQuery({ name: 'state', enum: MissionState, required: false })
  @ApiResponse({ status: 200, description: 'List of all missions' })
  async getAll(@Query('state') state?: MissionState) {
    if (state) {
      return this.missionService.getMissionsByState(state);
    }
    return this.missionService.getAllMissions();
  }

  @Get('vehicle/:vehicleId')
  @ApiOperation({ summary: 'Get missions for a specific vehicle' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  @ApiResponse({ status: 200, description: 'List of missions for the vehicle' })
  async getByVehicle(@Param('vehicleId') vehicleId: string) {
    return this.missionService.getMissionsByVehicle(vehicleId);
  }

  @Get(':missionId')
  @ApiOperation({ summary: 'Get mission by ID' })
  @ApiResponse({ status: 200, description: 'Mission details' })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  async getOne(@Param('missionId') missionId: string) {
    return this.missionService.getMissionById(missionId);
  }

  @Get(':missionId/status')
  @ApiOperation({ summary: 'Get mission status history' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Mission status history' })
  async getStatus(
    @Param('missionId') missionId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.missionService.getMissionStatus(missionId, start, end);
  }

  @Patch(':missionId')
  @ApiOperation({ summary: 'Update mission' })
  @ApiResponse({ status: 200, description: 'Mission updated successfully' })
  async update(@Param('missionId') missionId: string, @Body() updateDto: UpdateMissionDto) {
    return this.missionService.updateMission(missionId, updateDto);
  }

  @Post(':missionId/assign/:vehicleId')
  @ApiOperation({ summary: 'Assign mission to a vehicle' })
  @ApiResponse({ status: 200, description: 'Mission assigned successfully' })
  async assign(@Param('missionId') missionId: string, @Param('vehicleId') vehicleId: string) {
    return this.missionService.assignMission(missionId, vehicleId);
  }

  @Delete(':missionId')
  @ApiOperation({ summary: 'Cancel a mission' })
  @ApiResponse({ status: 200, description: 'Mission cancelled successfully' })
  async cancel(@Param('missionId') missionId: string) {
    return this.missionService.cancelMission(missionId);
  }
}
