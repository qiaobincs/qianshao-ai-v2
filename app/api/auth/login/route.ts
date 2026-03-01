import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUserByPhone } from '@/lib/db';
import { signToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { phone, password } = await request.json();
    if (!phone || !password) {
      return NextResponse.json({ error: '请输入手机号和密码' }, { status: 400 });
    }

    const user = getUserByPhone(phone);
    if (!user) {
      return NextResponse.json({ error: '账号不存在，请联系管理员开通' }, { status: 401 });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: '密码错误' }, { status: 401 });
    }

    const token = signToken({ userId: user.id, phone: user.phone });

    return NextResponse.json({
      token,
      user: { id: user.id, phone: user.phone, name: user.name },
    });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
