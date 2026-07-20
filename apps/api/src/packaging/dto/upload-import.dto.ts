import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Length } from "class-validator";

export class UploadImportDto {
  @ApiProperty({ example: "v1" })
  @IsString()
  @IsNotEmpty()
  public contractVersion!: string;

  @ApiProperty({ example: "evt-001" })
  @IsString()
  @IsNotEmpty()
  public sourceEventId!: string;

  @ApiProperty({ example: "BATCH-2026-07" })
  @IsString()
  @IsNotEmpty()
  public batchCode!: string;

  @ApiProperty({ example: "ES" })
  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  public countryCode!: string;

  @ApiProperty({ example: "EUR" })
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  public currencyCode!: string;
}
