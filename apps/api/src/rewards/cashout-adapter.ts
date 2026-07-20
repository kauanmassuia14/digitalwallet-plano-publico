import { Injectable } from "@nestjs/common";

export interface CashoutResult {
  success: boolean;
  providerReference?: string;
  failureCode?: string;
}

@Injectable()
export class CashoutAdapter {
  public async processCashout(
    amountCents: number,
    destinationKey: string,
  ): Promise<CashoutResult> {
    // Simulating external gateway latency
    await new Promise((resolve) => setTimeout(resolve, 50));

    if (destinationKey === "FAIL_KEY" || destinationKey.includes("fail")) {
      return {
        success: false,
        failureCode: "INSUFFICIENT_PROVIDER_LIQUIDITY",
      };
    }

    if (destinationKey === "REJECTED_KEY") {
      return {
        success: false,
        failureCode: "INVALID_DESTINATION_ACCOUNT",
      };
    }

    return {
      success: true,
      providerReference: `pix_tx_${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
    };
  }
}
