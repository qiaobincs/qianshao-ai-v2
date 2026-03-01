import { NextResponse } from 'next/server';

const ADMIN_PASSWORD = 'qsjiaoyu';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    if (password === ADMIN_PASSWORD) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: '密码错误' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
