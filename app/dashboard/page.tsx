"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import Sidebar from "./components/Sidebar"
import AgentView from "./components/AgentView"
import AdminView from "./components/masterView"
import LeaderView from "./components/LeaderView"
import ManagerView from "./components/ManagerView"
import FinancialCalc from "./components/FinancialCalc"

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'select' | 'office' | 'consulting'>('select');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [menuStatus, setMenuStatus] = useState<any>({});

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace("/login");
      
      const { data: userInfo } = await supabase.from("users").select("*").eq("id", session.user.id).maybeSingle();
      if (!userInfo) return router.replace("/login");
      
      const { data: settings } = await supabase.from("team_settings").select("key, value");
      const sObj = settings?.reduce((acc: any, curr: any) => ({ ...acc, [curr.key]: curr.value === "true" }), {}) || {};
      
      setMenuStatus(sObj);
      setUser(userInfo);
      setLoading(false);
    }
    init();
  }, [router]);

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center font-black">시스템 동기화 중...</div>;

  // 🛡️ [권한 판별 로직] - 이 순서가 틀리면 화면이 꼬입니다.
  const email = (user.email || "").toLowerCase().trim();
  const role = (user.role || "").toLowerCase();
  const roleLevel = (user.role_level || "").toLowerCase();

  // 1. 마스터 (최고 관리자): 특정 이메일이거나 역할이 master인 경우
  const isMaster = email === 'qodbtjq@naver.com' || role === 'master' || roleLevel === 'master';
  
  // 2. 사업부장 (리더): 마스터가 아니면서 리더 권한인 경우
  const isLeader = !isMaster && (role === 'leader' || roleLevel === 'director' || roleLevel === 'leader');
  
  // 3. 지점장 (매니저): 위 권한이 아니면서 매니저인 경우
  const isManager = !isMaster && !isLeader && (role === 'manager' || roleLevel === 'manager');
  
  // 4. 승인 여부 (상담 도구 접근권한)
  const isApproved = isMaster || isLeader || isManager || role === 'agent' || String(user.is_approved) === "true";

  // [메인 렌더링 영역]
  if (viewMode === 'select') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8fafc] font-black p-6">
        <h1 className="text-5xl mb-16 italic tracking-tighter"><span className="text-blue-600">{user.name}</span>님, 환영합니다!</h1>
        <div className="flex flex-col md:flex-row gap-10 w-full max-w-5xl">
          <button onClick={() => setViewMode('office')} className="flex-1 h-[400px] bg-white border-[4px] border-black rounded-[2.5rem] flex flex-col items-center justify-center shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:shadow-none transition-all">
            <span className="text-8xl mb-4">🏢</span><h2 className="text-4xl uppercase">사무실 업무</h2>
          </button>
          <button onClick={() => setViewMode('consulting')} className="flex-1 h-[400px] bg-blue-600 border-[4px] border-black rounded-[2.5rem] flex flex-col items-center justify-center text-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:shadow-none transition-all">
            <span className="text-8xl mb-4">🤝</span><h2 className="text-4xl uppercase">고객 상담</h2>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row overflow-x-hidden font-black">
      <Sidebar 
        user={user} selectedDate={selectedDate} onDateChange={setSelectedDate} mode={viewMode} 
        onBack={() => { setViewMode('select'); setActiveTab(null); }} 
        externalMenuStatus={menuStatus} onMenuStatusChange={setMenuStatus} 
        isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} 
        onTabChange={setActiveTab} activeTab={activeTab}
      />
      <main className={`flex-1 p-4 lg:p-10 transition-all duration-300 ${isSidebarOpen ? 'lg:ml-80' : 'lg:ml-0'}`}>
        {/* 탭 기반 화면 (계산기, 공시실, 수술비) */}
        {activeTab === 'finance' ? (
          <><HeaderBar title="Financial Calculator" icon="🧮" onBack={() => setActiveTab(null)} /><FinancialCalc /></>
        ) : activeTab === 'gongsi' ? (
          <><HeaderBar title="Insurance Gongsi" icon="📑" onBack={() => setActiveTab(null)} /><iframe src="/gongsi.html" className="w-full h-[80vh] border-4 border-black rounded-[2rem] bg-white" /></>
        ) : activeTab === 'surgery' ? (
          <><HeaderBar title="Surgery Search" icon="✂️" onBack={() => setActiveTab(null)} /><iframe src="/susul.html" className="w-full h-[80vh] border-4 border-black rounded-[2rem] bg-white" /></>
        ) : (
          /* 권한별 사무실/상담 화면 분기 */
          viewMode === 'office' ? (
            isMaster ? <AdminView user={user} selectedDate={selectedDate} /> :
            isLeader ? <LeaderView user={user} selectedDate={selectedDate} /> :
            isManager ? <ManagerView user={user} selectedDate={selectedDate} /> :
            <AgentView user={user} selectedDate={selectedDate} />
          ) : (
             /* ConsultingView 로직 (생략된 경우 아래 직접 삽입 가능) */
             <div className="max-w-6xl mx-auto py-10">
                <h1 className="text-4xl italic mb-10 border-l-8 border-blue-600 pl-6">Professional Consulting</h1>
                {/* 기존 ConsultingView의 카드 그리드 로직이 들어가는 곳입니다 */}
             </div>
          )
        )}
      </main>
    </div>
  );
}

function HeaderBar({ title, icon, onBack }: any) {
  return (
    <div className="mb-6 flex justify-between items-center bg-white p-4 rounded-[2rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] font-black">
      <div className="flex items-center gap-4 ml-4"><span className="text-3xl">{icon}</span><h2 className="text-xl italic uppercase">{title}</h2></div>
      <button onClick={onBack} className="w-12 h-12 flex items-center justify-center bg-black text-[#d4af37] rounded-full text-2xl">×</button>
    </div>
  );
}