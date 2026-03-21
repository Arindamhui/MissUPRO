// Debug route - can be deleted
import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ removed: true });
}
