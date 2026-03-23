"use client"
import { useState, useEffect } from "react"
import Calendar from "react-calendar"
import 'react-calendar/dist/Calendar.css'
import { supabase } from "../../../lib/supabase"
import { useRouter } from "next/navigation"

export default function Sidebar({ user, selectedDate, onDateChange, mode, onBack }: any) {
  const router = useRouter();
  const [dailyAdminNotice, setDailyAdminNotice] = useState("");
  const [privateMemo, setPrivateMemo] = useState("");
  const [threeMonthAvg, setThreeMonthAvg] = useState({ amt: 0, cnt: 0 });
  
  // ✅ 사이드바 버튼 상태 (요청하신 대로 유지)
  const [menuStatus, setMenuStatus] = useState<any>({
    show_finance: true, show_insu: true, show_cafe: true, show_hira: true, show_cont: true
  });
  const [isEditMode, setIsEditMode] = useState(false);

  const dateStr = selectedDate.toLocaleDateString('en-CA');
  const isAdmin = user.role === 'admin' || user.role === 'master';
  const isMaster = user.role === 'master';

  useEffect(() => {
    fetchDailyData();
    fetch3MonthAvg(); // ✅ 실적 로드
    fetchMenuSettings();
    const savedPrivate = localStorage.getItem(`memo_${user.id}`);
    setPrivateMemo(savedPrivate || "");
  }, [dateStr, user.id]);

  // 📈 3개월 실적 계산 로직 (가장 확실한 버전)
  async function fetch3MonthAvg() {
    try {
      const now = new Date();
      // 이번 달의 1일 구하기 (예: 3월 23일 -> 3월 1일)
      const currentMonthFirstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      // 3개월 전의 1일 구하기 (예: 1월 1일)
      const startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      
      const startStr = startDate.toISOString().split('T')[0];

      let query = supabase
        .from("performance") // 💡 테이블 이름이 정확한지 꼭 확인하세요!
        .select("amount, count, contract_amt, contract_cnt")
        .gte("date", startStr);

      // ✅ 직원은 자기 것만, 관리자는 팀 전체 합산
      if (!isAdmin) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;

      if (data && data.length > 0) {
        // 모든 필드명(contract_amt, amount 등)에 유연하게 대응하여 합산
        const totalAmt = data.reduce((sum, item) => sum + (Number(item.contract_amt || item.amount || 0)), 0);
        const totalCnt = data.reduce((sum, item) => sum + (Number(item.contract_cnt || item.count || 0)), 0);
        
        // 데이터가 몇 개든 3개월 평균으로 환산
        setThreeMonthAvg({
          amt: Math.round(totalAmt / 3),
          cnt: Number((totalCnt / 3).toFixed(1))
        });
      } else {
        setThreeMonthAvg({ amt: 0, cnt: 0 });
      }
    } catch (err) {
      console.error("실적 계산 오류:", err);
    }
  }

  async function fetchMenuSettings() {
    const { data } = await supabase.from("team_settings").select("key, value");
    if (data) {
      const settings = data.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value === "true";
        return acc;
      }, {});
      setMenuStatus((prev: any) => ({ ...prev, ...settings }));
    }
  }

  const toggleMenu = async (key: string) => {
    const newValue = !((menuStatus as any)[key]);
    setMenuStatus((prev: any) => ({ ...prev, [key]: newValue }));
    await supabase.from("team_settings").upsert({ key: key, value: String(newValue) }, { onConflict: 'key' });
  };

  async function fetchDailyData() {
    const { data } = await supabase.from("daily_stats").select("admin_notice").eq("date", dateStr).maybeSingle();
    setDailyAdminNotice(data?.admin_notice || "");
  }

  async function saveDailyNotice() {
    if (!isAdmin) return;
    const { error } = await supabase.from("daily_stats").upsert({ date: dateStr, admin_notice: dailyAdminNotice }, { onConflict: 'date' });
    if (!error) alert("공지사항이 저장되었습니다.");
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login"); };

  return (
    <aside className="w-full lg:w-80 bg-white border-r p-6 flex flex-col gap-6 shadow-sm z-10 font-black overflow-y-auto min-h-screen">
      
      <button onClick={onBack} className="text-left text-[10px] text-slate-400 hover:text-black mb-[-10px] font-black italic">
        ← BACK TO SELECTOR
      </button>

      <div className="flex justify-between items-center border-b-4 border-black pb-1">
        <h2 className="text-2xl italic uppercase tracking-tighter font-black">
          {mode === 'office' ? 'History' : 'Consult'}
        </h2>
        {isMaster && (
          <button onClick={() => setIsEditMode(!isEditMode)} className={`text-[10px] px-2 py-1 rounded font-bold ${isEditMode ? 'bg-red-500 text-white' : 'bg-slate-200'}`}>
            {isEditMode ? "완료" : "⚙️ 메뉴 관리"}
          </button>
        )}
      </div>
      
      {mode === 'office' && (
        <>
          <div className="flex justify-center bg-slate-50 p-2 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <Calendar 
              onChange={onDateChange} 
              value={selectedDate} 
              locale="ko-KR"
              calendarType="gregory" // ✅ 일~토 순서 고정
              formatDay={(l, d) => d.getDate().toString()} 
              className="border-none bg-transparent font-black"
            />
          </div>

          <div className="bg-black text-white p-5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(67,97,238,1)]">
            <p className="text-[10px] uppercase italic text-slate-400 mb-2 font-black">
              {isAdmin ? "Team 3-Month Average" : "My 3-Month Average"}
            </p>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-2xl font-black italic">₩{threeMonthAvg.amt.toLocaleString()}</p>
                <p className="text-[10px] text-blue-400 font-bold">Monthly Avg Revenue</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black">{threeMonthAvg.cnt}건</p>
                <p className="text-[10px] text-slate-400 font-bold">Avg Count</p>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* 🚀 퀵링크 섹션 (모든 버튼 무생략) */}
      <div className="px-1 space-y-3">
        <p className="text-[9px] text-slate-400 uppercase italic mb-1 tracking-widest font-black">Quick Links</p>
        
        {/* 재무 분석 도구 */}
        {(menuStatus.show_finance || isEditMode) && (
          <div className="relative">
            <button onClick={() => !isEditMode && window.open("/financial_planner.html", "_blank")} className={`w-full flex items-center justify-center gap-3 py-3 border-2 border-black rounded-xl bg-white ${!menuStatus.show_finance && 'opacity-40'}`}>
              <span className="text-lg">📊</span><span className="text-[11px] font-black">재무 분석 도구</span>
            </button>
            {isEditMode && <input type="checkbox" checked={menuStatus.show_finance} onChange={() => toggleMenu("show_finance")} className="absolute top-1/2 -right-2 transform -translate-y-1/2 w-4 h-4 accent-black cursor-pointer"/>}
          </div>
        )}

        {/* 보장분석 탭 */}
        {(menuStatus.show_insu || isEditMode) && (
          <div className="relative">
            <button onClick={() => !isEditMode && window.open("/insu.html", "_blank")} className={`w-full flex items-center justify-center gap-3 py-3 border-2 border-blue-600 rounded-xl bg-white ${!menuStatus.show_insu && 'opacity-40'}`}>
              <span className="text-lg">🛡️</span><span className="text-[11px] font-black">보장분석 탭</span>
            </button>
            {isEditMode && <input type="checkbox" checked={menuStatus.show_insu} onChange={() => toggleMenu("show_insu")} className="absolute top-1/2 -right-2 transform -translate-y-1/2 w-4 h-4 accent-blue-600 cursor-pointer"/>}
          </div>
        )}

        {/* 진료기록 확인 */}
        {(menuStatus.show_hira || isEditMode) && (
          <div className="relative">
            <button onClick={() => !isEditMode && window.open("https://www.hira.or.kr/dummy.do?pgmid=HIRAA030009200000&WT.gnb=내+진료정보+열람", "_blank")} className={`w-full flex items-center justify-center gap-3 py-3 border-2 border-orange-500 rounded-xl bg-white ${!menuStatus.show_hira && 'opacity-40'}`}>
              <span className="text-lg">🏥</span><span className="text-[11px] font-black">진료기록 확인</span>
            </button>
            {isEditMode && <input type="checkbox" checked={menuStatus.show_hira} onChange={() => toggleMenu("show_hira")} className="absolute top-1/2 -right-2 transform -translate-y-1/2 w-4 h-4 accent-orange-500 cursor-pointer"/>}
          </div>
        )}

        {/* 숨은 보험금 찾기 */}
        {(menuStatus.show_cont || isEditMode) && (
          <div className="relative">
            <button onClick={() => !isEditMode && window.open("https://cont.insure.or.kr/cont_web/intro.do", "_blank")} className={`w-full flex items-center justify-center gap-3 py-3 border-2 border-emerald-500 rounded-xl bg-white ${!menuStatus.show_cont && 'opacity-40'}`}>
              <span className="text-lg">🔍</span><span className="text-[11px] font-black">숨은 보험금 찾기</span>
            </button>
            {isEditMode && <input type="checkbox" checked={menuStatus.show_cont} onChange={() => toggleMenu("show_cont")} className="absolute top-1/2 -right-2 transform -translate-y-1/2 w-4 h-4 accent-emerald-500 cursor-pointer"/>}
          </div>
        )}

        {/* 성장연구소 카페 */}
        {(menuStatus.show_cafe || isEditMode) && (
          <div className="relative">
            <button onClick={() => !isEditMode && window.open("https://cafe.naver.com/signal1035", "_blank")} className={`w-full flex items-center justify-center gap-3 py-3 border-2 border-[#2db400] rounded-xl bg-white ${!menuStatus.show_cafe && 'opacity-40'}`}>
              <span className="text-lg">☕</span><span className="text-[11px] font-black">성장연구소 카페</span>
            </button>
            {isEditMode && <input type="checkbox" checked={menuStatus.show_cafe} onChange={() => toggleMenu("show_cafe")} className="absolute top-1/2 -right-2 transform -translate-y-1/2 w-4 h-4 accent-[#2db400] cursor-pointer"/>}
          </div>
        )}
      </div>

      {/* 📝 메모 영역 (권한 분리 로직 포함) */}
      <div className="flex flex-col gap-4 mt-auto pt-4 border-t border-slate-100">
        {mode === 'office' && (
          <>
            <div>
              <div className="flex justify-between items-center mb-1 px-1 text-[9px] text-slate-400 uppercase italic font-black">
                <span>Admin Notice</span>
                {isAdmin && <button onClick={saveDailyNotice} className="text-blue-600 hover:underline">SAVE</button>}
              </div>
              <textarea 
                readOnly={!isAdmin} 
                value={dailyAdminNotice} 
                onChange={(e) => setDailyAdminNotice(e.target.value)} 
                className={`w-full h-20 p-3 text-[11px] border-2 border-black rounded-xl resize-none font-bold ${!isAdmin ? 'bg-slate-50 text-slate-600' : 'bg-yellow-50 text-black'}`} 
                placeholder={isAdmin ? "관리자 공지를 입력하세요." : "공지가 없습니다."}
              />
            </div>
            <div>
              <p className="text-[9px] text-slate-400 uppercase italic mb-1 px-1 font-black">Private Memo</p>
              <textarea 
                value={privateMemo} 
                onChange={(e) => {setPrivateMemo(e.target.value); localStorage.setItem(`memo_${user.id}`, e.target.value);}} 
                className="w-full h-20 p-3 text-[11px] border-2 border-slate-200 rounded-xl bg-slate-50 resize-none font-bold italic" 
                placeholder="나만의 메모..."
              />
            </div>
          </>
        )}
        <button onClick={handleLogout} className="w-full py-3 text-[11px] font-black text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest">LOGOUT SYSTEM</button>
      </div>
    </aside>
  );
}