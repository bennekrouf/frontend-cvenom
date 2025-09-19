// src/app/api/cv/templates/route.ts
import { NextResponse } from 'next/server';
import { getApiUrl } from '@/lib/config';

export async function GET() {
  try {
    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}/templates`);
    const data = await response.json();

    // Handle standardized response format
    if (data.success && data.data) {
      return NextResponse.json({
        success: true,
        templates: data.data
      });
    }

    // Fallback for backwards compatibility
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Templates fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
