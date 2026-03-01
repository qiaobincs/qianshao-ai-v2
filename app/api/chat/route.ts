import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { getAgentById, getConfig } from '@/lib/db';

// Coze API v3 chat endpoint
const COZE_API_BASE = 'https://api.coze.cn/v3/chat';

export async function POST(request: Request) {
  const user = authenticate(request);
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  try {
    const { agentId, message, conversationId } = await request.json();

    if (!agentId || !message) {
      return NextResponse.json({ error: '参数缺失' }, { status: 400 });
    }

    const agent = getAgentById(agentId);
    if (!agent || !agent.enabled) {
      return NextResponse.json({ error: '智能体不存在或未启用' }, { status: 404 });
    }

    // Determine API key and bot_id: agent-level > global config
    const config = getConfig();
    const apiKey = agent.api_key || config.global_api_key;
    const botId = agent.bot_id || config.global_bot_id;

    if (!apiKey || !botId) {
      // Fallback to demo mode if no API key configured
      return handleDemoMode(message, agent.name);
    }

    // Build Coze API request
    const cozeBody: Record<string, unknown> = {
      bot_id: botId,
      user_id: user.userId,
      stream: true,
      auto_save_history: true,
      additional_messages: [
        {
          role: 'user',
          content: message,
          content_type: 'text',
        },
      ],
    };

    // If we have a conversation_id, include it for context continuity
    if (conversationId) {
      cozeBody.conversation_id = conversationId;
    }

    const cozeResponse = await fetch(COZE_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(cozeBody),
    });

    if (!cozeResponse.ok) {
      const errText = await cozeResponse.text();
      console.error('Coze API error:', cozeResponse.status, errText);
      return NextResponse.json(
        { error: `AI 服务暂时不可用 (${cozeResponse.status})` },
        { status: 502 }
      );
    }

    // Stream the Coze SSE response to the frontend
    const reader = cozeResponse.body?.getReader();
    if (!reader) {
      return NextResponse.json({ error: '无法获取响应流' }, { status: 500 });
    }

    const decoder = new TextDecoder();
    let newConversationId = conversationId || '';

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('event:')) {
                const eventType = line.slice(6).trim();

                // Handle different Coze SSE event types
                if (eventType === 'conversation.chat.created') {
                  // Extract conversation_id from the created event
                  // Next line should be data:
                  continue;
                }
              }

              if (line.startsWith('data:')) {
                const dataStr = line.slice(5).trim();
                if (dataStr === '[DONE]') {
                  // Send final metadata
                  const metaChunk = JSON.stringify({
                    type: 'done',
                    conversation_id: newConversationId,
                  });
                  controller.enqueue(
                    encoder.encode(`data: ${metaChunk}\n\n`)
                  );
                  continue;
                }

                try {
                  const data = JSON.parse(dataStr);

                  // Capture conversation_id
                  if (data.conversation_id) {
                    newConversationId = data.conversation_id;
                  }

                  // Handle different event types in data
                  if (data.type === 'answer' && data.content) {
                    // Stream answer text
                    const chunk = JSON.stringify({
                      type: 'text',
                      content: data.content,
                    });
                    controller.enqueue(
                      encoder.encode(`data: ${chunk}\n\n`)
                    );
                  } else if (data.role === 'assistant' && data.type === 'answer') {
                    // Alternative format: complete message
                    if (data.content) {
                      const chunk = JSON.stringify({
                        type: 'text',
                        content: data.content,
                      });
                      controller.enqueue(
                        encoder.encode(`data: ${chunk}\n\n`)
                      );
                    }
                  }

                  // Handle conversation.message.delta events (streaming text)
                  if (data.content && data.role === 'assistant') {
                    // Already handled above
                  }
                } catch {
                  // Non-JSON data line, skip
                }
              }
            }
          }

          // Send done signal if not already sent
          const finalChunk = JSON.stringify({
            type: 'done',
            conversation_id: newConversationId,
          });
          controller.enqueue(encoder.encode(`data: ${finalChunk}\n\n`));
          controller.close();
        } catch (err) {
          console.error('Stream error:', err);
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('Chat API error:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// Demo mode: simulated streaming response when no API key is configured
function handleDemoMode(message: string, agentName: string) {
  const demoResponses: Record<string, string[]> = {
    'AI 商业认知课': [
      `这是一个非常好的问题。作为 AI 商业认知课的演示，让我从三个维度来分析：\n\n`,
      `**1. 技术趋势维度**\n当前 AI 技术正从"通用大模型"向"垂直场景深度适配"的方向演进。`,
      `企业需要关注的不是追逐最新模型，而是如何将 AI 能力嵌入到自身的业务流程中去。\n\n`,
      `**2. 商业价值维度**\nAI 落地的核心价值体现在三个方面：降低人力成本、提升决策效率、创造新的收入来源。`,
      `根据行业实践数据，成功的 AI 项目平均可以带来 30%-50% 的效率提升。\n\n`,
      `**3. 实施路径维度**\n建议从以下步骤推进：\n- 选择 1-2 个高频、标准化的业务场景做试点\n- 用 2-4 周完成 MVP 验证\n- 量化效果后再逐步推广\n\n`,
      `> 以上为 Demo 演示内容。在正式部署中，AI 将基于您的企业实际情况提供定制化分析和建议。`,
    ],
    'default': [
      `感谢您的提问！作为「${agentName}」的演示模式，`,
      `我来为您展示这个智能体的核心能力。\n\n`,
      `您提到的"${message.slice(0, 30)}${message.length > 30 ? '...' : ''}"是一个很有价值的方向。`,
      `在实际部署中，这个智能体会基于您的具体业务数据和场景进行深度分析，`,
      `提供可直接落地的建议方案。\n\n`,
      `当前为 Demo 演示版本，如需体验完整功能，请联系前哨科技获取企业级私有化部署方案。`,
    ],
  };

  const chunks = demoResponses[agentName] || demoResponses['default'];

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      for (const chunk of chunks) {
        await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
        const data = JSON.stringify({ type: 'text', content: chunk });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      }

      const done = JSON.stringify({
        type: 'done',
        conversation_id: `demo-${Date.now()}`,
      });
      controller.enqueue(encoder.encode(`data: ${done}\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
