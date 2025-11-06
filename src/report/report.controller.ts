import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ReportService } from './report.service';
import { MissionState } from '../mission/entities/mission.entity';

@ApiTags('reports')
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('missions')
  @ApiOperation({ summary: 'Generate mission report with filters' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'vehicleIds', required: false, type: String, isArray: true })
  @ApiQuery({ name: 'missionStates', required: false, enum: MissionState, isArray: true })
  @ApiQuery({ name: 'missionTypes', required: false, type: String, isArray: true })
  @ApiResponse({ status: 200, description: 'Mission report generated successfully' })
  async getMissionReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('vehicleIds') vehicleIds?: string | string[],
    @Query('missionStates') missionStates?: MissionState | MissionState[],
    @Query('missionTypes') missionTypes?: string | string[],
  ) {
    const filters = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      vehicleIds: vehicleIds
        ? Array.isArray(vehicleIds)
          ? vehicleIds
          : [vehicleIds]
        : undefined,
      missionStates: missionStates
        ? Array.isArray(missionStates)
          ? missionStates
          : [missionStates]
        : undefined,
      missionTypes: missionTypes
        ? Array.isArray(missionTypes)
          ? missionTypes
          : [missionTypes]
        : undefined,
    };

    return this.reportService.generateMissionReport(filters);
  }

  @Get('vehicles')
  @ApiOperation({ summary: 'Generate vehicle report with filters' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'vehicleIds', required: false, type: String, isArray: true })
  @ApiResponse({ status: 200, description: 'Vehicle report generated successfully' })
  async getVehicleReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('vehicleIds') vehicleIds?: string | string[],
  ) {
    const filters = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      vehicleIds: vehicleIds
        ? Array.isArray(vehicleIds)
          ? vehicleIds
          : [vehicleIds]
        : undefined,
    };

    return this.reportService.generateVehicleReport(filters);
  }

  @Get('fleet-summary')
  @ApiOperation({ summary: 'Get fleet summary' })
  @ApiResponse({ status: 200, description: 'Fleet summary generated successfully' })
  async getFleetSummary() {
    return this.reportService.generateFleetSummary();
  }
}
