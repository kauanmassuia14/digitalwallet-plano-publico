import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDateString, IsIn, IsNumber, IsOptional, Min } from "class-validator";

const TRANSITION_TARGETS = ["IN_CIRCULATION", "COLLECTED", "RECYCLED"] as const;

export type TransitionTarget = (typeof TRANSITION_TARGETS)[number];

export class TransitionPackagingDto {
  @ApiProperty({ enum: TRANSITION_TARGETS, example: "COLLECTED" })
  @IsIn(TRANSITION_TARGETS)
  public targetStatus!: TransitionTarget;

  @ApiProperty({ example: "2026-07-15T12:00:00.000Z" })
  @IsDateString({ strict: true })
  public occurredAt!: string;

  @ApiPropertyOptional({
    description: "Required when targetStatus is COLLECTED",
    example: 498.5,
    minimum: 0.01,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  public actualWeightGrams?: number;
}
