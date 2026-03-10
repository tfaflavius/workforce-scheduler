import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';

const CACHE_TTL_KEY = 'cache_ttl';
const CACHE_KEY_PREFIX = 'cache_key';

/**
 * Decorator to set cache TTL on a route handler (in seconds)
 * @param ttl Time to live in seconds
 */
export const CacheTTL = (ttl: number) => SetMetadata(CACHE_TTL_KEY, ttl);

/**
 * Decorator to set a custom cache key prefix
 * @param key Cache key prefix
 */
export const CacheKey = (key: string) => SetMetadata(CACHE_KEY_PREFIX, key);

interface CacheEntry {
  data: any;
  expiresAt: number;
}

/**
 * Simple in-memory HTTP GET cache interceptor.
 * Only caches GET requests. Respects CacheTTL and CacheKey decorators.
 * Default TTL: 30 seconds.
 */
@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  private cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL = 30; // 30 seconds default
  private readonly MAX_CACHE_SIZE = 500;

  constructor(private reflector: Reflector) {
    // Cleanup expired entries every 60 seconds
    setInterval(() => this.cleanup(), 60000);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    const ttl = this.reflector.get<number>(CACHE_TTL_KEY, context.getHandler()) ?? this.DEFAULT_TTL;
    const keyPrefix = this.reflector.get<string>(CACHE_KEY_PREFIX, context.getHandler()) ?? '';

    // Build cache key from URL + query params + user ID (for user-specific caches)
    const userId = request.user?.id || 'anon';
    const cacheKey = `${keyPrefix}:${userId}:${request.url}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return of(cached.data);
    }

    // Execute handler and cache result
    return next.handle().pipe(
      tap((data) => {
        // Evict oldest entries if cache is full
        if (this.cache.size >= this.MAX_CACHE_SIZE) {
          const firstKey = this.cache.keys().next().value;
          if (firstKey) this.cache.delete(firstKey);
        }
        this.cache.set(cacheKey, {
          data,
          expiresAt: Date.now() + ttl * 1000,
        });
      }),
    );
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }
}
