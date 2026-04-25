import { NextResponse } from "next/server";
import { lastAuthError } from "@/lib/auth";

export async function GET() {
  return NextResponse.json({
    lastAuthError,
    env: {
      AUTH_GOOGLE_ID_SET: !!process.env.AUTH_GOOGLE_ID,
      AUTH_GOOGLE_SECRET_SET: !!process.env.AUTH_GOOGLE_SECRET,
      AUTH_SECRET_SET: !!process.env.AUTH_SECRET,
      AUTH_URL: process.env.AUTH_URL,
      NODE_ENV: process.env.NODE_ENV,
    },
  });
}
