import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { getAgentsSafe } from '@/lib/db';

export async function GET(request: Request) {
  const user = authenticate(request);
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const agents = getAgentsSafe();
  return NextResponse.json({ agents });
}
