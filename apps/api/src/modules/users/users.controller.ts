import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get all users in tenant' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async findAll(@Req() req: any) {
    return this.usersService.findAll(req.user.tenantId);
  }

  @Get('roles')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get all available roles' })
  @ApiResponse({ status: 200, description: 'List of roles' })
  async getRoles() {
    return this.usersService.getRoles();
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.usersService.findOne(id, req.user.tenantId);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'User already exists or invalid data' })
  async create(@Body() createUserDto: CreateUserDto, @Req() req: any) {
    return this.usersService.create(createUserDto, req.user.tenantId);
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: any,
  ) {
    return this.usersService.update(id, updateUserDto, req.user.tenantId);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Cannot delete own account' })
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.usersService.remove(id, req.user.tenantId, req.user.sub);
  }
}
