import { SetMetadata } from '@nestjs/common';

export const PlanLimit = (resource: 'maxVehicles' | 'maxUsers' | 'maxLocations') => SetMetadata('planResource', resource);
