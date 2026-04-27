"use client"

import React, { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { HEADQUARTER_OPTIONS } from "@/lib/roles"

type OrgRow = {
  id?: string | number;
  name: string;
  headquarter?: string;
  hq?: string;
  dept_name?: string;
  department?: string;
  department_id?: string | number;
  dept_id?: string | number;
};

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [depts, setDepts] = useState<OrgRow[]>([]);
  const [branches, setBranches] = useState<OrgRow[]>([]);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    headquarter: "",
    department: "",
    branch: ""
  });

  useEffect(() => {
    async function fetchOptions() {
      const { data: dData } = await supabase.from("departments").select("*").order("name");
      const { data: bData } = await supabase.from("branches").select("*").order("name");
      if (dData) setDepts(dData);
      if (bData) setBranches(bData);
    }
    fetchOptions();
  }, []);

  const headquarters = useMemo(() => {
    return HEADQUARTER_OPTIONS;
  }, []);

  const filteredDepts = useMemo(() => {
    if (!formData.headquarter) return [];
    const hasHeadquarterData = depts.some((dept) => dept.headquarter || dept.hq);
    if (!hasHeadquarterData) return depts;
    return depts.filter((dept) => (dept.headquarter || dept.hq) === formData.headquarter);
  }, [depts, formData.headquarter]);

  const selectedDept = filteredDepts.find((dept) => dept.name === formData.department);

  const filteredBranches = useMemo(() => {
    if (!formData.department) return [];
    return branches.filter((branch) => {
      const sameDeptName = branch.dept_name === formData.department || branch.department === formData.department;
      const sameDeptId = selectedDept?.id && (branch.department_id === selectedDept.id || branch.dept_id === selectedDept.id);
      return sameDeptName || sameDeptId;
    });
  }, [branches, formData.department, selectedDept]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: dbError } = await supabase.from("users").insert([
          {
            id: authData.user.id,
            email: formData.email,
            name: formData.name,
            role: "agent",
            role_level: "staff",
            headquarter: formData.headquarter,
            headquarter_name: formData.headquarter,
            department: formData.department,
            team: formData.branch,
            is_approved: false,
          },
        ]);

        if (dbError) throw dbError;
        alert("가입 신청이 완료되었습니다. 관리자 승인 후 이용 가능합니다.");
        router.push("/login");
      }
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "가입 신청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-bold text-slate-900 outline-none transition focus:border-[#2563eb] focus:bg-white";
  const selectClass = "w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-bold text-slate-900 outline-none transition focus:border-[#2563eb] focus:bg-white disabled:cursor-not-allowed disabled:opacity-45";

  return (
    <div className="min-h-screen bg-[#eef3fb] px-5 py-8 text-slate-900">
      <div className="mx-auto w-full max-w-3xl rounded-[2rem] bg-white p-6 shadow-2xl md:p-10">
        <div className="mb-8 flex flex-col gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.25em] text-[#2563eb]">SIGN UP</p>
            <h1 className="mt-2 text-3xl font-black text-[#1a3a6e]">회원가입 신청</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">승인 후 인슈런스 매니저를 이용할 수 있습니다.</p>
          </div>
          <button onClick={() => router.push("/login")} className="rounded-xl bg-slate-100 px-4 py-3 text-xs font-black text-slate-500 hover:bg-slate-200">
            로그인으로 돌아가기
          </button>
        </div>
        
        <form onSubmit={handleSignup} className="grid gap-5">
          <div className="grid gap-5 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-xs font-bold text-slate-500">이메일 아이디</span>
              <input type="email" placeholder="example@email.com" required className={inputClass}
                value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </label>

            <label>
              <span className="mb-2 block text-xs font-bold text-slate-500">이름</span>
              <input type="text" placeholder="실명을 입력하세요" required className={inputClass}
                value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <label>
              <span className="mb-2 block text-xs font-bold text-slate-500">본부</span>
              <select required className={selectClass}
                value={formData.headquarter} 
                onChange={(e) => setFormData({...formData, headquarter: e.target.value, department: "", branch: ""})}>
                <option value="">본부 선택</option>
                {headquarters.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-xs font-bold text-slate-500">사업부</span>
              <select required disabled={!formData.headquarter} className={selectClass}
                value={formData.department} 
                onChange={(e) => setFormData({...formData, department: e.target.value, branch: ""})}>
                <option value="">사업부 선택</option>
                {filteredDepts.map((dept) => <option key={dept.id || dept.name} value={dept.name}>{dept.name}</option>)}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-xs font-bold text-slate-500">지점</span>
              <select required disabled={!formData.department} className={selectClass}
                value={formData.branch} onChange={(e) => setFormData({...formData, branch: e.target.value})}>
                <option value="">지점 선택</option>
                {filteredBranches.map((branch) => <option key={branch.id || branch.name} value={branch.name}>{branch.name}</option>)}
              </select>
            </label>
          </div>

          <label>
            <span className="mb-2 block text-xs font-bold text-slate-500">비밀번호</span>
            <input type="password" placeholder="6자 이상 입력" required minLength={6} className={inputClass}
              value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
          </label>

          <button type="submit" disabled={loading} className="mt-2 w-full rounded-2xl bg-[#1a3a6e] py-5 text-lg font-black text-white transition hover:bg-[#2563eb] disabled:opacity-60">
            {loading ? "가입 신청 중..." : "가입 신청하기"}
          </button>
        </form>
      </div>
    </div>
  )
}
