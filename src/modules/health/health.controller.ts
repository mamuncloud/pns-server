import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth(@Res() res: Response) {
    const dbStatus = await this.healthService.checkDatabase();
    const isOk = dbStatus === 'ok';

    const response = {
      status: isOk ? 'ok' : 'error',
      db: dbStatus,
      timestamp: new Date().toISOString(),
    };

    return res
      .status(isOk ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .json(response);
  }
}
