import { NextRequest, NextResponse } from 'next/server';
import { getApiUrl } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const apiUrl = getApiUrl();

    const response = await fetch(`${apiUrl}/api/upload-picture`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Picture upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to upload picture' },
      { status: 500 }
    );
  }
}
