import { IsInt, IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString({ message: 'El nombre del producto debe ser una cadena de texto' })
  @MaxLength(255, { message: 'El nombre del producto no debe exceder los 255 caracteres' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'La descripción del producto debe ser una cadena de texto' })
  description?: string;

  @IsOptional()
  @IsNumber({}, { message: 'El precio debe ser un número decimal' })
  @Min(0.01, { message: 'El precio debe ser mayor que 0' })
  price?: number;

  @IsOptional()
  @IsInt({ message: 'El stock debe ser un número entero' })
  @Min(0, { message: 'El stock no puede ser negativo' })
  stock?: number;
}
