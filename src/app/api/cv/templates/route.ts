// src/app/api/cv/templates/route.ts
import { NextResponse } from 'next/server';
import { getApiUrl } from '@/lib/config';

export async function GET() {
  try {
    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}/api/templates`);
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Templates fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
