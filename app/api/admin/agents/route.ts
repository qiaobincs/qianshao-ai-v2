import { NextResponse } from 'next/server';
import { getAgents, addAgent, updateAgent, deleteAgent, getConfig, updateConfig } from '@/lib/db';

function isAdmin(request: Request): boolean {
  return request.headers.get('X-Admin-Auth') === 'true';
}

export async function GET(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  if (searchParams.get('type') === 'config') {
    const config = getConfig();
    return NextResponse.json({ config });
  }

  return NextResponse.json({ agents: getAgents() });
}

export async function POST(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  try {
    const body = await request.json();

    // Handle config update
    if (body.type === 'config') {
      const config = updateConfig({
        global_api_key: body.global_api_key || '',
        global_bot_id: body.global_bot_id || '',
      });
      return NextResponse.json({ config });
    }

    // Add new agent
    const { name, category, description, bot_id, api_key, enabled } = body;
    if (!name || !category) {
      return NextResponse.json({ error: '名称和分类不能为空' }, { status: 400 });
    }

    const agent = addAgent({
      name,
      category,
      description: description || '',
      bot_id: bot_id || '',
      api_key: api_key || '',
      enabled: enabled !== undefined ? enabled : 1,
    });

    return NextResponse.json({ agent });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) {
      return NextResponse.json({ error: '缺少智能体 ID' }, { status: 400 });
    }

    const agent = updateAgent(id, data);
    if (!agent) {
      return NextResponse.json({ error: '智能体不存在' }, { status: 404 });
    }

    return NextResponse.json({ agent });
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
      return NextResponse.json({ error: '缺少智能体 ID' }, { status: 400 });
    }

    const ok = deleteAgent(id);
    if (!ok) {
      return NextResponse.json({ error: '智能体不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
