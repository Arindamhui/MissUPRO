import { Module } from "@nestjs/common";
import { GameService } from "./game.service";
import { GameRouter } from "./game.router";
@Module({ providers: [GameService, GameRouter], exports: [GameService, GameRouter] })
export class GamesModule {}
