import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ type: Number })
  price: number;

  @ApiProperty({ type: 'integer', format: 'int32' })
  stock: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;
}
