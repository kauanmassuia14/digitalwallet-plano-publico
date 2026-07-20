import { IsInt, IsNotEmpty, IsString, IsUUID, Min } from "class-validator";

export class EarnDto {
  @IsUUID()
  @IsNotEmpty()
  public userId!: string;

  @IsUUID()
  @IsNotEmpty()
  public packagingId!: string;

  @IsInt()
  @Min(1)
  public amountCents!: number;

  @IsString()
  @IsNotEmpty()
  public idempotencyKey!: string;
}
