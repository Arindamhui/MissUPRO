import { Module } from "@nestjs/common";
import { GiftService } from "./gift.service";
import { GiftRouter } from "./gift.router";

@Module({ providers: [GiftService, GiftRouter], exports: [GiftService, GiftRouter] })
export class GiftsModule {}
