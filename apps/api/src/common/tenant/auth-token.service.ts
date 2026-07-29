import { Injectable, UnauthorizedException } from "@nestjs/common";
import * as jose from "jose";

@Injectable()
export class AuthTokenService {
  private jwksSet: ReturnType<typeof jose.createRemoteJWKSet> | undefined;
  private readonly issuer: string | undefined;
  private readonly audience: string | undefined;

  public constructor() {
    this.issuer = process.env.AUTH_ISSUER_URL || undefined;
    this.audience = process.env.AUTH_AUDIENCE || undefined;

    if (this.issuer) {
      try {
        const url = new URL(this.issuer);
        const jwksUrl = new URL(".well-known/jwks.json", url);
        this.jwksSet = jose.createRemoteJWKSet(jwksUrl);
      } catch {
        this.jwksSet = undefined;
      }
    }
  }

  public async verifyToken(
    token: string,
  ): Promise<{ sub: string; email?: string | undefined }> {
    try {
      const isTestOrDev =
        process.env.NODE_ENV === "test" ||
        process.env.NODE_ENV === "development";
      const testSecret =
        process.env.AUTH_TEST_SECRET ||
        "local-test-secret-must-be-long-enough-32bytes";

      if (
        isTestOrDev &&
        (!this.issuer || token.startsWith("mock-test-token."))
      ) {
        const actualToken = token.startsWith("mock-test-token.")
          ? token.replace("mock-test-token.", "")
          : token;
        const secret = new TextEncoder().encode(testSecret);
        const { payload } = await jose.jwtVerify(actualToken, secret);

        if (!payload.sub) {
          throw new UnauthorizedException("Token missing 'sub' claim");
        }

        const result: { sub: string; email?: string | undefined } = {
          sub: payload.sub,
        };
        if (typeof payload.email === "string") {
          result.email = payload.email;
        }
        return result;
      }

      if (!this.jwksSet) {
        throw new UnauthorizedException(
          "Authentication issuer is not configured",
        );
      }

      const options: jose.JWTVerifyOptions = {};
      if (this.issuer) {
        options.issuer = this.issuer;
      }
      if (this.audience) {
        options.audience = this.audience;
      }

      const { payload } = await jose.jwtVerify(token, this.jwksSet, options);

      if (!payload.sub) {
        throw new UnauthorizedException("Token missing 'sub' claim");
      }

      const result: { sub: string; email?: string | undefined } = {
        sub: payload.sub,
      };
      if (typeof payload.email === "string") {
        result.email = payload.email;
      }
      return result;
    } catch (error: any) {
      throw new UnauthorizedException(`Invalid token: ${error.message}`);
    }
  }
}
