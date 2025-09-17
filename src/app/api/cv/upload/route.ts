// src/app/api/cv/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getApiUrl } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const apiUrl = getApiUrl();

    const authHeader = request.headers.get('authorization');
    const headers: Record<string, string> = {};
    if (authHeader) {
      headers.Authorization = authHeader;
    }

    const response = await fetch(`${apiUrl}/cv/upload`, {
      method: 'POST',
      headers,
      body: formData
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('CV upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload CV' },
      { status: 500 }
    );
  }
}
