"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AgentInfo {
  id: string;
  name: string;
  category: string;
  description: string;
}

export default function ChatPage() {
  const params = useParams();
  const agentId = params.agentId as string;
  const router = useRouter();

  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    fetch("/api/agents", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.agents) {
          const found = d.agents.find((a: AgentInfo) => a.id === agentId);
          if (found) setAgent(found);
        }
      })
      .catch(() => {});
  }, [agentId, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);
    setStreaming(true);

    // Add empty assistant message for streaming
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          agentId,
          message: userMsg,
          conversationId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: `⚠️ ${errData.error || "请求失败，请稍后重试"}`,
          };
          return updated;
        });
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const dataStr = line.slice(6).trim();
          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);

            if (data.type === "text" && data.content) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + data.content,
                };
                return updated;
              });
            }

            if (data.type === "done" && data.conversation_id) {
              setConversationId(data.conversation_id);
            }
          } catch {
            // Skip non-JSON lines
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "⚠️ 网络错误，请检查连接后重试",
        };
        return updated;
      });
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const exportChat = () => {
    if (messages.length === 0) return;
    const text = messages
      .map((m) => `[${m.role === "user" ? "我" : agent?.name || "AI"}]\n${m.content}`)
      .join("\n\n---\n\n");
    const header = `对话记录 - ${agent?.name || "AI 助手"}\n导出时间：${new Date().toLocaleString("zh-CN")}\n${"=".repeat(40)}\n\n`;
    const blob = new Blob([header + text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${agent?.name || "chat"}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const newChat = () => {
    setMessages([]);
    setConversationId(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-color)] bg-[var(--bg-dark)]/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="w-8 h-8 rounded-lg bg-[var(--bg-card)] flex items-center justify-center hover:bg-[var(--bg-card-hover)] transition-colors klein-border"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-sm font-semibold">{agent?.name || "加载中..."}</h1>
            <p className="text-xs text-[var(--text-secondary)]">{agent?.category}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={newChat}
            className="px-3 py-1.5 rounded-lg text-xs bg-[var(--bg-card)] klein-border text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-card-hover)] transition-all"
          >
            新对话
          </button>
          <button
            onClick={exportChat}
            disabled={messages.length === 0}
            className="px-3 py-1.5 rounded-lg text-xs bg-[var(--bg-card)] klein-border text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-card-hover)] transition-all disabled:opacity-30"
          >
            导出 TXT
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          /* Welcome screen */
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-20">
            <div className="w-16 h-16 rounded-2xl bg-[var(--klein)]/15 flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-[var(--klein-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">{agent?.name}</h2>
            <p className="text-sm text-[var(--text-secondary)] max-w-md leading-relaxed">
              {agent?.description}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-6 opacity-50">
              输入您的问题，开始与 AI 智能体对话
            </p>
          </div>
        ) : (
          /* Chat messages */
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 fade-in ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-[var(--klein)] flex-shrink-0 flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5" />
                    </svg>
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-[var(--klein)] text-white rounded-tr-md"
                      : "bg-[var(--bg-card)] text-[var(--text-primary)] klein-border rounded-tl-md"
                  } ${msg.role === "assistant" && streaming && i === messages.length - 1 ? "typing-cursor" : ""}`}
                >
                  {msg.content || (streaming && i === messages.length - 1 ? "" : "思考中...")}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Input Area */}
      <div className="border-t border-[var(--border-color)] bg-[var(--bg-dark)]/80 backdrop-blur-sm px-4 py-4">
        <div className="max-w-3xl mx-auto flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入您的问题..."
              rows={1}
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] resize-none transition-all text-sm"
              style={{ minHeight: "44px", maxHeight: "120px" }}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 120) + "px";
              }}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="w-11 h-11 rounded-xl btn-klein flex items-center justify-center flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-[var(--text-secondary)] text-center mt-2 opacity-40">
          Demo 演示版本 · AI 回复仅供参考
        </p>
      </div>
    </div>
  );
}
