"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [redirectPath, setRedirectPath] = useState("/dashboard")
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const value = params.get("redirectTo") || "/dashboard"
    const nextRedirect = value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard"
    setRedirectPath(nextRedirect)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && params.get("redirectTo")) router.replace(nextRedirect)
    })
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const loginEmail = email.trim()
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password })
      if (error) alert("로그인에 실패했습니다: " + error.message)
      else router.push(redirectPath)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    const loginEmail = email.trim()
    if (!loginEmail) return alert("비밀번호를 재설정할 이메일을 먼저 입력해주세요.")
    const { error } = await supabase.auth.resetPasswordForEmail(loginEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) alert(error.message)
    else alert("비밀번호 재설정 메일이 발송되었습니다.")
  }

  return (
    <div className="min-h-screen bg-[#eef3fb] flex items-center justify-center p-6 text-slate-900">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl md:grid-cols-[1.05fr_.95fr]">
        <section className="bg-[#1a3a6e] p-8 text-white md:p-12">
          <div className="mb-16">
            <p className="text-xs font-bold tracking-[0.35em] text-sky-200">METARICH SIGNAL</p>
            <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">시그널 워크센터</h1>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/70">
              매일의 실적, 상담 준비, 고객관리 흐름을 한 화면에서 확인하고 팀별 진행 상황을 빠르게 점검할 수 있습니다.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-white/85">
            <div className="rounded-2xl bg-white/10 p-4">오늘 입력한 실적과 활동을 기준으로 목표 달성률을 확인합니다.</div>
            <div className="rounded-2xl bg-white/10 p-4">고객 상담 전 필요한 자료와 관리 도구를 바로 열어 활용합니다.</div>
            <div className="rounded-2xl bg-white/10 p-4">직급별 권한에 맞춰 팀, 사업부, 본부 현황을 안전하게 관리합니다.</div>
          </div>
        </section>

        <section className="p-8 md:p-12">
          <div className="mb-8">
            <p className="text-xs font-bold tracking-[0.25em] text-[#2563eb]">LOGIN</p>
            <h2 className="mt-2 text-3xl font-black text-[#1a3a6e]">로그인</h2>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-slate-500">이메일</span>
              <input
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-bold outline-none focus:border-[#2563eb] focus:bg-white"
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-slate-500">비밀번호</span>
              <input
                type="password"
                placeholder="비밀번호 입력"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-bold outline-none focus:border-[#2563eb] focus:bg-white"
                required
              />
            </label>
            <button type="submit" disabled={loading} className="w-full rounded-2xl bg-[#1a3a6e] p-5 font-black text-white transition hover:bg-[#2563eb] disabled:opacity-60">
              {loading ? "확인 중..." : "로그인"}
            </button>
          </form>

          <div className="mt-8 grid gap-3 text-center">
            <button onClick={handleResetPassword} className="text-xs font-bold text-slate-400 underline hover:text-[#1a3a6e]">비밀번호를 잊으셨나요?</button>
            <button onClick={() => router.push("/signup")} className="w-full rounded-2xl border-2 border-[#1a3a6e] py-4 text-sm font-black text-[#1a3a6e] transition hover:bg-[#1a3a6e] hover:text-white">
              회원가입 신청
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
