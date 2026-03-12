import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { filterXSS } from 'xss';

/**
 * Global XSS sanitization interceptor.
 * Recursively sanitizes all string values in request body
 * to prevent stored XSS attacks.
 *
 * Applied globally in main.ts — no per-controller setup needed.
 */
@Injectable()
export class XssSanitizeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    if (request.body && typeof request.body === 'object') {
      request.body = this.sanitize(request.body);
    }

    return next.handle();
  }

  /**
   * Recursively sanitize all string values in an object/array.
   * Strips HTML tags and dangerous attributes from strings.
   */
  private sanitize(value: any): any {
    if (typeof value === 'string') {
      return filterXSS(value, {
        whiteList: {},           // strip ALL HTML tags
        stripIgnoreTag: true,    // strip tags not in whitelist
        stripIgnoreTagBody: ['script', 'style'], // remove <script>/<style> entirely
      });
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }

    if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      const sanitized: Record<string, any> = {};
      for (const key of Object.keys(value)) {
        sanitized[key] = this.sanitize(value[key]);
      }
      return sanitized;
    }

    return value;
  }
}
