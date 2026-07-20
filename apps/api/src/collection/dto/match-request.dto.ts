import { IsNotEmpty, IsUUID } from "class-validator";

export class MatchRequestDto {
  @IsUUID("4", { message: "cooperativeId must be a valid UUID v4" })
  @IsNotEmpty({ message: "cooperativeId is required" })
  public cooperativeId!: string;
}
