import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { ZodError } from "zod";
import { AuthService } from "./auth.service";
import {
  agencyModelLoginSchema,
  completeAgencySignupSchema,
  completeMobileOnboardingSchema,
  emailLoginSchema,
  emailSignupSchema,
  googleAuthSchema,
  mobilePanelSchema,
  sessionIntentSchema,
} from "./auth.schemas";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signup")
  async signUp(
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    try {
      const input = emailSignupSchema.parse(body);
      return await this.authService.signUpWithEmail(input, this.getRequestIp(req), String(req.headers["user-agent"] ?? ""));
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.flatten());
      }
      throw new BadRequestException(error instanceof Error ? error.message : "Unable to create account");
    }
  }

  @Post("login")
  async login(
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    try {
      const input = emailLoginSchema.parse(body);
      return await this.authService.signInWithEmail(input, this.getRequestIp(req), String(req.headers["user-agent"] ?? ""));
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.flatten());
      }
      throw new UnauthorizedException(error instanceof Error ? error.message : "Invalid login");
    }
  }

  @Post("google")
  async googleAuth(
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    try {
      const input = googleAuthSchema.parse(body);
      return await this.authService.signInWithGoogle(input, this.getRequestIp(req), String(req.headers["user-agent"] ?? ""));
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.flatten());
      }
      throw new UnauthorizedException(error instanceof Error ? error.message : "Google sign-in failed");
    }
  }

  @Post("logout")
  async logout(@Headers("authorization") authorization: string | undefined) {
    const token = this.authService.extractBearerToken(authorization);
    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    try {
      return await this.authService.logoutFromToken(token);
    } catch {
      throw new UnauthorizedException("Invalid bearer token");
    }
  }

  @Get("session")
  async getSession(
    @Headers("authorization") authorization: string | undefined,
    @Query("intent") rawIntent?: string,
  ) {
    const token = this.authService.extractBearerToken(authorization);
    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    try {
      const intent = sessionIntentSchema.parse(rawIntent ?? "login");
      return await this.authService.getSessionStateFromToken(token, intent);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.flatten());
      }
      throw new UnauthorizedException(error instanceof Error ? error.message : "Invalid bearer token");
    }
  }

  @Post("agency-signup")
  async completeAgencySignup(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: unknown,
  ) {
    const token = this.authService.extractBearerToken(authorization);
    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    try {
      const input = completeAgencySignupSchema.parse(body);
      return await this.authService.completeAgencySignupFromToken(token, input);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.flatten());
      }
      throw new UnauthorizedException(error instanceof Error ? error.message : "Invalid bearer token");
    }
  }

  /** Mobile session endpoint — resolves user/model/agency_model panel */
  @Get("mobile-session")
  async getMobileSession(
    @Headers("authorization") authorization: string | undefined,
    @Query("panel") rawPanel?: string,
  ) {
    const token = this.authService.extractBearerToken(authorization);
    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    try {
      const panel = mobilePanelSchema.parse(rawPanel ?? "user");
      return await this.authService.getMobileSessionFromToken(token, panel);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.flatten());
      }
      throw new UnauthorizedException("Invalid bearer token");
    }
  }

  @Post("mobile-onboarding")
  async completeMobileOnboarding(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: unknown,
  ) {
    const token = this.authService.extractBearerToken(authorization);
    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    try {
      const input = completeMobileOnboardingSchema.parse(body);
      return await this.authService.completeMobileOnboardingFromToken(token, input);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.flatten());
      }
      throw new UnauthorizedException("Invalid bearer token");
    }
  }

  /** Agency model login — model logs in using their Agency ID */
  @Post("agency-model-login")
  async agencyModelLogin(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: unknown,
  ) {
    const token = this.authService.extractBearerToken(authorization);
    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    try {
      const input = agencyModelLoginSchema.parse(body);
      return await this.authService.loginAsAgencyModelFromToken(token, input);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.flatten());
      }
      throw new UnauthorizedException("Invalid bearer token");
    }
  }

  /**
   * Mobile Google OAuth callback.
   * Google redirects here with ?code=...&state=...
   * We exchange the code for an id_token and redirect to the app's custom scheme.
   */
  @Get("google/callback/mobile")
  async googleMobileCallback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Query("error") error: string | undefined,
    @Res() res: Response,
  ) {
    const APP_SCHEME = "missupro";

    if (error || !code) {
      return res.redirect(`${APP_SCHEME}://oauthredirect?error=${encodeURIComponent(error || "no_code")}`);
    }

    try {
      const idToken = await this.authService.exchangeGoogleCodeForIdToken(code);
      const redirectUrl = `${APP_SCHEME}://oauthredirect?id_token=${encodeURIComponent(idToken)}${state ? `&state=${encodeURIComponent(state)}` : ""}`;
      return res.redirect(redirectUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "token_exchange_failed";
      return res.redirect(`${APP_SCHEME}://oauthredirect?error=${encodeURIComponent(msg)}`);
    }
  }

  private getRequestIp(req: Request) {
    return String(req.headers["x-forwarded-for"] ?? req.ip ?? "unknown").split(",")[0]?.trim() || "unknown";
  }
}