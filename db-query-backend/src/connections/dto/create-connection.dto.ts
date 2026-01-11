import { IsString, IsNumber, IsIn } from 'class-validator';

export class CreateConnectionDto {
  @IsIn(['postgres', 'mysql'])
  dbType: 'postgres' | 'mysql';

  @IsString()
  host: string;

  @IsNumber()
  port: number;

  @IsString()
  database: string;

  @IsString()
  username: string;

  @IsString()
  password: string;
}
