import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Length,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiPropertyOptional({ type: String, minLength: 1, maxLength: 255 })
  @IsOptional()
  @IsString({ message: 'El nombre del producto debe ser una cadena de texto' })
  @Length(1, 255, {
    message: 'El nombre del producto no debe exceder los 255 caracteres',
  })
  name?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString({
    message: 'La descripción del producto debe ser una cadena de texto',
  })
  description?: string;

  @ApiPropertyOptional({ type: Number, format: 'double', minimum: 0.01 })
  @IsOptional()
  @IsNumber({}, { message: 'El precio debe ser un número decimal' })
  @Min(0.01, { message: 'El precio debe ser mayor que 0' })
  price?: number;

  @ApiPropertyOptional({ type: 'integer', format: 'int32', minimum: 0 })
  @IsOptional()
  @IsInt({ message: 'El stock debe ser un número entero' })
  @Min(0, { message: 'El stock no puede ser negativo' })
  stock?: number;
}
