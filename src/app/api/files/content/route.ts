import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    // Security: Only allow .typ and .toml files
    if (!filePath.endsWith('.typ') && !filePath.endsWith('.toml')) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 403 }
      );
    }

    const fullPath = join(process.cwd(), '../cvfinder-backend/data', filePath);
    const content = await readFile(fullPath, 'utf-8');
    
    return new NextResponse(content, {
      headers: { 'Content-Type': 'text/plain' }
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to read file' },
      { status: 500 }
    );
  }
}
