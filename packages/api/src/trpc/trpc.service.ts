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
    if (!ctx.userId || (ctx.authRole !== "admin" && ctx.platformRole !== "ADMIN")) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    return next({
      ctx: {
        ...ctx,
        userId: ctx.userId,
        authRole: "admin" as const,
        platformRole: "ADMIN" as const,
        isAdmin: true as const,
      },
    });
  });

  readonly isAgency = this.middleware(async ({ ctx, next }) => {
    if (!ctx.userId || (ctx.authRole !== "agency" && ctx.platformRole !== "AGENCY")) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Agency access required" });
    }
    return next({
      ctx: {
        ...ctx,
        userId: ctx.userId,
        authRole: "agency" as const,
        platformRole: "AGENCY" as const,
      },
    });
  });

  // ─── Protected procedure ───
  readonly protectedProcedure = this.procedure.use(this.isAuthed);

  // ─── Admin procedure ───
  readonly adminProcedure = this.procedure.use(this.isAdmin);

  // ─── Agency procedure ───
  readonly agencyProcedure = this.procedure.use(this.isAgency);
}
