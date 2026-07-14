import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class CreateProductDto {
  @IsNotEmpty({ message: 'El nombre del producto es obligatorio' })
  @IsString({ message: 'El nombre del producto debe ser una cadena de texto' })
  @MaxLength(255, { message: 'El nombre del producto no debe exceder los 255 caracteres' })
  name: string;

  @IsOptional()
  @IsString({ message: 'La descripción del producto debe ser una cadena de texto' })
  description?: string;

  @IsNotEmpty({ message: 'El precio del producto es obligatorio' })
  @IsNumber({}, { message: 'El precio debe ser un número decimal' })
  @Min(0.01, { message: 'El precio debe ser mayor que 0' })
  price: number;

  @IsNotEmpty({ message: 'El stock del producto es obligatorio' })
  @IsInt({ message: 'El stock debe ser un número entero' })
  @Min(0, { message: 'El stock no puede ser negativo' })
  stock: number;
}
