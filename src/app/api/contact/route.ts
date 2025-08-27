import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // TODO: Add your contact form handling logic here
    // Examples:
    // - Send email via SendGrid, Resend, etc.
    // - Save to database
    // - Integrate with CRM
    
    console.log('Contact form submission:', body);
    
    return NextResponse.json(
      { message: 'Message sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { message: 'Failed to send message' },
      { status: 500 }
    );
  }
}
