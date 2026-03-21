"use client"

import React, { useState } from 'react';
import * as XLSX from 'xlsx';

export default function CustomerManagerModal({ onClose, onSaveToGoogle }: any) {
  const [data, setData] = useState<any[]>([]);
  const [fileName, setFileName] = useState("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt: any) => {
      try {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        let allCustomers: any[] = [];

        workbook.SheetNames.forEach(sheetName => {
          const yearMatch = sheetName.match(/\d{4}/);
          const sheetYear = yearMatch ? yearMatch[0] : new Date().getFullYear().toString();
          const worksheet = workbook.Sheets[sheetName];
          const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

          jsonData.forEach((row: any) => {
            const name = row['성함'] || row['이름'];
            // 헤더나 빈 줄 제외
            if (name && name !== "성함" && name !== "이름") {
              let rawDate = String(row['계약일자'] || "");
              // "7월23일" -> "07-23" 형태로 변환 시도
              let cleanDate = rawDate.replace('월', '-').replace('일', '').replace(/\s/g, '');
              let formattedDate = `${sheetYear}-${cleanDate}`;

              allCustomers.push({
                name: name,
                phone: row['연락처'] || "",
                birth: row['생년월일'] || "",
                contract_date: formattedDate,
                insurance_co: row['보험사'] || "",
                premium: row['월납'] || 0,
                source_sheet: sheetName
              });
            }
          });
        });

        if (allCustomers.length === 0) {
          alert("엑셀에서 데이터를 찾지 못했습니다. 컬럼명(성함, 연락처 등)을 확인해주세요.");
        }
        setData(allCustomers);
      } catch (err) {
        console.error("파일 읽기 오류:", err);
        alert("파일을 읽는 중 오류가 발생했습니다.");
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 font-black">
      <div className="bg-white w-full max-w-4xl rounded-[3rem] border-4 border-black overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* 상단바 */}
        <div className="p-6 border-b-4 border-black flex justify-between items-center bg-[#f8f9fa]">
          <h2 className="text-2xl italic uppercase font-black text-black">Excel Data Sync</h2>
          <button onClick={onClose} className="text-sm bg-black text-white px-6 py-2 rounded-full hover:bg-slate-800">CLOSE</button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 space-y-6">
          {/* 클릭 영역 보정: label을 사용하여 어디를 눌러도 작동하게 함 */}
          <label className="relative block border-4 border-dashed border-slate-200 rounded-[2rem] p-16 text-center hover:bg-slate-50 transition-all cursor-pointer group">
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={handleFileUpload} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
            />
            <div className="space-y-4">
              <div className="text-6xl group-hover:scale-110 transition-transform">📁</div>
              <div>
                <p className="text-xl text-black font-black">
                  {fileName ? fileName : "여기를 눌러서 엑셀 파일을 선택하세요"}
                </p>
                <p className="text-sm text-slate-400 mt-2 italic font-black">드래그 앤 드롭 또는 클릭</p>
              </div>
              {data.length > 0 && (
                <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full inline-block font-black">
                  ✅ {data.length}명의 데이터를 불러왔습니다!
                </div>
              )}
            </div>
          </label>

          {/* 데이터 미리보기 테이블 */}
          {data.length > 0 && (
            <div className="border-2 border-black rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-[13px] border-collapse">
                <thead className="bg-slate-900 text-white font-black">
                  <tr>
                    <th className="p-3">성함</th>
                    <th className="p-3">연락처</th>
                    <th className="p-3">계약일</th>
                    <th className="p-3">생년월일</th>
                    <th className="p-3">시트탭</th>
                  </tr>
                </thead>
                <tbody className="text-black">
                  {data.slice(0, 10).map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-black text-blue-600">{item.name}</td>
                      <td className="p-3">{item.phone}</td>
                      <td className="p-3 italic">{item.contract_date}</td>
                      <td className="p-3">{item.birth}</td>
                      <td className="p-3 text-slate-400 font-black">{item.source_sheet}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.length > 10 && (
                <div className="p-3 bg-slate-50 text-center text-slate-400 italic text-[12px] border-t border-black/10">
                  ...외 {data.length - 10}명의 데이터가 더 있습니다.
                </div>
              )}
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="p-6 bg-slate-50 border-t-4 border-black">
          <button 
            onClick={() => onSaveToGoogle(data)}
            disabled={data.length === 0}
            className="w-full bg-emerald-600 text-white py-6 rounded-2xl font-black text-2xl italic shadow-[0_8px_0_0_rgba(5,150,105,1)] active:translate-y-1 active:shadow-none disabled:opacity-30 transition-all border-2 border-black uppercase"
          >
            Sync to Google Sheet
          </button>
        </div>
      </div>
    </div>
  );
}