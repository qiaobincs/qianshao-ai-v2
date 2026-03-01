"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "登录失败");
        return;
      }
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[var(--klein)] opacity-5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-[var(--klein-light)] opacity-5 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md mx-4 fade-in">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--klein)] klein-glow mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 01-1.591.659H9.061a2.25 2.25 0 01-1.591-.659L5 14.5m14 0V17a2 2 0 01-2 2H7a2 2 0 01-2-2v-2.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">前哨AI智能体体验舱</h1>
          <p className="text-[var(--text-secondary)] mt-2 text-sm">企业 AI 转型实战演示平台</p>
        </div>

        {/* Login Card */}
        <div className="bg-[var(--bg-card)] rounded-2xl p-8 klein-border klein-glow">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-2">手机号</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入手机号"
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-2">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] transition-all"
                required
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 px-4 py-2 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl btn-klein text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "登录中..." : "进入体验舱"}
            </button>
          </form>

          <p className="text-xs text-[var(--text-secondary)] text-center mt-6">
            体验账号由前哨科技统一分配，如需开通请联系客户经理
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-[var(--text-secondary)] opacity-60">
            © 2025 前哨科技 · 让 AI 真正为企业创造价值
          </p>
        </div>
      </div>
    </div>
  );
}
