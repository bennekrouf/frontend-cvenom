// src/app/api/cv/create/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch('http://127.0.0.1:8000/api/create', {
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
