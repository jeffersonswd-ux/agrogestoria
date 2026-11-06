import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@agrogestor.ia.br' })
  @IsEmail({}, { message: 'E-mail inválido' })
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Informe a senha' })
  password: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'A nova senha deve ter ao menos 8 caracteres' })
  newPassword: string;
}
