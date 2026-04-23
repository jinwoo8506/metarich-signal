"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // DB에서 불러올 옵션들
  const [depts, setDepts] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<any[]>([]);

  // 입력 폼 상태
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    department: "",
    branch: ""
  });

  // 1. 초기 데이터 로드 (사업부 & 지점 목록)
  useEffect(() => {
    async function fetchOptions() {
      const { data: dData } = await supabase.from('departments').select('*').order('name');
      const { data: bData } = await supabase.from('branches').select('*').order('name');
      if (dData) setDepts(dData);
      if (bData) setBranches(bData);
    }
    fetchOptions();
  }, []);

  // 2. 사업부 선택 시 지점 필터링 로직
  useEffect(() => {
    if (formData.department) {
      const filtered = branches.filter(b => b.dept_name === formData.department);
      setFilteredBranches(filtered);
      setFormData(prev => ({ ...prev, branch: "" })); // 사업부 바뀌면 지점 리셋
    } else {
      setFilteredBranches([]);
    }
  }, [formData.department, branches]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Supabase Auth 가입
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      // 2. users 테이블에 추가 정보 저장 (업데이트된 필드 구조)
      if (authData.user) {
        const { error: dbError } = await supabase.from("users").insert([
          {
            id: authData.user.id,
            email: formData.email,
            name: formData.name,             // 관리자 팝업/대시보드와 이름 필드 매칭
            role: "agent",                   // 기본값은 설계사
            role_level: "staff",             // 기본값은 스태프
            department_name: formData.department, // 선택한 사업부
            branch_name: formData.branch,      // 선택한 지점
            is_approved: false,              // 가입 직후는 미승인 상태
          },
        ]);

        if (dbError) throw dbError;
        alert("가입 신청이 완료되었습니다. 관리자 승인 후 이용 가능합니다.");
        router.push("/login");
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 font-black">
      <div className="w-full max-w-md bg-white border-[4px] border-black rounded-[2.5rem] p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="text-4xl italic tracking-tighter mb-8 text-center uppercase">Join System</h1>
        
        <form onSubmit={handleSignup} className="space-y-5">
          {/* 이름 입력 */}
          <div>
            <label className="text-[10px] uppercase ml-2 text-slate-400">Full Name</label>
            <input type="text" placeholder="이름을 입력하세요" required className="w-full mt-1 p-4 bg-slate-50 border-2 border-black/5 rounded-2xl outline-none focus:border-blue-600 transition-all text-black"
              value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
          </div>

          {/* 이메일 입력 */}
          <div>
            <label className="text-[10px] uppercase ml-2 text-slate-400">Email ID</label>
            <input type="email" placeholder="example@email.com" required className="w-full mt-1 p-4 bg-slate-50 border-2 border-black/5 rounded-2xl outline-none focus:border-blue-600 transition-all text-black"
              value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>

          {/* 비밀번호 입력 */}
          <div>
            <label className="text-[10px] uppercase ml-2 text-slate-400">Password</label>
            <input type="password" placeholder="••••••••" required className="w-full mt-1 p-4 bg-slate-50 border-2 border-black/5 rounded-2xl outline-none focus:border-blue-600 transition-all text-black"
              value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 사업부 선택 */}
            <div>
              <label className="text-[10px] uppercase ml-2 text-slate-400">Department</label>
              <select required className="w-full mt-1 p-3 bg-slate-50 border-2 border-black/5 rounded-2xl outline-none focus:border-blue-600 transition-all cursor-pointer text-black"
                value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})}>
                <option value="">사업부 선택</option>
                {depts.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>

            {/* 지점 선택 */}
            <div>
              <label className="text-[10px] uppercase ml-2 text-slate-400">Branch</label>
              <select required disabled={!formData.department} className="w-full mt-1 p-3 bg-slate-50 border-2 border-black/5 rounded-2xl outline-none focus:border-blue-600 transition-all cursor-pointer disabled:opacity-50 text-black"
                value={formData.branch} onChange={(e) => setFormData({...formData, branch: e.target.value})}>
                <option value="">지점 선택</option>
                {filteredBranches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:shadow-none transition-all active:scale-95 text-xl uppercase mt-4 font-black italic">
            {loading ? "Processing..." : "Sign Up"}
          </button>
        </form>
        
        <p className="mt-6 text-center text-xs text-slate-400 font-bold uppercase cursor-pointer" onClick={() => router.push("/login")}>
          Already have an account? <span className="text-blue-600">Login</span>
        </p>
      </div>
    </div>
  )
}