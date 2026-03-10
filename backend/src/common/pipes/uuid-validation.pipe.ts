import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Global pipe that validates UUID format for route parameters named 'id'.
 * Prevents malformed IDs from reaching TypeORM queries.
 * Applied globally in main.ts — no per-controller changes needed.
 */
@Injectable()
export class GlobalUuidValidationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (
      metadata.type === 'param' &&
      metadata.data === 'id' &&
      typeof value === 'string'
    ) {
      if (!UUID_REGEX.test(value)) {
        throw new BadRequestException(
          `Format UUID invalid pentru parametrul '${metadata.data}'`,
        );
      }
    }
    return value;
  }
}
