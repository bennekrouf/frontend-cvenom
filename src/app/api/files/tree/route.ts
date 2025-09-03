import { NextRequest, NextResponse } from 'next/server';
import { getApiUrl } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    const apiUrl = getApiUrl();

    // Forward authorization header if present
    const authHeader = request.headers.get('authorization');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authHeader) {
      headers.Authorization = authHeader;
    }

    const response = await fetch(`${apiUrl}/files/tree`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch file tree from backend' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('File tree proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to load file tree' },
      { status: 500 }
    );
  }
}
