import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ApiErrorResponse {
  success: false;
  statusCode: number;
  error: string;
  message: string | string[] | Record<string, unknown>;
  timestamp: string;
  path: string;
  method: string;
  requestId?: string;
  details?: unknown;
}

@Catch()
export class CustomExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(CustomExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const requestId = this.getRequestId(response);
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload = this.buildPayload(
      exception,
      statusCode,
      request,
      requestId,
    );

    const trace = [
      requestId ?? 'no-request-id',
      request.method,
      request.originalUrl || request.url,
      JSON.stringify(payload.message),
    ].join(' - ');

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        trace,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(trace);
    }

    response.status(statusCode).json(payload);
  }

  private buildPayload(
    exception: unknown,
    statusCode: number,
    request: Request,
    requestId?: string,
  ): ApiErrorResponse {
    let message: string | string[] | Record<string, unknown> =
      'Internal server error';
    let details: unknown;

    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === 'string') {
        message = response;
      } else if (this.isRecord(response)) {
        if (response.message !== undefined) {
          message = this.normalizeMessage(response.message);
        }

        const detailEntries = Object.entries(response).filter(
          ([key]) => !['statusCode', 'message', 'error'].includes(key),
        );

        if (detailEntries.length > 0) {
          details = Object.fromEntries(detailEntries);
        }
      }
    } else if (exception instanceof Error) {
      message =
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : exception.message;
    }

    const errorName = HttpStatus[statusCode] ?? 'Error';

    return {
      success: false,
      statusCode,
      error: errorName,
      message,
      timestamp: new Date().toISOString(),
      path: request.originalUrl || request.url,
      method: request.method,
      ...(requestId ? { requestId } : {}),
      ...(details !== undefined ? { details } : {}),
    };
  }

  private normalizeMessage(
    message: unknown,
  ): string | string[] | Record<string, unknown> {
    if (typeof message === 'string') {
      return message;
    }

    if (Array.isArray(message)) {
      return message.map((item) =>
        typeof item === 'string' ? item : JSON.stringify(item),
      );
    }

    if (this.isRecord(message)) {
      return message;
    }

    return 'Request failed';
  }

  private getRequestId(response: Response): string | undefined {
    const header = response.getHeader('X-Request-ID');

    if (typeof header === 'string') {
      return header;
    }

    if (Array.isArray(header) && typeof header[0] === 'string') {
      return header[0];
    }

    return undefined;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
}
