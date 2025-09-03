// src/app/api/cv/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getApiUrl } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiUrl = getApiUrl();

    const response = await fetch(`${apiUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Generation failed' }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const pdfBuffer = await response.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="cv-${body.person}-${body.lang || 'en'}.pdf"`
      }
    });
  } catch (error) {
    console.error('CV generation error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to generate CV' },
      { status: 500 }
    );
  }
}
