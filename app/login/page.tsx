"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"

const LOGIN_ALIASES: Record<string, string> = {
  jw20371035: "jw20371035@gmail.com",
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const loginEmail = await resolveLoginEmail(email.trim())
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password })
      if (error) alert("로그인에 실패했습니다: " + error.message)
      else router.push("/dashboard")
    } finally {
      setLoading(false)
    }
  }

  const resolveLoginEmail = async (loginId: string) => {
    if (loginId.includes("@")) return loginId;
    if (LOGIN_ALIASES[loginId]) return LOGIN_ALIASES[loginId];

    const { data } = await supabase
      .from("users")
      .select("email")
      .or(`login_id.eq.${loginId},username.eq.${loginId},user_id.eq.${loginId},email.eq.${loginId}`)
      .maybeSingle();

    if (data?.email) return data.email;
    return loginId;
  }

  const handleResetPassword = async () => {
    if (!email) return alert("비밀번호를 재설정할 이메일 또는 아이디를 먼저 입력해주세요.")
    const loginEmail = await resolveLoginEmail(email.trim())
    if (!loginEmail.includes("@")) return alert("비밀번호 재설정은 이메일로만 가능합니다. 등록된 이메일을 입력해주세요.")
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
            <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">인슈런스 매니저</h1>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/65">
              실적관리, 상담자료, 보장분석 도구를 한곳에서 관리하는 메타리치 시그널그룹 업무 시스템입니다.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-white/80">
            <div className="rounded-2xl bg-white/10 p-4">상담 도구와 업무 대시보드 통합 운영</div>
            <div className="rounded-2xl bg-white/10 p-4">마스터 권한 기반 메뉴 노출 관리</div>
            <div className="rounded-2xl bg-white/10 p-4">Supabase 기반 계정 승인 후 사용</div>
          </div>
        </section>

        <section className="p-8 md:p-12">
          <div className="mb-8">
            <p className="text-xs font-bold tracking-[0.25em] text-[#2563eb]">LOGIN</p>
            <h2 className="mt-2 text-3xl font-black text-[#1a3a6e]">로그인</h2>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-slate-500">이메일 또는 아이디</span>
              <input type="text" placeholder="example@email.com 또는 jw20371035" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-bold outline-none focus:border-[#2563eb] focus:bg-white" required />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-slate-500">비밀번호</span>
              <input type="password" placeholder="비밀번호 입력" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-bold outline-none focus:border-[#2563eb] focus:bg-white" required />
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
