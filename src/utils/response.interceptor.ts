import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';

export interface ApiSuccessResponse<T> {
  success: true;
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
  method: string;
  requestId?: string;
  data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccessResponse<T> | T
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessResponse<T> | T> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    return next.handle().pipe(
      map((data: T) => {
        if (data instanceof StreamableFile || this.isAlreadyWrapped(data)) {
          return data;
        }

        const statusCode = response.statusCode ?? HttpStatus.OK;
        const requestId = this.getRequestId(response);

        return {
          success: true,
          statusCode,
          message: statusCode === HttpStatus.CREATED ? 'Created' : 'Success',
          timestamp: new Date().toISOString(),
          path: request.originalUrl || request.url,
          method: request.method,
          ...(requestId ? { requestId } : {}),
          data,
        };
      }),
    );
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

  private isAlreadyWrapped(data: unknown): data is ApiSuccessResponse<T> {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const maybeResponse = data as Partial<ApiSuccessResponse<T>>;
    return (
      maybeResponse.success === true &&
      typeof maybeResponse.statusCode === 'number' &&
      typeof maybeResponse.timestamp === 'string' &&
      Object.prototype.hasOwnProperty.call(maybeResponse, 'data')
    );
  }
}
