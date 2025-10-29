// src/app/api/config/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  // Only expose what's safe for the client
  const config = {
    API0_BASE_URL: process.env.API0_BASE_URL!,
    API0_API_KEY: process.env.API0_API_KEY || '',
  };

  return NextResponse.json(config);
}
