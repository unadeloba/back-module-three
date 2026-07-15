import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OrderResponseDto } from './dto/order-response.dto';
import { mapOrderResponse } from './mappers/order-response.mapper';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiCreatedResponse({ type: OrderResponseDto })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  async create(@Body() createOrderDto: CreateOrderDto) {
    return mapOrderResponse(await this.ordersService.create(createOrderDto));
  }

  @Get()
  @ApiOkResponse({ type: OrderResponseDto, isArray: true })
  async findAll() {
    return (await this.ordersService.findAll()).map(mapOrderResponse);
  }

  @Get(':id')
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return mapOrderResponse(await this.ordersService.findOne(id));
  }

  @Patch(':id/status')
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    return mapOrderResponse(
      await this.ordersService.updateStatus(id, updateOrderStatusDto.status),
    );
  }
}
