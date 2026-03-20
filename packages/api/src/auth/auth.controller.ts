import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  UnauthorizedException,
} from "@nestjs/common";
import { ZodError } from "zod";
import { AuthService } from "./auth.service";
import { agencyModelLoginSchema, completeAgencySignupSchema, completeMobileOnboardingSchema, mobilePanelSchema, sessionIntentSchema } from "./auth.schemas";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("session")
  async getSession(
    @Headers("authorization") authorization: string | undefined,
    @Query("intent") rawIntent?: string,
  ) {
    const token = this.authService.extractBearerToken(authorization);
    if (!token) {
      throw new UnauthorizedException("Missing Clerk bearer token");
    }

    try {
      const intent = sessionIntentSchema.parse(rawIntent ?? "login");
      return await this.authService.getSessionStateFromToken(token, intent);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.flatten());
      }
      throw new UnauthorizedException("Invalid Clerk bearer token");
    }
  }

  @Post("agency-signup")
  async completeAgencySignup(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: unknown,
  ) {
    const token = this.authService.extractBearerToken(authorization);
    if (!token) {
      throw new UnauthorizedException("Missing Clerk bearer token");
    }

    try {
      const input = completeAgencySignupSchema.parse(body);
      return await this.authService.completeAgencySignupFromToken(token, input);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.flatten());
      }
      throw new UnauthorizedException("Invalid Clerk bearer token");
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
      throw new UnauthorizedException("Missing Clerk bearer token");
    }

    try {
      const panel = mobilePanelSchema.parse(rawPanel ?? "user");
      return await this.authService.getMobileSessionFromToken(token, panel);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.flatten());
      }
      throw new UnauthorizedException("Invalid Clerk bearer token");
    }
  }

  @Post("mobile-onboarding")
  async completeMobileOnboarding(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: unknown,
  ) {
    const token = this.authService.extractBearerToken(authorization);
    if (!token) {
      throw new UnauthorizedException("Missing Clerk bearer token");
    }

    try {
      const input = completeMobileOnboardingSchema.parse(body);
      return await this.authService.completeMobileOnboardingFromToken(token, input);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.flatten());
      }
      throw new UnauthorizedException("Invalid Clerk bearer token");
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
      throw new UnauthorizedException("Missing Clerk bearer token");
    }

    try {
      const input = agencyModelLoginSchema.parse(body);
      return await this.authService.loginAsAgencyModelFromToken(token, input);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.flatten());
      }
      throw new UnauthorizedException("Invalid Clerk bearer token");
    }
  }
}