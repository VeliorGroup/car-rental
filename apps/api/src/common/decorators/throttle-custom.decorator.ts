import { SetMetadata } from '@nestjs/common';
import { ThrottlerOptions } from '@nestjs/throttler';

export const THROTTLE_CUSTOM_KEY = 'throttle:custom';

export const ThrottleCustom = (options: ThrottlerOptions) =>
  SetMetadata(THROTTLE_CUSTOM_KEY, options);
