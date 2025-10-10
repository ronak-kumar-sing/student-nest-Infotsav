import { NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/utils/jwt';

export async function GET(request: Request) {
  try {
    // Get access token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = verifyAccessToken(token);
      if (!payload) {
        return NextResponse.json({ success: false }, { status: 401 });
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
