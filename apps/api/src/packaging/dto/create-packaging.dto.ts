import { ApiProperty } from "@nestjs/swagger";
import {
  IsInt,
  IsNumber,
  IsString,
  IsUUID,
  Length,
  Matches,
  Min,
} from "class-validator";

export class CreatePackagingDto {
  @ApiProperty({ example: "33333333-3333-4333-8333-333333333333" })
  @IsUUID()
  public batchId!: string;

  @ApiProperty({ example: "00001234", maxLength: 128 })
  @IsString()
  @Length(1, 128)
  public serial!: string;

  @ApiProperty({ example: "PET", maxLength: 64 })
  @IsString()
  @Length(1, 64)
  public materialCode!: string;

  @ApiProperty({ example: 500, minimum: 0.01 })
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  public expectedWeightGrams!: number;

  @ApiProperty({ example: 62, minimum: 0 })
  @IsInt()
  @Min(0)
  public unitCostCents!: number;

  @ApiProperty({ example: 75, minimum: 0 })
  @IsInt()
  @Min(0)
  public rewardCents!: number;

  @ApiProperty({
    description: "SHA-256 digest of the external QR payload",
    example: "a".repeat(64),
  })
  @IsString()
  @Matches(/^[0-9a-fA-F]{64}$/)
  public externalQrHash!: string;

  @ApiProperty({
    description: "SHA-256 digest of the protected internal QR payload",
    example: "b".repeat(64),
  })
  @IsString()
  @Matches(/^[0-9a-fA-F]{64}$/)
  public internalQrHash!: string;
}
