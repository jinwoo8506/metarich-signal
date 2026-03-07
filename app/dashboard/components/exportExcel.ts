import * as XLSX from 'xlsx-js-style';

export const exportExcel = ({ agents, teamMeta, totalActivity, monthKey }: any) => {
  const wb = XLSX.utils.book_new();

  // --- [시트 1: 📊 팀 전체 현황] ---
  const teamRows = [
    ["", "", "", "", "", "", "", "", ""],
    ["", "🏆  영업팀 실적 현황 리포트", "", "", "", "", "", "", ""],
    ["", "※ 본 리포트는 팀 전체 목표 대비 실적 현황을 요약합니다.", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", ""],
    ["", "▌ 팀 핵심 KPI", "", "", "", "", "", "", ""],
    ["", "목표 금액", "", "실적 금액", "", "목표 건수", "", "실적 건수", "금액 달성률"],
    ["", 
      `${teamMeta.targetAmt.toLocaleString()}만원`, "", 
      `${(agents.reduce((acc: any, curr: any) => acc + Number(curr.performance.contract_amt || 0), 0)).toLocaleString()}만원`, "", 
      `${teamMeta.targetCnt}건`, "", 
      `${agents.reduce((acc: any, curr: any) => acc + Number(curr.performance.contract_cnt || 0), 0)}건`, 
      ((agents.reduce((acc: any, curr: any) => acc + Number(curr.performance.contract_amt || 0), 0) / teamMeta.targetAmt)).toFixed(3)
    ],
    ["", "", "", "", "", "", "", "", ""],
    ["", "▌ 팀원별 목표 vs 실적 현황", "", "", "", "", "", "", ""],
    ["", "이름", "목표금액(만)", "실적금액(만)", "금액달성률", "목표건수", "실적건수", "건수달성률", "초과/미달(만)"]
  ];

  // 팀원 리스트 데이터 추가
  agents.forEach((a: any) => {
    const tAmt = Number(a.performance.target_amt || 0);
    const cAmt = Number(a.performance.contract_amt || 0);
    const tCnt = Number(a.performance.target_cnt || 0);
    const cCnt = Number(a.performance.contract_cnt || 0);
    teamRows.push([
      "", a.name, tAmt, cAmt, (cAmt/tAmt).toFixed(2), tCnt, cCnt, (cCnt/tCnt).toFixed(2), cAmt - tAmt
    ]);
  });

  const ws1 = XLSX.utils.aoa_to_sheet(teamRows);
  
  // 스타일 및 컬럼 너비 설정
  ws1["!cols"] = [{ wch: 3 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws1, "📊 팀 전체 현황");

  // --- [시트 2: 👤 개인별 상세 현황] ---
  const detailRows = [
    ["", "", "", "", "", "", "", ""],
    ["", "👤  팀원별 개인 실적 상세 리포트", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""]
  ];

  agents.forEach((a: any) => {
    const p = a.performance;
    const actTotal = Number(p.call||0) + Number(p.meet||0) + Number(p.pt||0) + Number(p.intro||0);

    detailRows.push(["", `◆  ${a.name}  |  영업사원 개인 현황`, "", "", "", "", "", ""]);
    detailRows.push(["", "구분", "", "금액 (만원)", "", "건수", "", ""]);
    detailRows.push(["", "목표", "", p.target_amt, "", p.target_cnt, "", ""]);
    detailRows.push(["", "실적", "", p.contract_amt, "", p.contract_cnt, "", ""]);
    detailRows.push(["", "달성률", "", (p.contract_amt/p.target_amt).toFixed(3), "", (p.contract_cnt/p.target_cnt).toFixed(3), "", ""]);
    detailRows.push(["", "", "", "", "", "", "", ""]);
    detailRows.push(["", "전화", "만남", "제안", "소개", "DB배정", "반품", "활동합계"]);
    detailRows.push(["", p.call, p.meet, p.pt, p.intro, p.db_assigned, p.db_returned, actTotal]);
    detailRows.push(["", "", "", "", "", "", "", ""]);
    detailRows.push(["", "", "", "", "", "", "", ""]); // 구분선용 공백
  });

  const ws2 = XLSX.utils.aoa_to_sheet(detailRows);
  ws2["!cols"] = [{ wch: 3 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws2, "👤 개인별 상세 현황");

  XLSX.writeFile(wb, `Sales_Report_${monthKey}.xlsx`);
};