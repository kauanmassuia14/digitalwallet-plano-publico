import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class OfflineScanDto {
  @IsNotEmpty()
  @IsUUID()
  public packagingId!: string;

  @IsNotEmpty()
  @IsString()
  public externalQrHash!: string;

  @IsNotEmpty()
  @IsNumber()
  public actualWeightGrams!: number;

  @IsNotEmpty()
  @IsUUID()
  public consumerUserId!: string;

  @IsNotEmpty()
  @IsString()
  public collectedAt!: string;
}

export class SyncOfflineDto {
  @IsNotEmpty()
  @IsUUID()
  public cooperativeId!: string;

  @IsNotEmpty()
  @IsUUID()
  public operatorUserId!: string;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfflineScanDto)
  public scans!: OfflineScanDto[];

  @IsNotEmpty()
  @IsString()
  public signature!: string;
}
