import * as crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";

export class EncryptionHelper {
  private key: Buffer;

  constructor() {
    const secret = process.env.AUDIT_LOG_SECRET || "default-audit-log-secret-32bytes!";
    this.key = crypto.createHash("sha256").update(secret).digest();
  }

  public encrypt(data: any): any {
    if (data === null || data === undefined) {
      return null;
    }
    const plaintext = JSON.stringify(data);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
    
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag().toString("hex");

    return {
      iv: iv.toString("hex"),
      content: encrypted,
      tag: tag,
    };
  }

  public decrypt(encryptedData: any): any {
    if (encryptedData === null || encryptedData === undefined) {
      return null;
    }
    if (!encryptedData.iv || !encryptedData.content || !encryptedData.tag) {
      return encryptedData;
    }

    try {
      const iv = Buffer.from(encryptedData.iv, "hex");
      const tag = Buffer.from(encryptedData.tag, "hex");
      const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encryptedData.content, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return JSON.parse(decrypted);
    } catch (e) {
      return { _decryptionError: true, raw: encryptedData };
    }
  }
}
