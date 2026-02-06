import { Module } from '@nestjs/common';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';


@Module({
    imports: [

    ],
    controllers: [VehiclesController],
    providers: [VehiclesService],
    exports: [VehiclesService],
})
export class VehiclesModule { }
