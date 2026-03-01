"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Agent {
  id: string;
  name: string;
  category: string;
  description: string;
}

const categoryIcons: Record<string, string> = {
  "AI第一课": "🎓",
  "营销获客": "📈",
  "管理提效": "⚙️",
};

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("全部");
  const [userName, setUserName] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    if (!token) {
      router.push("/");
      return;
    }
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setUserName(u.name || u.phone);
      } catch { /* ignore */ }
    }

    fetch("/api/agents", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.agents) setAgents(d.agents);
      })
      .catch(() => {});
  }, [router]);

  const categories = ["全部", ...Array.from(new Set(agents.map((a) => a.category)))];
  const filtered = activeCategory === "全部" ? agents : agents.filter((a) => a.category === activeCategory);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Banner */}
      <div className="bg-[var(--klein)]/10 border-b border-[var(--border-color)] px-6 py-3">
        <p className="text-xs text-[var(--text-secondary)] text-center max-w-4xl mx-auto">
          欢迎体验前哨科技 AI 智能体演示舱。当前为 Demo 演示版本，主要用于展示部分业务场景功能，无法完全替代企业级私有化部署的完整业务流。
        </p>
      </div>

      {/* Header */}
      <header className="flex items-center justify-between px-6 lg:px-10 py-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--klein)] flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold">前哨AI体验舱</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[var(--text-secondary)]">{userName}</span>
          <button onClick={handleLogout} className="text-sm text-[var(--text-secondary)] hover:text-white transition-colors">
            退出
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Categories */}
        <aside className="w-56 lg:w-64 border-r border-[var(--border-color)] p-5 flex-shrink-0 hidden md:block">
          <h2 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-4">智能体分类</h2>
          <nav className="space-y-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2.5 ${
                  activeCategory === cat
                    ? "bg-[var(--klein)] text-white"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-white"
                }`}
              >
                <span>{cat === "全部" ? "📋" : categoryIcons[cat] || "🤖"}</span>
                <span>{cat}</span>
                <span className="ml-auto text-xs opacity-60">
                  {cat === "全部"
                    ? agents.length
                    : agents.filter((a) => a.category === cat).length}
                </span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content - Agent Cards */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          {/* Mobile category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-4 md:hidden mb-4">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm transition-all ${
                  activeCategory === cat
                    ? "bg-[var(--klein)] text-white"
                    : "bg-[var(--bg-card)] text-[var(--text-secondary)] klein-border"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold">
              {activeCategory === "全部" ? "全部智能体" : activeCategory}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              选择一个 AI 智能体，开始体验企业级 AI 应用能力
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((agent) => (
              <div
                key={agent.id}
                className="bg-[var(--bg-card)] rounded-2xl p-6 klein-border card-hover cursor-pointer"
                onClick={() => router.push(`/chat/${agent.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--klein)]/15 flex items-center justify-center">
                    <span className="text-xl">{categoryIcons[agent.category] || "🤖"}</span>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--klein)]/10 text-[var(--klein-light)] border border-[var(--klein)]/20">
                    {agent.category}
                  </span>
                </div>
                <h3 className="text-base font-semibold mb-2">{agent.name}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-5 line-clamp-3">
                  {agent.description}
                </p>
                <button className="w-full py-2.5 rounded-xl btn-klein text-white text-sm font-medium">
                  开始体验 →
                </button>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20 text-[var(--text-secondary)]">
              <p className="text-lg">暂无智能体</p>
              <p className="text-sm mt-2">该分类下还没有配置可用的智能体</p>
            </div>
          )}
        </main>
      </div>

      {/* Footer with hidden admin entry */}
      <footer className="border-t border-[var(--border-color)] py-4 text-center">
        <span
          className="text-xs text-[var(--text-secondary)] opacity-40 cursor-default select-none"
          onDoubleClick={() => router.push("/admin")}
        >
          © 2025 前哨科技
        </span>
      </footer>
    </div>
  );
}
