import {
  IsInt,
  IsNotEmpty,
  IsUUID,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty({ type: String, format: 'uuid' })
  @IsNotEmpty({ message: 'El ID del producto es obligatorio' })
  @IsUUID('4', { message: 'El ID del producto debe ser un UUID válido' })
  productId: string;

  @ApiProperty({ type: 'integer', format: 'int32', minimum: 1 })
  @IsNotEmpty({ message: 'La cantidad es obligatoria' })
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad mínima por producto debe ser 1' })
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: String, format: 'uuid' })
  @IsNotEmpty({ message: 'El ID del cliente es obligatorio' })
  @IsUUID('4', { message: 'El ID del cliente debe ser un UUID válido' })
  customerId: string;

  @ApiProperty({ type: () => OrderItemDto, isArray: true, minItems: 1 })
  @IsNotEmpty({ message: 'El pedido debe contener al menos un producto' })
  @ArrayMinSize(1, { message: 'El pedido debe contener al menos un producto' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
