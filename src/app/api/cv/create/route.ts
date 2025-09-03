// src/app/api/cv/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getApiUrl } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiUrl = getApiUrl();

    const response = await fetch(`${apiUrl}/api/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('CV create error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create person' },
      { status: 500 }
    );
  }
}
