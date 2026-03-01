import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUsers, addUser, deleteUser, getUserByPhone } from '@/lib/db';

// Simple admin check via header
function isAdmin(request: Request): boolean {
  return request.headers.get('X-Admin-Auth') === 'true';
}

export async function GET(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }
  return NextResponse.json({ users: getUsers() });
}

export async function POST(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  try {
    const { phone, name, password } = await request.json();
    if (!phone) {
      return NextResponse.json({ error: '手机号不能为空' }, { status: 400 });
    }

    const existing = getUserByPhone(phone);
    if (existing) {
      return NextResponse.json({ error: '该手机号已存在' }, { status: 400 });
    }

    const hashedPassword = bcrypt.hashSync(password || 'qianshaokeji', 10);
    const user = addUser({ phone, name: name || '', password: hashedPassword });
    const { password: _, ...safe } = user;

    return NextResponse.json({ user: safe });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: '缺少用户 ID' }, { status: 400 });
    }

    const ok = deleteUser(id);
    if (!ok) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
