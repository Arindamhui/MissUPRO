import { Injectable } from "@nestjs/common";
import { initTRPC, TRPCError } from "@trpc/server";
import { type Context } from "./trpc.context";

@Injectable()
export class TrpcService {
  private readonly t = initTRPC.context<Context>().create({
    errorFormatter({ shape, error }) {
      return {
        ...shape,
        data: {
          ...shape.data,
          code: error.code,
        },
      };
    },
  });

  readonly router = this.t.router;
  readonly procedure = this.t.procedure;
  readonly middleware = this.t.middleware;
  readonly mergeRouters = this.t.mergeRouters;

  // ─── Auth middleware ───
  readonly isAuthed = this.middleware(async ({ ctx, next }) => {
    if (!ctx.userId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
    }
    return next({ ctx: { ...ctx, userId: ctx.userId } });
  });

  // ─── Admin middleware ───
  readonly isAdmin = this.middleware(async ({ ctx, next }) => {
    if (!ctx.userId || !ctx.isAdmin) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    return next({ ctx: { ...ctx, userId: ctx.userId, isAdmin: true as const } });
  });

  // ─── Protected procedure ───
  readonly protectedProcedure = this.procedure.use(this.isAuthed);

  // ─── Admin procedure ───
  readonly adminProcedure = this.procedure.use(this.isAdmin);
}
