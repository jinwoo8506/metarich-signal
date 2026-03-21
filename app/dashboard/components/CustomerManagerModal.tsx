"use client"

import React, { useState } from 'react';
import * as XLSX from 'xlsx';

export default function CustomerManagerModal({ onClose, onSaveToGoogle }: any) {
  const [data, setData] = useState<any[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const workbook = XLSX.read(bstr, { type: 'binary' });

      let allCustomers: any[] = [];

      // 1. 모든 시트(2024년, 2025년 등)를 돌면서 데이터 추출
      workbook.SheetNames.forEach(sheetName => {
        // 시트 이름에 '년'이 포함된 경우 연도 정보로 활용
        const yearMatch = sheetName.match(/\d{4}/);
        const sheetYear = yearMatch ? yearMatch[0] : new Date().getFullYear().toString();

        const worksheet = workbook.Sheets[sheetName];
        // 엑셀을 JSON으로 변환 (헤더가 2번째 줄에 있을 수 있으므로 range 조절 가능)
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        jsonData.forEach((row: any) => {
          // 엑셀 컬럼명과 매칭 (이미지 기준: 성함, 연락처, 계약일자, 생년월일)
          const name = row['성함'] || row['이름'];
          if (name && name !== "성함") { // 헤더 반복 제외
            
            // 계약일자 처리 (7월23일 -> 2024-07-23 형태)
            let rawDate = row['계약일자'] || "";
            let formattedDate = `${sheetYear}-${rawDate.replace('월', '-').replace('일', '')}`;

            allCustomers.push({
              name: name,
              phone: row['연락처'] || "",
              birth: row['생년월일'] || "",
              contract_date: formattedDate,
              insurance_co: row['보험사'] || "",
              premium: row['월납'] || 0,
              // 알람 날짜 자동 계산 (예시: 30일, 180일, 365일 뒤)
              d30: calculateAlertDate(formattedDate, 30),
              d365: calculateAlertDate(formattedDate, 365),
              source_sheet: sheetName // 어느 탭에서 가져왔는지 기록
            });
          }
        });
      });

      setData(allCustomers);
    };
    reader.readAsBinaryString(file);
  };

  // 날짜 계산 함수
  const calculateAlertDate = (baseDate: string, days: number) => {
    const date = new Date(baseDate);
    if (isNaN(date.getTime())) return "";
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 font-black">
      <div className="bg-white w-full max-w-4xl rounded-[3rem] border-4 border-black overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b-4 border-black flex justify-between items-center bg-[#f8f9fa]">
          <h2 className="text-2xl italic uppercase font-black">Excel Data Sync</h2>
          <button onClick={onClose} className="text-sm bg-black text-white px-4 py-2 rounded-full">CLOSE</button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 space-y-6">
          <div className="border-4 border-dashed border-slate-200 rounded-[2rem] p-10 text-center hover:bg-slate-50 transition-colors relative">
            <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
            <p className="text-slate-400 font-black">클릭하여 고객관리 대장(Excel) 파일을 업로드하세요</p>
            {data.length > 0 && <p className="mt-2 text-emerald-600 font-black">{data.length}명의 데이터를 읽어왔습니다!</p>}
          </div>

          {data.length > 0 && (
            <div className="border-2 border-black rounded-2xl overflow-hidden">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-slate-100 border-b-2 border-black">
                  <tr>
                    <th className="p-3">성함</th>
                    <th className="p-3">연락처</th>
                    <th className="p-3">계약일</th>
                    <th className="p-3">생년월일</th>
                    <th className="p-3">시트탭</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 10).map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="p-3 font-black">{item.name}</td>
                      <td className="p-3">{item.phone}</td>
                      <td className="p-3">{item.contract_date}</td>
                      <td className="p-3">{item.birth}</td>
                      <td className="p-3 text-blue-600">{item.source_sheet}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.length > 10 && <p className="p-3 text-center text-slate-400 italic">외 {data.length - 10}명 더 있음...</p>}
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t-4 border-black">
          <button 
            onClick={() => onSaveToGoogle(data)}
            disabled={data.length === 0}
            className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-xl italic shadow-lg hover:bg-emerald-700 disabled:opacity-30 transition-all"
          >
            SYNC TO GOOGLE SHEET
          </button>
        </div>
      </div>
    </div>
  );
}