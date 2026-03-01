"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  phone: string;
  name: string;
  created_at: string;
}

interface Agent {
  id: string;
  name: string;
  category: string;
  description: string;
  bot_id: string;
  api_key: string;
  enabled: number;
}

interface Config {
  global_api_key: string;
  global_bot_id: string;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [tab, setTab] = useState<"users" | "agents" | "config">("agents");
  const [users, setUsers] = useState<User[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [config, setConfig] = useState<Config>({ global_api_key: "", global_bot_id: "" });
  const [toast, setToast] = useState("");
  const router = useRouter();

  // Form states
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("qianshaokeji");

  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [agentForm, setAgentForm] = useState({
    name: "", category: "AI第一课", description: "", bot_id: "", api_key: "", enabled: 1,
  });

  const headers = { "X-Admin-Auth": "true", "Content-Type": "application/json" };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const loadData = useCallback(async () => {
    try {
      const [uRes, aRes, cRes] = await Promise.all([
        fetch("/api/admin/users", { headers }),
        fetch("/api/admin/agents", { headers }),
        fetch("/api/admin/agents?type=config", { headers }),
      ]);
      const uData = await uRes.json();
      const aData = await aRes.json();
      const cData = await cRes.json();
      if (uData.users) setUsers(uData.users);
      if (aData.agents) setAgents(aData.agents);
      if (cData.config) setConfig(cData.config);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (authed) loadData();
  }, [authed, loadData]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setAuthed(true);
    } else {
      setAuthError("密码错误");
    }
  };

  // User CRUD
  const addNewUser = async () => {
    if (!newPhone) return;
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers,
      body: JSON.stringify({ phone: newPhone, name: newName, password: newPassword }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast("用户添加成功");
      setNewPhone(""); setNewName(""); setNewPassword("qianshaokeji");
      loadData();
    } else {
      showToast(data.error || "添加失败");
    }
  };

  const removeUser = async (id: string) => {
    if (!confirm("确定删除该用户？")) return;
    await fetch(`/api/admin/users?id=${id}`, { method: "DELETE", headers });
    showToast("已删除");
    loadData();
  };

  // Agent CRUD
  const openAgentForm = (agent?: Agent) => {
    if (agent) {
      setEditingAgent(agent);
      setAgentForm({
        name: agent.name,
        category: agent.category,
        description: agent.description,
        bot_id: agent.bot_id,
        api_key: agent.api_key,
        enabled: agent.enabled,
      });
    } else {
      setEditingAgent(null);
      setAgentForm({ name: "", category: "AI第一课", description: "", bot_id: "", api_key: "", enabled: 1 });
    }
  };

  const saveAgent = async () => {
    if (!agentForm.name) return showToast("名称不能为空");
    if (editingAgent) {
      await fetch("/api/admin/agents", {
        method: "PUT",
        headers,
        body: JSON.stringify({ id: editingAgent.id, ...agentForm }),
      });
      showToast("智能体已更新");
    } else {
      await fetch("/api/admin/agents", {
        method: "POST",
        headers,
        body: JSON.stringify(agentForm),
      });
      showToast("智能体已添加");
    }
    setEditingAgent(null);
    loadData();
  };

  const removeAgent = async (id: string) => {
    if (!confirm("确定删除该智能体？")) return;
    await fetch(`/api/admin/agents?id=${id}`, { method: "DELETE", headers });
    showToast("已删除");
    loadData();
  };

  // Config
  const saveConfig = async () => {
    await fetch("/api/admin/agents", {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "config", ...config }),
    });
    showToast("全局配置已保存");
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-sm mx-4 fade-in">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-card)] klein-border flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold">管理后台</h2>
          </div>
          <form onSubmit={handleAuth} className="bg-[var(--bg-card)] rounded-2xl p-6 klein-border space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入管理密码"
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-sm"
              autoFocus
            />
            {authError && <p className="text-red-400 text-sm">{authError}</p>}
            <button type="submit" className="w-full py-2.5 rounded-xl btn-klein text-white text-sm font-medium">
              验证进入
            </button>
          </form>
          <button onClick={() => router.push("/dashboard")} className="block mx-auto mt-4 text-xs text-[var(--text-secondary)] hover:text-white">
            返回体验舱
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[var(--klein)] text-white text-sm px-4 py-2 rounded-xl fade-in">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">管理后台</h1>
          <span className="text-xs px-2 py-0.5 rounded bg-[var(--klein)]/15 text-[var(--klein-light)]">Admin</span>
        </div>
        <button onClick={() => router.push("/dashboard")} className="text-sm text-[var(--text-secondary)] hover:text-white transition-colors">
          返回前台
        </button>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-4">
        {(["agents", "users", "config"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-t-xl text-sm transition-all ${
              tab === t ? "bg-[var(--bg-card)] text-white border-t border-x border-[var(--border-color)]" : "text-[var(--text-secondary)] hover:text-white"
            }`}
          >
            {t === "agents" ? "智能体管理" : t === "users" ? "客户管理" : "密钥配置"}
          </button>
        ))}
      </div>

      <div className="px-6 pb-8">
        <div className="bg-[var(--bg-card)] rounded-b-2xl rounded-tr-2xl klein-border p-6 min-h-[60vh]">
          {/* ===== Agents Tab ===== */}
          {tab === "agents" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-semibold">智能体列表</h2>
                <button onClick={() => openAgentForm()} className="px-4 py-2 rounded-xl btn-klein text-white text-sm">
                  + 添加智能体
                </button>
              </div>

              {/* Agent Form */}
              {(editingAgent !== null || agentForm.name !== "" || editingAgent === null) && editingAgent !== undefined && (
                <div className="hidden" />
              )}

              {/* Inline editor triggered by openAgentForm */}
              {(editingAgent !== null || agentForm.name) ? (
                <div className="bg-[var(--bg-dark)] rounded-xl p-5 mb-6 klein-border fade-in space-y-4">
                  <h3 className="text-sm font-medium">{editingAgent ? "编辑智能体" : "添加智能体"}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      placeholder="智能体名称"
                      value={agentForm.name}
                      onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
                      className="px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-sm"
                    />
                    <select
                      value={agentForm.category}
                      onChange={(e) => setAgentForm({ ...agentForm, category: e.target.value })}
                      className="px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-sm"
                    >
                      <option>AI第一课</option>
                      <option>营销获客</option>
                      <option>管理提效</option>
                    </select>
                    <input
                      placeholder="Bot ID (Coze)"
                      value={agentForm.bot_id}
                      onChange={(e) => setAgentForm({ ...agentForm, bot_id: e.target.value })}
                      className="px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-sm font-mono"
                    />
                    <input
                      placeholder="API Key (可选，留空用全局)"
                      value={agentForm.api_key}
                      onChange={(e) => setAgentForm({ ...agentForm, api_key: e.target.value })}
                      className="px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-sm font-mono"
                    />
                  </div>
                  <textarea
                    placeholder="商业场景描述"
                    value={agentForm.description}
                    onChange={(e) => setAgentForm({ ...agentForm, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-sm resize-none"
                  />
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={agentForm.enabled === 1}
                        onChange={(e) => setAgentForm({ ...agentForm, enabled: e.target.checked ? 1 : 0 })}
                        className="accent-[var(--klein)]"
                      />
                      启用
                    </label>
                    <div className="ml-auto flex gap-2">
                      <button
                        onClick={() => { setEditingAgent(null); setAgentForm({ name: "", category: "AI第一课", description: "", bot_id: "", api_key: "", enabled: 1 }); }}
                        className="px-4 py-1.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-white"
                      >
                        取消
                      </button>
                      <button onClick={saveAgent} className="px-4 py-1.5 rounded-lg btn-klein text-white text-sm">
                        保存
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Agent List */}
              <div className="space-y-3">
                {agents.map((a) => (
                  <div key={a.id} className="flex items-center gap-4 bg-[var(--bg-dark)] rounded-xl p-4 klein-border">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{a.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--klein)]/10 text-[var(--klein-light)]">{a.category}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${a.enabled ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                          {a.enabled ? "启用" : "禁用"}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 truncate">{a.description}</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 font-mono opacity-50">
                        Bot: {a.bot_id || "(未配置)"} · Key: {a.api_key ? "••••" + a.api_key.slice(-4) : "(用全局)"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openAgentForm(a)} className="text-xs text-[var(--text-secondary)] hover:text-white">编辑</button>
                      <button onClick={() => removeAgent(a.id)} className="text-xs text-red-400 hover:text-red-300">删除</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== Users Tab ===== */}
          {tab === "users" && (
            <div>
              <h2 className="text-base font-semibold mb-6">客户账号管理</h2>

              {/* Add user form */}
              <div className="bg-[var(--bg-dark)] rounded-xl p-5 mb-6 klein-border">
                <h3 className="text-sm font-medium mb-4">添加客户账号</h3>
                <div className="flex flex-wrap gap-3">
                  <input
                    placeholder="手机号"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="flex-1 min-w-[150px] px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-sm"
                  />
                  <input
                    placeholder="客户名称（可选）"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="flex-1 min-w-[150px] px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-sm"
                  />
                  <input
                    placeholder="密码（默认 qianshaokeji）"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="flex-1 min-w-[150px] px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-sm"
                  />
                  <button onClick={addNewUser} className="px-5 py-2 rounded-lg btn-klein text-white text-sm">
                    添加
                  </button>
                </div>
              </div>

              {/* User list */}
              <div className="space-y-3">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between bg-[var(--bg-dark)] rounded-xl p-4 klein-border">
                    <div>
                      <span className="text-sm font-medium">{u.phone}</span>
                      {u.name && <span className="text-xs text-[var(--text-secondary)] ml-2">({u.name})</span>}
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        创建于 {new Date(u.created_at).toLocaleString("zh-CN")}
                      </p>
                    </div>
                    <button onClick={() => removeUser(u.id)} className="text-xs text-red-400 hover:text-red-300">
                      删除
                    </button>
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="text-sm text-[var(--text-secondary)] text-center py-10">暂无客户账号</p>
                )}
              </div>
            </div>
          )}

          {/* ===== Config Tab ===== */}
          {tab === "config" && (
            <div>
              <h2 className="text-base font-semibold mb-2">全局密钥配置</h2>
              <p className="text-xs text-[var(--text-secondary)] mb-6">
                此处配置的全局 API Key 和 Bot ID 将作为所有未单独配置密钥的智能体的默认值。密钥仅存储在服务端，不会暴露给前端。
              </p>

              <div className="bg-[var(--bg-dark)] rounded-xl p-5 klein-border space-y-4 max-w-xl">
                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Coze API Key（全局）</label>
                  <input
                    type="password"
                    value={config.global_api_key}
                    onChange={(e) => setConfig({ ...config, global_api_key: e.target.value })}
                    placeholder="pat_xxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Coze Bot ID（全局）</label>
                  <input
                    value={config.global_bot_id}
                    onChange={(e) => setConfig({ ...config, global_bot_id: e.target.value })}
                    placeholder="73xxxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-sm font-mono"
                  />
                </div>
                <button onClick={saveConfig} className="px-5 py-2 rounded-lg btn-klein text-white text-sm">
                  保存配置
                </button>
              </div>

              <div className="mt-8 bg-[var(--bg-dark)] rounded-xl p-5 klein-border max-w-xl">
                <h3 className="text-sm font-medium mb-3">配置说明</h3>
                <div className="text-xs text-[var(--text-secondary)] space-y-2 leading-relaxed">
                  <p>1. 前往 <span className="text-[var(--klein-light)]">coze.cn</span> 创建 Bot，获取 Bot ID</p>
                  <p>2. 在 Coze 开放平台生成 API Token（Personal Access Token）</p>
                  <p>3. 将 Bot ID 和 API Key 填入上方对应位置</p>
                  <p>4. 如需为不同智能体使用不同的 Bot，可在智能体编辑中单独配置</p>
                  <p className="text-yellow-400/80 mt-2">⚠️ 每个智能体可单独配置 Bot ID 和 API Key，优先级高于全局配置</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
