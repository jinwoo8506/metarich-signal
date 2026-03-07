"use client"
import React, { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import AdminPopups from "./AdminPopups"
import CalcModal from "./CalcModal"
import * as XLSX from 'xlsx-js-style'   // ← npm install xlsx-js-style  (기존 'xlsx' 패키지 대체)
import { jsPDF } from "jspdf"
import "jspdf-autotable"

export default function AdminView({ user, selectedDate }: { user: any, selectedDate: Date }) {
  const [agents, setAgents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [globalNotice, setGlobalNotice] = useState("");
  const [isNoticeExpanded, setIsNoticeExpanded] = useState(false); 
  const [teamMeta, setTeamMeta] = useState({ targetAmt: 3000, targetCnt: 100, targetIntro: 10, actualIntro: 0 });
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [showExportOpt, setShowExportOpt] = useState(false);

  // 활동 관리 탭용 전체 합산 데이터
  const [totalActivity, setTotalActivity] = useState({ call: 0, meet: 0, pt: 0, intro: 0 });

  const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-01`;

  useEffect(() => { fetchTeamData(); }, [monthKey]);

  async function fetchTeamData() {
    const { data: settings } = await supabase.from("team_settings").select("*");
    setGlobalNotice(settings?.find(s => s.key === 'global_notice')?.value || "공지사항이 없습니다.");
    setTeamMeta({
      targetAmt: Number(settings?.find(s => s.key === 'target_amt')?.value) || 3000,
      targetCnt: Number(settings?.find(s => s.key === 'target_cnt')?.value) || 100,
      targetIntro: Number(settings?.find(s => s.key === 'team_target_intro')?.value) || 10,
      actualIntro: Number(settings?.find(s => s.key === 'actual_intro_cnt')?.value) || 0
    });

    const { data: users } = await supabase.from("users").select("*").eq("role", "agent");
    const { data: perfs } = await supabase.from("daily_perf").select("*").eq("date", monthKey);
    
    if (users) {
      const mappedAgents = users.map(u => ({
        ...u,
        performance: perfs?.find(p => p.user_id === u.id) || { 
          call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0,
          contract_amt: 0, contract_cnt: 0, target_amt: 300, target_cnt: 10, edu_status: '미참여', is_approved: false
        }
      }));
      setAgents(mappedAgents);

      // 전체 활동 합산 계산
      const totals = mappedAgents.reduce((acc, curr) => ({
        call:  acc.call  + Number(curr.performance.call  || 0),
        meet:  acc.meet  + Number(curr.performance.meet  || 0),
        pt:    acc.pt    + Number(curr.performance.pt    || 0),
        intro: acc.intro + Number(curr.performance.intro || 0)
      }), { call: 0, meet: 0, pt: 0, intro: 0 });
      setTotalActivity(totals);
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // 엑셀 스타일 헬퍼 (컴포넌트 내부 정의 — 별도 파일 불필요)
  // ══════════════════════════════════════════════════════════════════════
  const B_THIN = {
    top:    { style: "thin",   color: { rgb: "FFAAAAAA" } },
    bottom: { style: "thin",   color: { rgb: "FFAAAAAA" } },
    left:   { style: "thin",   color: { rgb: "FFAAAAAA" } },
    right:  { style: "thin",   color: { rgb: "FFAAAAAA" } },
  };
  const B_MED = {
    top:    { style: "medium", color: { rgb: "FF000000" } },
    bottom: { style: "medium", color: { rgb: "FF000000" } },
    left:   { style: "medium", color: { rgb: "FF000000" } },
    right:  { style: "medium", color: { rgb: "FF000000" } },
  };

  const xs = (bg: string|null, fg: string, bold: boolean, sz: number, hAlign="center", border: any=B_THIN): any => ({
    font:      { name: "맑은 고딕", sz, bold, color: { rgb: fg } },
    fill:      bg ? { fgColor: { rgb: bg }, patternType: "solid" } : { patternType: "none" },
    alignment: { horizontal: hAlign, vertical: "center", wrapText: true },
    border,
  });

  const X = {
    title:         xs("FF1F3864","FFFFFFFF",true, 16,"center",B_MED),
    subtitle:      xs("FF1F3864","FF888888",false, 9,"right"),
    secHead:       xs("FF2E5FA3","FFFFFFFF",true, 11,"left"),
    colHead:       xs("FF4472C4","FFFFFFFF",true, 10),
    colHeadSm:     xs("FF2E5FA3","FFFFFFFF",true,  9),
    kpiLblBlue:    xs("FF4472C4","FFFFFFFF",true,  9),
    kpiLblGreen:   xs("FF70AD47","FFFFFFFF",true,  9),
    kpiLblOrange:  xs("FFED7D31","FFFFFFFF",true,  9),
    kpiValBlue:    xs("FFF0F4FF","FF2E5FA3",true, 14),
    kpiValGreen:   xs("FFF0F4FF","FF70AD47",true, 14),
    kpiValOrange:  xs("FFF0F4FF","FFED7D31",true, 14),
    dataEven:      xs("FFDDEEFF","FF1F2937",false,10),
    dataOdd:       xs("FFFFFFFF","FF1F2937",false,10),
    nameEven:      xs("FFDDEEFF","FF1F3864",true, 10),
    nameOdd:       xs("FFFFFFFF","FF1F3864",true, 10),
    rGreenEven:    xs("FFDDEEFF","FF70AD47",true, 10),
    rGreenOdd:     xs("FFFFFFFF","FF70AD47",true, 10),
    rRedEven:      xs("FFDDEEFF","FFFF0000",true, 10),
    rRedOdd:       xs("FFFFFFFF","FFFF0000",true, 10),
    retRedEven:    xs("FFDDEEFF","FFFF0000",false,10),
    retRedOdd:     xs("FFFFFFFF","FFFF0000",false,10),
    actSumEven:    xs("FFDDEEFF","FF2E5FA3",true, 10),
    actSumOdd:     xs("FFFFFFFF","FF2E5FA3",true, 10),
    totalHead:     xs("FF1F3864","FFFFFFFF",true, 10),
    totalRow:      xs("FFFFF2CC","FF1F2937",true, 10),
    totalGreen:    xs("FFFFF2CC","FF70AD47",true, 10),
    totalRed:      xs("FFFFF2CC","FFFF0000",true, 10),
    memberBanner:  xs("FFED7D31","FFFFFFFF",true, 12,"left"),
    metaGoalLbl:   xs("FF4472C4","FFFFFFFF",true, 10),
    metaActLbl:    xs("FFED7D31","FFFFFFFF",true, 10),
    metaRGreenLbl: xs("FF70AD47","FFFFFFFF",true, 10),
    metaRRedLbl:   xs("FFFF0000","FFFFFFFF",true, 10),
    metaVal:       xs("FFF5F5F5","FF1F2937",false,11),
    metaRGreen:    xs("FFF5F5F5","FF70AD47",true, 11),
    metaRRed:      xs("FFF5F5F5","FFFF0000",true, 11),
    convBlue:      xs("FFF0F7FF","FF2E5FA3",false, 9),
    convOrange:    xs("FFFFF8F0","FFED7D31",false, 9),
  };

  // 셀 쓰기
  const xc = (ws: any, r: number, c: number, v: any, s: any, fmt?: string) => {
    const addr = XLSX.utils.encode_cell({ r, c });
    ws[addr] = { v, t: typeof v === "number" ? "n" : "s", s };
    if (fmt) ws[addr].z = fmt;
  };
  // 병합
  const xm = (ws: any, rs: number, cs: number, re: number, ce: number) => {
    if (!ws["!merges"]) ws["!merges"] = [];
    ws["!merges"].push({ s:{r:rs,c:cs}, e:{r:re,c:ce} });
  };
  // 행 전체 채우기
  const xr = (ws: any, r: number, c1: number, c2: number, s: any) => {
    for (let c = c1; c <= c2; c++) xc(ws, r, c, "", s);
  };

  // ══════════════════════════════════════════════════════════════════════
  // handleExport
  // ══════════════════════════════════════════════════════════════════════
  const handleExport = (type: 'excel' | 'pdf') => {
    if (type === 'excel') {
      const wb = XLSX.utils.book_new();
      const yearMonth = monthKey.slice(0, 7).replace("-", "년 ") + "월";

      // ── 팀 집계 ────────────────────────────────────────────────────
      const totalActAmt = agents.reduce((s, a) => s + Number(a.performance.contract_amt || 0), 0);
      const totalActCnt = agents.reduce((s, a) => s + Number(a.performance.contract_cnt || 0), 0);
      const amtRate = teamMeta.targetAmt > 0 ? totalActAmt / teamMeta.targetAmt : 0;
      const cntRate = teamMeta.targetCnt > 0 ? totalActCnt / teamMeta.targetCnt : 0;
      let tCall=0, tMeet=0, tPt=0, tIntro=0, tDb=0, tRet=0;
      agents.forEach(a => {
        tCall  += Number(a.performance.call        || 0);
        tMeet  += Number(a.performance.meet        || 0);
        tPt    += Number(a.performance.pt          || 0);
        tIntro += Number(a.performance.intro       || 0);
        tDb    += Number(a.performance.db_assigned || 0);
        tRet   += Number(a.performance.db_returned || 0);
      });

      // ════════════════════════════════════════════════════════════════
      // TAB 1 : 📊 팀 전체 현황
      // ════════════════════════════════════════════════════════════════
      const ws1: any = { "!merges":[], "!rows":[] };
      ws1["!cols"] = [{wch:2},{wch:16},{wch:14},{wch:14},{wch:13},{wch:12},{wch:12},{wch:13},{wch:14},{wch:14},{wch:2}];

      let R = 0;
      const h = (px: number) => { ws1["!rows"][R] = { hpx: px }; };

      // 상단 여백
      h(10); R++;

      // 타이틀
      h(40); xr(ws1,R,1,9,X.title);
      xc(ws1,R,1,`🏆  영업팀 실적 현황 리포트 — ${yearMonth}`,X.title);
      xm(ws1,R,1,R,9); R++;

      // 부제
      h(16); xr(ws1,R,1,9,X.subtitle);
      xc(ws1,R,1,"※ 본 리포트는 팀 전체 목표 대비 실적 현황을 요약합니다.",X.subtitle);
      xm(ws1,R,1,R,9); R++;

      h(10); R++; // 간격

      // ── 섹션1: 팀 핵심 KPI ─────────────────────────────────────────
      h(24); xr(ws1,R,1,9,X.secHead);
      xc(ws1,R,1,"▌ 팀 핵심 KPI",X.secHead); xm(ws1,R,1,R,9); R++;

      // KPI 라벨
      h(22);
      const kpiSpans = [[1,2],[3,4],[5,6],[7,8],[9,9]];
      const kpiLabels = ["목표 금액","실적 금액","목표 건수","실적 건수","금액 달성률"];
      const kpiLSt = [
        X.kpiLblBlue,
        amtRate>=1 ? X.kpiLblGreen : X.kpiLblOrange,
        X.kpiLblBlue,
        cntRate>=1 ? X.kpiLblGreen : X.kpiLblOrange,
        amtRate>=1 ? X.kpiLblGreen : X.kpiLblOrange,
      ];
      kpiSpans.forEach(([c1,c2],i) => {
        xr(ws1,R,c1,c2,kpiLSt[i]); xc(ws1,R,c1,kpiLabels[i],kpiLSt[i]);
        if(c1!==c2) xm(ws1,R,c1,R,c2);
      }); R++;

      // KPI 값
      h(36);
      const kpiVals = [
        `${teamMeta.targetAmt.toLocaleString()}만원`,
        `${totalActAmt.toLocaleString()}만원`,
        `${teamMeta.targetCnt}건`,
        `${totalActCnt}건`,
        `${(amtRate*100).toFixed(1)}%`,
      ];
      const kpiVSt = [
        X.kpiValBlue,
        amtRate>=1 ? X.kpiValGreen : X.kpiValOrange,
        X.kpiValBlue,
        cntRate>=1 ? X.kpiValGreen : X.kpiValOrange,
        amtRate>=1 ? X.kpiValGreen : X.kpiValOrange,
      ];
      kpiSpans.forEach(([c1,c2],i) => {
        xr(ws1,R,c1,c2,kpiVSt[i]); xc(ws1,R,c1,kpiVals[i],kpiVSt[i]);
        if(c1!==c2) xm(ws1,R,c1,R,c2);
      }); R++;

      h(10); R++; // 간격

      // ── 섹션2: 팀원별 목표 vs 실적 ────────────────────────────────
      h(24); xr(ws1,R,1,9,X.secHead);
      xc(ws1,R,1,"▌ 팀원별 목표 vs 실적 현황",X.secHead); xm(ws1,R,1,R,9); R++;

      h(22);
      ["이름","목표금액(만)","실적금액(만)","금액달성률","목표건수","실적건수","건수달성률","초과/미달(만)","초과/미달(건)"]
        .forEach((v,i) => xc(ws1,R,1+i,v,X.colHead));
      R++;

      agents.forEach((a,ri) => {
        h(22);
        const p    = a.performance;
        const tAmt = Number(p.target_amt   || 1);
        const cAmt = Number(p.contract_amt || 0);
        const tCnt = Number(p.target_cnt   || 1);
        const cCnt = Number(p.contract_cnt || 0);
        const aRate = tAmt>0 ? cAmt/tAmt : 0;
        const cRate = tCnt>0 ? cCnt/tCnt : 0;
        const diffA = cAmt - tAmt;
        const diffC = cCnt - tCnt;
        const ev = ri%2===0;

        xc(ws1,R,1,a.name,                         ev?X.nameEven:X.nameOdd);
        xc(ws1,R,2,tAmt,                            ev?X.dataEven:X.dataOdd,"#,##0");
        xc(ws1,R,3,cAmt,                            ev?X.dataEven:X.dataOdd,"#,##0");
        xc(ws1,R,4,`${(aRate*100).toFixed(1)}%`,   aRate>=1?(ev?X.rGreenEven:X.rGreenOdd):(ev?X.rRedEven:X.rRedOdd));
        xc(ws1,R,5,tCnt,                            ev?X.dataEven:X.dataOdd);
        xc(ws1,R,6,cCnt,                            ev?X.dataEven:X.dataOdd);
        xc(ws1,R,7,`${(cRate*100).toFixed(1)}%`,   cRate>=1?(ev?X.rGreenEven:X.rGreenOdd):(ev?X.rRedEven:X.rRedOdd));
        xc(ws1,R,8,diffA,diffA>=0?(ev?X.rGreenEven:X.rGreenOdd):(ev?X.rRedEven:X.rRedOdd),"#,##0;-#,##0");
        xc(ws1,R,9,diffC,diffC>=0?(ev?X.rGreenEven:X.rGreenOdd):(ev?X.rRedEven:X.rRedOdd));
        R++;
      });

      // 합계 행
      h(24);
      const dA=totalActAmt-teamMeta.targetAmt, dC=totalActCnt-teamMeta.targetCnt;
      xc(ws1,R,1,"팀 합계",         X.totalHead);
      xc(ws1,R,2,teamMeta.targetAmt,X.totalRow,"#,##0");
      xc(ws1,R,3,totalActAmt,       X.totalRow,"#,##0");
      xc(ws1,R,4,`${(amtRate*100).toFixed(1)}%`,amtRate>=1?X.totalGreen:X.totalRed);
      xc(ws1,R,5,teamMeta.targetCnt,X.totalRow);
      xc(ws1,R,6,totalActCnt,       X.totalRow);
      xc(ws1,R,7,`${(cntRate*100).toFixed(1)}%`,cntRate>=1?X.totalGreen:X.totalRed);
      xc(ws1,R,8,dA,dA>=0?X.totalGreen:X.totalRed,"#,##0;-#,##0");
      xc(ws1,R,9,dC,dC>=0?X.totalGreen:X.totalRed);
      R++;

      h(10); R++; // 간격

      // ── 섹션3: 팀 전체 활동 현황 ────────────────────────────────
      h(24); xr(ws1,R,1,8,X.secHead);
      xc(ws1,R,1,"▌ 팀 전체 활동 현황 (전화 / 만남 / 제안 / 소개 / DB배정 / 반품)",X.secHead);
      xm(ws1,R,1,R,8); R++;

      h(22);
      ["이름","전화","만남","제안","소개","DB배정","반품","활동합계"]
        .forEach((v,i) => xc(ws1,R,1+i,v,X.colHead));
      R++;

      agents.forEach((a,ri) => {
        h(22);
        const p = a.performance;
        const ev = ri%2===0;
        const bg = ev?X.dataEven:X.dataOdd;
        const actTotal = Number(p.call||0)+Number(p.meet||0)+Number(p.pt||0)
                        +Number(p.intro||0)+Number(p.db_assigned||0)+Number(p.db_returned||0);
        xc(ws1,R,1,a.name,                    ev?X.nameEven:X.nameOdd);
        xc(ws1,R,2,Number(p.call        ||0), bg);
        xc(ws1,R,3,Number(p.meet        ||0), bg);
        xc(ws1,R,4,Number(p.pt          ||0), bg);
        xc(ws1,R,5,Number(p.intro       ||0), bg);
        xc(ws1,R,6,Number(p.db_assigned ||0), bg);
        xc(ws1,R,7,Number(p.db_returned ||0), Number(p.db_returned||0)>0?(ev?X.retRedEven:X.retRedOdd):bg);
        xc(ws1,R,8,actTotal,                  ev?X.actSumEven:X.actSumOdd);
        R++;
      });

      // 활동 합계 행
      h(24);
      const gAct=tCall+tMeet+tPt+tIntro+tDb+tRet;
      xc(ws1,R,1,"팀 합계",X.totalHead);
      xc(ws1,R,2,tCall,    X.totalRow);
      xc(ws1,R,3,tMeet,    X.totalRow);
      xc(ws1,R,4,tPt,      X.totalRow);
      xc(ws1,R,5,tIntro,   X.totalRow);
      xc(ws1,R,6,tDb,      X.totalRow);
      xc(ws1,R,7,tRet,     tRet>0?X.totalRed:X.totalRow);
      xc(ws1,R,8,gAct,     X.totalGreen);
      R++;

      h(10); R++; // 간격

      // ── 섹션4: 활동 전환율 분석 ─────────────────────────────────
      h(24); xr(ws1,R,1,8,X.secHead);
      xc(ws1,R,1,"▌ 팀 전체 활동 전환율 분석",X.secHead); xm(ws1,R,1,R,8); R++;

      h(22);
      ["전화→만남 전환율","만남→제안 전환율","소개 건수","DB 배정","DB 반품","반품률"]
        .forEach((v,i) => xc(ws1,R,2+i,v,X.colHead));
      R++;

      h(26);
      const mc1 = tCall>0?(tMeet/tCall*100).toFixed(1):"0.0";
      const pc1 = tMeet>0?(tPt/tMeet*100).toFixed(1):"0.0";
      const rr  = tDb>0?(tRet/tDb*100).toFixed(1):"0.0";
      [`${mc1}%`,`${pc1}%`,`${tIntro}건`,`${tDb}건`,`${tRet}건`,`${rr}%`]
        .forEach((v,i) => xc(ws1,R,2+i,v, i===5&&Number(rr)>10?X.totalRed:X.totalRow));
      R++;

      ws1["!ref"] = XLSX.utils.encode_range({s:{r:0,c:0},e:{r:R+1,c:10}});
      XLSX.utils.book_append_sheet(wb, ws1, "📊 팀 전체 현황");

      // ════════════════════════════════════════════════════════════════
      // TAB 2 : 👤 개인별 상세 현황
      // ════════════════════════════════════════════════════════════════
      const ws2: any = { "!merges":[], "!rows":[] };
      ws2["!cols"] = [{wch:2},{wch:12},{wch:12},{wch:14},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12},{wch:2}];

      let R2 = 0;
      const h2 = (px: number) => { ws2["!rows"][R2] = { hpx: px }; };

      // 상단 여백
      h2(10); R2++;

      // 타이틀
      h2(40); xr(ws2,R2,1,8,X.title);
      xc(ws2,R2,1,`👤  팀원별 개인 실적 상세 리포트 — ${yearMonth}`,X.title);
      xm(ws2,R2,1,R2,8); R2++;

      // 부제
      h2(16); xr(ws2,R2,1,8,X.subtitle);
      xc(ws2,R2,1,"※ 팀원별 개인 목표·실적·활동 내역 상세 리포트입니다.",X.subtitle);
      xm(ws2,R2,1,R2,8); R2++;

      // 팀원별 블록 반복
      agents.forEach(a => {
        const p     = a.performance;
        const tAmt  = Number(p.target_amt   || 0);
        const cAmt  = Number(p.contract_amt || 0);
        const tCnt  = Number(p.target_cnt   || 1);
        const cCnt  = Number(p.contract_cnt || 0);
        const aRate = tAmt>0 ? cAmt/tAmt : 0;
        const cRate = tCnt>0 ? cCnt/tCnt : 0;
        const actTot= Number(p.call||0)+Number(p.meet||0)+Number(p.pt||0)
                     +Number(p.intro||0)+Number(p.db_assigned||0)+Number(p.db_returned||0);
        const mc  = Number(p.call||0)>0 ? (Number(p.meet||0)/Number(p.call||1)*100).toFixed(1):"0.0";
        const pc  = Number(p.meet||0)>0 ? (Number(p.pt||0)/Number(p.meet||1)*100).toFixed(1)  :"0.0";

        // 구분 여백
        h2(10); R2++;

        // 이름 배너
        h2(28); xr(ws2,R2,1,8,X.memberBanner);
        xc(ws2,R2,1,`◆  ${a.name}  |  영업사원 개인 현황`,X.memberBanner);
        xm(ws2,R2,1,R2,8); R2++;

        // 컬럼 헤더
        h2(22);
        xc(ws2,R2,1,"구분",        X.metaGoalLbl); xm(ws2,R2,1,R2,2);
        xc(ws2,R2,3,"금액 (만원)", X.metaGoalLbl); xm(ws2,R2,3,R2,4);
        xc(ws2,R2,5,"건수",        X.metaGoalLbl); xm(ws2,R2,5,R2,6);
        xc(ws2,R2,7,"",            X.metaGoalLbl); xm(ws2,R2,7,R2,8);
        R2++;

        // 목표 행
        h2(24);
        xc(ws2,R2,1,"목표",X.metaGoalLbl); xm(ws2,R2,1,R2,2);
        xc(ws2,R2,3,tAmt,  X.metaVal,"#,##0"); xm(ws2,R2,3,R2,4);
        xc(ws2,R2,5,tCnt,  X.metaVal);         xm(ws2,R2,5,R2,6);
        xc(ws2,R2,7,"",    X.metaVal);          xm(ws2,R2,7,R2,8);
        R2++;

        // 실적 행
        h2(24);
        xc(ws2,R2,1,"실적",X.metaActLbl);     xm(ws2,R2,1,R2,2);
        xc(ws2,R2,3,cAmt,  X.metaVal,"#,##0"); xm(ws2,R2,3,R2,4);
        xc(ws2,R2,5,cCnt,  X.metaVal);         xm(ws2,R2,5,R2,6);
        xc(ws2,R2,7,"",    X.metaVal);          xm(ws2,R2,7,R2,8);
        R2++;

        // 달성률 행
        h2(24);
        const rLbl = aRate>=1?X.metaRGreenLbl:X.metaRRedLbl;
        xc(ws2,R2,1,"달성률",                    rLbl);                     xm(ws2,R2,1,R2,2);
        xc(ws2,R2,3,`${(aRate*100).toFixed(1)}%`,aRate>=1?X.metaRGreen:X.metaRRed); xm(ws2,R2,3,R2,4);
        xc(ws2,R2,5,`${(cRate*100).toFixed(1)}%`,cRate>=1?X.metaRGreen:X.metaRRed); xm(ws2,R2,5,R2,6);
        xc(ws2,R2,7,"",X.metaVal);               xm(ws2,R2,7,R2,8);
        R2++;

        // 활동 헤더
        h2(22);
        ["전화","만남","제안","소개","DB배정","반품","활동합계"]
          .forEach((v,i) => xc(ws2,R2,1+i,v,X.colHeadSm));
        xc(ws2,R2,8,"",X.colHeadSm);
        R2++;

        // 활동 데이터
        h2(24);
        [Number(p.call||0),Number(p.meet||0),Number(p.pt||0),
         Number(p.intro||0),Number(p.db_assigned||0),Number(p.db_returned||0),actTot
        ].forEach((v,i) => {
          xc(ws2,R2,1+i,v,
            i===5&&v>0 ? X.retRedEven
            : i===6    ? X.actSumEven
            :             X.dataEven);
        });
        xc(ws2,R2,8,"",X.dataEven);
        R2++;

        // 전환율 행
        h2(22);
        xc(ws2,R2,1,`전화→만남 전환율: ${mc}%`,X.convBlue);   xm(ws2,R2,1,R2,4);
        xc(ws2,R2,5,`만남→제안 전환율: ${pc}%`,X.convOrange); xm(ws2,R2,5,R2,8);
        R2++;
      });

      ws2["!ref"] = XLSX.utils.encode_range({s:{r:0,c:0},e:{r:R2+1,c:9}});
      XLSX.utils.book_append_sheet(wb, ws2, "👤 개인별 상세 현황");

      XLSX.writeFile(wb, `Team_Report_${monthKey}.xlsx`);

    } else {
      // ── PDF 출력 (기존 로직 100% 유지) ─────────────────────────────
      const doc = new jsPDF();
      (doc as any).autoTable({ 
        head: [['성명', '목표(만)', '실적(만)', '건수', '전화', '만남', '제안', '소개']], 
        body: agents.map(a => [
          a.name, 
          Number(a.performance.target_amt   || 0), 
          Number(a.performance.contract_amt  || 0), 
          Number(a.performance.contract_cnt  || 0), 
          Number(a.performance.call          || 0), 
          Number(a.performance.meet          || 0), 
          Number(a.performance.pt            || 0), 
          Number(a.performance.intro         || 0)
        ]) 
      });
      doc.save(`Team_Report_${monthKey}.pdf`);
    }
    setShowExportOpt(false);
  };

  // ══════════════════════════════════════════════════════════════════════
  // JSX (원본 100% 유지)
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div className="flex-1 space-y-6 font-black p-4 md:p-6">
      {/* 상단 공지사항: 클릭 시 아래로 확장되어 전체 내용 확인 가능 */}
      <div 
        onClick={() => setIsNoticeExpanded(!isNoticeExpanded)}
        className={`bg-[#d4af37] p-4 rounded-3xl border-2 border-black flex items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer transition-all duration-300 ${isNoticeExpanded ? 'min-h-[3.5rem] h-auto' : 'h-14 overflow-hidden'}`}
      >
        <div className={`font-black italic uppercase text-black w-full text-sm md:text-base ${isNoticeExpanded ? 'whitespace-normal leading-relaxed' : 'whitespace-nowrap animate-marquee'}`}>
          {globalNotice}
        </div>
      </div>

      {/* 퀵링크 섹션: 총 4개 버튼 (메타온, 자료실, 업무지원(계산기), 실적 출력) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-[2rem] border-2 border-black">
        <a href="https://meta-on.kr/#/login" target="_blank" rel="noreferrer" className="bg-white border-2 border-black p-4 rounded-2xl text-[11px] md:text-xs text-center italic hover:bg-black hover:text-[#d4af37] transition-all shadow-sm font-black uppercase">메타온</a>
        <a href="https://drive.google.com/drive/u/2/folders/1-JlU3eS70VN-Q65QmD0JlqV-8lhx6Nbm" target="_blank" rel="noreferrer" className="bg-white border-2 border-black p-4 rounded-2xl text-[11px] md:text-xs text-center italic hover:bg-black hover:text-[#d4af37] transition-all shadow-sm font-black uppercase">자료실</a>
        <button onClick={() => setIsCalcOpen(true)} className="bg-white border-2 border-black p-4 rounded-2xl text-[11px] md:text-xs text-center italic hover:bg-black hover:text-[#d4af37] transition-all shadow-sm font-black uppercase">업무지원(계산기)</button>
        
        <div className="relative">
          <button onClick={() => setShowExportOpt(!showExportOpt)} className="w-full bg-black text-[#d4af37] p-4 rounded-2xl text-[11px] md:text-xs italic shadow-lg font-black uppercase">실적 출력</button>
          {showExportOpt && (
            <div className="absolute top-full right-0 mt-2 bg-white border-2 border-black rounded-2xl shadow-2xl z-50 w-full overflow-hidden">
              <button onClick={() => handleExport('excel')} className="w-full p-4 hover:bg-slate-50 border-b text-left text-[11px] font-black">EXCEL 출력</button>
              <button onClick={() => handleExport('pdf')} className="w-full p-4 hover:bg-slate-50 text-left text-[11px] font-black">PDF 출력</button>
            </div>
          )}
        </div>
      </div>

      {/* 활동 관리 탭 클릭 시 상단에 총 합산 데이터 표기 */}
      {activeTab === 'act' && !selectedAgent && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in duration-300">
          <TotalBox label="전체 전화" val={totalActivity.call} />
          <TotalBox label="전체 만남" val={totalActivity.meet} sub={`전환율 ${totalActivity.call > 0 ? ((totalActivity.meet/totalActivity.call)*100).toFixed(1) : 0}%`} />
          <TotalBox label="전체 제안" val={totalActivity.pt} sub={`전환율 ${totalActivity.meet > 0 ? ((totalActivity.pt/totalActivity.meet)*100).toFixed(1) : 0}%`} />
          <TotalBox label="전체 소개" val={totalActivity.intro} />
        </div>
      )}

      {/* 메인 탭 메뉴 (모바일 가독성 최적화) */}
      <div className="grid grid-cols-4 gap-2 font-black">
        {['perf', 'act', 'edu', 'sys'].map(t => (
          <button key={t} onClick={()=>setActiveTab(t)} className={`${activeTab === t ? 'bg-black text-[#d4af37]' : 'bg-white text-black'} border-2 border-black py-4 px-1 rounded-2xl text-[10px] md:text-sm italic font-black text-center transition-all`}>
            {t==='perf'?'실적 관리':t==='act'?'활동 관리':t==='edu'?'교육 관리':'시스템 설정'}
          </button>
        ))}
      </div>

      {/* 팀 모니터링 섹션 (직원 리스트) */}
      <section className="bg-white p-6 md:p-8 rounded-[2.5rem] md:rounded-[3.5rem] border shadow-sm font-black">
        <h2 className="text-lg md:text-xl mb-6 border-l-8 border-black pl-4 italic uppercase font-black">Team Monitoring</h2>
        <div className="space-y-4 md:space-y-6">
          {agents.map(a => {
            const progress = Math.min(((Number(a.performance.contract_amt) || 0) / (Number(a.performance.target_amt) || 1)) * 100, 100);
            return (
              <div key={a.id} onClick={() => { setSelectedAgent(a); setActiveTab('act'); }} className="p-5 md:p-8 bg-slate-50 rounded-[1.5rem] md:rounded-[2.5rem] border-2 border-transparent hover:border-black cursor-pointer transition-all font-black shadow-sm space-y-4">
                <div className="flex justify-between items-end">
                  <p className="text-lg md:text-xl font-black">{a.name} CA</p>
                  <div className="flex gap-4 md:gap-10 text-right">
                    <div className="font-black">
                      <p className="text-[8px] md:text-[10px] text-slate-400 uppercase">Goal</p>
                      <p className="text-[12px] md:text-[15px] italic">{(Number(a.performance.target_amt) || 0).toLocaleString()}만</p>
                    </div>
                    <div className="font-black">
                      <p className="text-[8px] md:text-[10px] text-indigo-500 uppercase font-black">Actual</p>
                      <p className="text-[14px] md:text-[18px] text-indigo-600 italic">{(Number(a.performance.contract_amt) || 0).toLocaleString()}만</p>
                    </div>
                  </div>
                </div>
                
                <div className="w-full h-2 md:h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-black transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>

                <div className="grid grid-cols-4 gap-1 md:gap-2 pt-2 border-t border-dashed border-slate-300">
                  <div className="text-center"><p className="text-[8px] md:text-[9px] text-slate-400">전화</p><p className="text-[11px] md:text-sm italic">{a.performance.call}회</p></div>
                  <div className="text-center"><p className="text-[8px] md:text-[9px] text-slate-400">만남</p><p className="text-[11px] md:text-sm italic">{a.performance.meet}회</p></div>
                  <div className="text-center"><p className="text-[8px] md:text-[9px] text-slate-400">제안</p><p className="text-[11px] md:text-sm italic">{a.performance.pt}회</p></div>
                  <div className="text-center"><p className="text-[8px] md:text-[9px] text-slate-400">소개</p><p className="text-[11px] md:text-sm italic">{a.performance.intro}회</p></div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 팝업 및 모달 모듈 */}
      {activeTab && <AdminPopups type={activeTab} agents={agents} selectedAgent={selectedAgent} teamMeta={teamMeta} onClose={() => { setActiveTab(null); setSelectedAgent(null); fetchTeamData(); }} />}
      {isCalcOpen && <CalcModal onClose={() => setIsCalcOpen(false)} />}
    </div>
  )
}

function TotalBox({ label, val, sub }: any) {
  return (
    <div className="bg-black p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] text-center font-black">
      <p className="text-[#d4af37] text-[8px] md:text-[10px] uppercase mb-1">{label}</p>
      <p className="text-white text-lg md:text-xl italic">{val}건</p>
      {sub && <p className="text-[#d4af37] text-[8px] md:text-[9px] mt-1 opacity-80">{sub}</p>}
    </div>
  )
}