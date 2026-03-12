import { Module } from "@nestjs/common";
import { LiveService } from "./live.service";
import { LiveRouter } from "./live.router";

@Module({ providers: [LiveService, LiveRouter], exports: [LiveService, LiveRouter] })
export class LiveModule {}
