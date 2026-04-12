import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsHandler');

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();

    const httpStatus =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const method = httpAdapter.getRequestMethod(request);
    const url = httpAdapter.getRequestUrl(request);
    const message = exception instanceof Error ? exception.message : 'Internal server error';
    const stack = exception instanceof Error ? exception.stack : 'No stack trace';

    // Refine logging:
    // - 5xx errors: Log as ERROR with full stack trace for debugging
    // - 4xx errors: Log as WARN without stack trace (normal client/auth actions)
    if (httpStatus >= 500) {
      this.logger.error(`${method} ${url} [${httpStatus}] - ${message}\nStack: ${stack}`);
    } else {
      this.logger.warn(`${method} ${url} [${httpStatus}] - ${message}`);
    }

    const responseBody = {
      success: false,
      statusCode: httpStatus,
      message: message,
      timestamp: new Date().toISOString(),
      path: url,
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
