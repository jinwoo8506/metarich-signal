"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [isSignupOpen, setIsSignupOpen] = useState(false) 
  const router = useRouter()

  const [signupForm, setSignupForm] = useState({
    email: "", password: "", name: "", department: ""
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert("로그인 실패: " + error.message)
    else router.push("/dashboard")
    setLoading(false)
  }

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { email, password, name, department } = signupForm
    setLoading(true)
    try {
      const { data, error: authError } = await supabase.auth.signUp({ email, password })
      if (authError) throw authError
      if (data.user) {
        const { error: dbError } = await supabase.from("users").insert([
          { id: data.user.id, name, role: 'agent', department }
        ])
        if (dbError) throw dbError
        alert("회원가입 성공! 이제 로그인해주세요.")
        setIsSignupOpen(false)
      }
    } catch (error: any) { alert(error.message) }
    finally { setLoading(false) }
  }

  const handleResetPassword = async () => {
    if (!email) return alert("이메일을 입력해주세요.")
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) alert(error.message)
    else alert("재설정 메일이 발송되었습니다.")
  }

  return (
    <div className="min-h-screen bg-[#f4f7fa] flex items-center justify-center p-6 text-slate-900 font-sans">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-xl w-full max-w-md border border-slate-100">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black italic tracking-tighter mb-2">METARICH SIGNAL</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Insurance Management</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full p-4 rounded-2xl bg-slate-50 border-none font-bold outline-none focus:ring-2 focus:ring-[#d4af37]" required />
          <input type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full p-4 rounded-2xl bg-slate-50 border-none font-bold outline-none focus:ring-2 focus:ring-[#d4af37]" required />
          <button type="submit" disabled={loading} className="w-full bg-black text-[#d4af37] p-5 rounded-2xl font-black">{loading ? "WAIT..." : "LOGIN"}</button>
        </form>
        <div className="mt-8 flex flex-col gap-4 text-center">
          <button onClick={handleResetPassword} className="text-slate-400 font-bold text-xs hover:text-black underline">비밀번호를 잊으셨나요?</button>
          <button onClick={() => setIsSignupOpen(true)} className="w-full text-black font-black text-sm border-2 border-black py-4 rounded-2xl hover:bg-black hover:text-[#d4af37] transition-all">신규 계정 만들기</button>
        </div>
      </div>

      {isSignupOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative">
            <button onClick={() => setIsSignupOpen(false)} className="absolute top-6 right-8 text-slate-400 font-black text-xl">✕</button>
            <h2 className="text-2xl font-black mb-8 italic text-center">CREATE ACCOUNT</h2>
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <input type="email" placeholder="이메일" value={signupForm.email} onChange={(e)=>setSignupForm({...signupForm, email: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 border-none font-bold outline-none focus:ring-2 focus:ring-[#d4af37]" required />
              <input type="text" placeholder="소속 (예: 강남지점)" value={signupForm.department} onChange={(e)=>setSignupForm({...signupForm, department: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 border-none font-bold outline-none focus:ring-2 focus:ring-[#d4af37]" required />
              <input type="text" placeholder="이름 (실명)" value={signupForm.name} onChange={(e)=>setSignupForm({...signupForm, name: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 border-none font-bold outline-none focus:ring-2 focus:ring-[#d4af37]" required />
              <input type="password" placeholder="비밀번호 (6자 이상)" value={signupForm.password} onChange={(e)=>setSignupForm({...signupForm, password: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 border-none font-bold outline-none focus:ring-2 focus:ring-[#d4af37]" required />
              <button type="submit" disabled={loading} className="w-full bg-black text-[#d4af37] p-5 rounded-2xl font-black mt-4 transition-transform hover:scale-[1.02]">가입 신청하기</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}