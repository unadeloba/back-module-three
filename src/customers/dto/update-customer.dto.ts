import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCustomerDto {
  @ApiPropertyOptional({ type: String, maxLength: 255 })
  @IsOptional()
  @IsString({ message: 'El nombre completo debe ser una cadena de texto' })
  @MaxLength(255, {
    message: 'El nombre completo no debe exceder los 255 caracteres',
  })
  fullName?: string;

  @ApiPropertyOptional({ type: String, format: 'email', maxLength: 255 })
  @IsOptional()
  @IsEmail({}, { message: 'Debe proporcionar un correo electrónico válido' })
  @MaxLength(255, {
    message: 'El correo electrónico no debe exceder los 255 caracteres',
  })
  email?: string;

  @ApiPropertyOptional({ type: String, maxLength: 50 })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @MaxLength(50, { message: 'El teléfono no debe exceder los 50 caracteres' })
  phone?: string;
}
