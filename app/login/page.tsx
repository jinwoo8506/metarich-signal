"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [isSignupOpen, setIsSignupOpen] = useState(false) 
  const router = useRouter()

  const [signupForm, setSignupForm] = useState({
    email: "", password: "", name: "", hq: "", department: "", branch: ""
  })
  const [depts, setDepts] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<any[]>([]);

  useEffect(() => {
    async function loadOptions() {
      const { data: dData } = await supabase.from('departments').select('*').order('name');
      const { data: bData } = await supabase.from('branches').select('*').order('name');
      if (dData) setDepts(dData);
      if (bData) setBranches(bData);
    }
    loadOptions();
  }, []);

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
    const { email, password, name, hq, department, branch } = signupForm
    if (!hq || !department || !branch) return alert("본부, 사업부, 지점을 모두 선택해주세요.");
    
    setLoading(true)
    try {
      const { data: existingUser } = await supabase.from("users").select("id").eq("email", email).maybeSingle();
      if (existingUser) {
        alert("이미 가입된 이메일입니다.");
        setLoading(false);
        return;
      }
      const { data, error: authError } = await supabase.auth.signUp({ email, password })
      if (authError) throw authError
      if (data.user) {
        const { error: dbError } = await supabase.from("users").insert([
          { 
            id: data.user.id, 
            email,
            name, 
            role: 'agent', 
            role_level: 'staff',
            headquarters_name: hq,
            department_name: department, 
            branch_name: branch 
          }
        ])
        if (dbError) throw dbError
        alert("가입 신청 성공! 관리자 승인 후 이용 가능합니다.");
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
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 text-slate-900 font-sans">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-xl w-full max-w-md border border-slate-100 flex flex-col items-stretch">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black italic tracking-tighter mb-2 text-slate-900">METARICH SIGNAL</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Insurance Management</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4 flex flex-col">
          <input type="email" placeholder="이메일 주소" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none focus:ring-2 focus:ring-blue-500" required />
          <input type="password" placeholder="비밀번호" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none focus:ring-2 focus:ring-blue-500" required />
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-5 rounded-2xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">{loading ? "로그인 중..." : "로그인"}</button>
        </form>
        <div className="mt-8 flex flex-col gap-4 text-center">
          <button onClick={handleResetPassword} className="text-slate-400 font-bold text-xs hover:text-blue-600 underline decoration-slate-200">비밀번호를 잊으셨나요?</button>
          <div className="h-px bg-slate-100 w-full my-2"></div>
          <button onClick={() => setIsSignupOpen(true)} className="w-full text-slate-600 font-bold text-sm bg-slate-50 py-4 rounded-2xl hover:bg-slate-100 transition-all border border-slate-200">신규 계정 만들기</button>
        </div>
      </div>

      {isSignupOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-y-auto max-h-[95vh] border border-slate-100">
            <button onClick={() => setIsSignupOpen(false)} className="absolute top-6 right-8 text-slate-400 font-bold text-2xl hover:text-slate-900">✕</button>
            <h2 className="text-3xl font-bold mb-8 text-center text-slate-900">회원 가입 신청</h2>
            
            <form onSubmit={handleSignupSubmit} className="space-y-5 flex flex-col">
              <div className="bg-blue-50 p-4 rounded-2xl text-center border border-blue-100 mb-2">
                <span className="text-blue-400 text-[10px] uppercase block mb-1 font-bold">Group</span>
                <span className="text-xl font-bold text-blue-600 tracking-tight">SIGNAL GROUP</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">이메일</label>
                  <input type="email" placeholder="email@example.com" value={signupForm.email} onChange={(e)=>setSignupForm({...signupForm, email: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 font-bold outline-none focus:ring-2 focus:ring-blue-600" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">성함</label>
                  <input type="text" placeholder="실명을 입력하세요" value={signupForm.name} onChange={(e)=>setSignupForm({...signupForm, name: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 font-bold outline-none focus:ring-2 focus:ring-blue-600" required />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">본부 선택</label>
                <select required className="w-full mt-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 font-bold cursor-pointer"
                  value={signupForm.hq} onChange={(e) => setSignupForm({...signupForm, hq: e.target.value})}>
                  <option value="">본부를 선택해 주세요</option>
                  {Array.from({ length: 10 }, (_, i) => `${i + 1}본부`).map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">사업부</label>
                  <select required className="w-full mt-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 font-bold cursor-pointer"
                    value={signupForm.department} onChange={(e) => {
                      const val = e.target.value;
                      setSignupForm({...signupForm, department: val, branch: ""});
                      setFilteredBranches(branches.filter(b => b.dept_name === val));
                    }}>
                    <option value="">사업부 선택</option>
                    {depts.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">지점</label>
                  <select required disabled={!signupForm.department} className="w-full mt-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 font-bold cursor-pointer disabled:opacity-50"
                    value={signupForm.branch} onChange={(e) => setSignupForm({...signupForm, branch: e.target.value})}>
                    <option value="">지점 선택</option>
                    {filteredBranches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">비밀번호 설정</label>
                <input type="password" placeholder="6자 이상 입력" value={signupForm.password} onChange={(e)=>setSignupForm({...signupForm, password: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 font-bold outline-none focus:ring-2 focus:ring-blue-600" required />
              </div>
              
              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-5 rounded-2xl font-bold mt-4 shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95">
                {loading ? "신청 처리 중..." : "가입 신청 완료"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}