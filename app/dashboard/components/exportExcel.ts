import * as XLSX from 'xlsx-js-style';

export const exportExcel = ({ agents, teamMeta, totalActivity, monthKey }: any) => {
  const wb = XLSX.utils.book_new();

  // 1. 팀 전체 요약 (📊 팀 전체 현황 스타일)
  const summaryRows = [
    ["🏆 영업팀 실적 현황 리포트"],
    [""],
    ["▌ 팀 핵심 KPI"],
    ["목표 금액(만)", "실적 금액(만)", "목표 건수", "실적 건수"],
    [teamMeta.targetAmt, totalActivity.contract_amt || 0, teamMeta.targetCnt, totalActivity.contract_cnt || 0],
    [""],
    ["▌ 팀 전체 활동 합계"],
    ["전체 전화", "전체 만남", "전체 제안", "전체 소개"],
    [totalActivity.call, totalActivity.meet, totalActivity.pt, totalActivity.intro]
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
  
  // 스타일 적용 (제목 및 헤더 강조)
  ws1["!cols"] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  ws1["A1"].s = { font: { bold: true, sz: 14 } }; // 제목
  ws1["A3"].s = { font: { bold: true }, fill: { fgColor: { rgb: "EFEFEF" } } }; // 섹션 제목

  XLSX.utils.book_append_sheet(wb, ws1, "팀 전체 현황");

  // 2. 직원별 상세 현황 (👤 개인별 상세 현황 스타일)
  const detailRows = [["👤 팀원별 개인 실적 상세 리포트"], [""]];
  
  agents.forEach((a: any) => {
    detailRows.push([`◆ ${a.name} | 영업사원 개인 현황`]);
    detailRows.push(["구분", "목표", "실적", "건수"]);
    detailRows.push(["금액(만)", a.performance.target_amt, a.performance.contract_amt, ""]);
    detailRows.push(["전화", a.performance.call, "만남", a.performance.meet]);
    detailRows.push(["제안", a.performance.pt, "소개", a.performance.intro]);
    detailRows.push([""]); // 구분 공백
  });

  const ws2 = XLSX.utils.aoa_to_sheet(detailRows);
  ws2["!cols"] = [{ wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
  
  XLSX.utils.book_append_sheet(wb, ws2, "개인별 상세 현황");

  XLSX.writeFile(wb, `Sales_Report_${monthKey}.xlsx`);
};