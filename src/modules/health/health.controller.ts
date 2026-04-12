import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HealthService } from './health.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Check system health',
    description: 'Returns the health status of the application and its database connection.',
  })
  @ApiResponse({ status: 200, description: 'System is healthy' })
  @ApiResponse({ status: 503, description: 'System or database is unavailable' })
  async getHealth(@Res() res: Response) {
    const dbStatus = await this.healthService.checkDatabase();
    const isOk = dbStatus === 'ok';

    const response = {
      status: isOk ? 'ok' : 'error',
      db: dbStatus,
      timestamp: new Date().toISOString(),
    };

    return res.status(isOk ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json(response);
  }
}
