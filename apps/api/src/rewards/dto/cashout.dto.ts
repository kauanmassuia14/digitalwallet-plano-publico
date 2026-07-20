import { IsInt, IsNotEmpty, IsString, Min } from "class-validator";

export class CashoutDto {
  @IsInt()
  @Min(1)
  public amountCents!: number;

  @IsString()
  @IsNotEmpty()
  public destinationKey!: string;

  @IsString()
  @IsNotEmpty()
  public idempotencyKey!: string;
}
