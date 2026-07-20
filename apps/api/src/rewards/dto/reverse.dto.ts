import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class ReverseDto {
  @IsUUID()
  @IsNotEmpty()
  public originalTransactionId!: string;

  @IsString()
  @IsNotEmpty()
  public idempotencyKey!: string;
}
