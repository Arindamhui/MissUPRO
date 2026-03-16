import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { SupportService } from "./support.service";

@Injectable()
export class SupportRouter {
  constructor(private readonly trpc: TrpcService, private readonly supportService: SupportService) {}

  get router() {
    return this.trpc.router({
      createTicket: this.trpc.protectedProcedure
        .input(z.object({
          category: z.string().min(2),
          priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]).default("NORMAL"),
          subject: z.string().min(3).max(140),
          description: z.string().min(10).max(5000),
          metadataJson: z.record(z.string(), z.unknown()).optional(),
        }))
        .mutation(async ({ ctx, input }) => this.supportService.createTicket(ctx.userId, input)),

      listMyTickets: this.trpc.protectedProcedure
        .query(async ({ ctx }) => this.supportService.listMyTickets(ctx.userId)),

      listTickets: this.trpc.adminProcedure
        .input(z.object({ status: z.string().optional(), category: z.string().optional() }).optional())
        .query(async ({ input }) => this.supportService.listTickets(input ?? {})),

      getTicketDetail: this.trpc.adminProcedure
        .input(z.object({ ticketId: z.string().uuid() }))
        .query(async ({ input }) => this.supportService.getTicketDetail(input.ticketId)),

      getOperationsReport: this.trpc.adminProcedure
        .input(z.object({ startDate: z.coerce.date(), endDate: z.coerce.date() }))
        .query(async ({ input }) => this.supportService.getOperationsReport(input.startDate, input.endDate)),

      assignTicket: this.trpc.adminProcedure
        .input(z.object({ ticketId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.supportService.assignTicket(input.ticketId, ctx.userId)),

      resolveTicket: this.trpc.adminProcedure
        .input(z.object({ ticketId: z.string().uuid(), resolutionNote: z.string().min(5).max(4000) }))
        .mutation(async ({ input }) => this.supportService.resolveTicket(input.ticketId, input.resolutionNote)),
    });
  }
}
