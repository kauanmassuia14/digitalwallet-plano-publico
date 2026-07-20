import { Injectable } from "@nestjs/common";
import * as crypto from "node:crypto";

@Injectable()
export class KmsService {
  private privateKey: string;
  private publicKey: string;

  constructor() {
    const envPrivate = process.env.LEDGER_PRIVATE_KEY;
    const envPublic = process.env.LEDGER_PUBLIC_KEY;

    if (envPrivate && envPublic) {
      this.privateKey = envPrivate.replace(/\\n/g, "\n");
      this.publicKey = envPublic.replace(/\\n/g, "\n");
    } else {
      // Generate transient key pair
      const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: "spki",
          format: "pem",
        },
        privateKeyEncoding: {
          type: "pkcs8",
          format: "pem",
        },
      });
      this.privateKey = privateKey;
      this.publicKey = publicKey;
    }
  }

  public sign(data: string): string {
    const signer = crypto.createSign("sha256");
    signer.update(data);
    signer.end();
    return signer.sign(this.privateKey, "base64");
  }

  public verify(data: string, signature: string): boolean {
    const verifier = crypto.createVerify("sha256");
    verifier.update(data);
    verifier.end();
    return verifier.verify(this.publicKey, signature, "base64");
  }

  public getPublicKey(): string {
    return this.publicKey;
  }
}
