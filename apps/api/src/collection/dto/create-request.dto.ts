import { IsDateString, IsNotEmpty, IsOptional, IsUUID } from "class-validator";

export class CreateRequestDto {
  @IsUUID("4", { message: "condominiumId must be a valid UUID v4" })
  @IsNotEmpty({ message: "condominiumId is required" })
  public condominiumId!: string;

  @IsOptional()
  @IsDateString({}, { message: "scheduledFor must be a valid ISO-8601 date string" })
  public scheduledFor?: string;
}
