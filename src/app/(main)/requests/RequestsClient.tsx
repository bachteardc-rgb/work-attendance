"use client";

import { useState } from "react";

export default function RequestsClient() {
  const [activeTab, setActiveTab] = useState<"LEAVE" | "OVERTIME" | "ADJUSTMENT">("LEAVE");
  const [requestedTimePreset, setRequestedTimePreset] = useState("08:30 - 17:30");
  const [customTime, setCustomTime] = useState("");

  const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px", boxSizing: "border-box" as const };
  const labelStyle = { display: "block", marginBottom: "6px", fontSize: "14px", color: "#374151", fontWeight: "600" as const };
  const btnStyle = { padding: "12px", backgroundColor: "#2563eb", color: "#ffffff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" as const, width: "100%", marginTop: "15px", fontSize: "15px" };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const payload = {
      type: fd.get("type"),
      startDate: fd.get("startDate"),
      endDate: fd.get("endDate"),
      daysUsed: parseFloat(fd.get("daysUsed") as string || "1"),
      reason: fd.get("reason"),
    };

    try {
      const res = await fetch("/api/leaves", { method: "POST", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } });
      if (res.ok) { alert("휴가 신청이 완료되었습니다."); window.location.href="/dashboard"; }
      else alert("신청 중 오류가 발생했습니다.");
    } catch (e) { alert("오류가 발생했습니다."); }
  };

  const handleOvertimeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const payload = {
      date: fd.get("date"),
      startTime: fd.get("startTime"),
      endTime: fd.get("endTime"),
      description: fd.get("description"),
    };

    try {
      const res = await fetch("/api/overtime", { method: "POST", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } });
      if (res.ok) { alert("시간외근무 신청이 완료되었습니다."); window.location.href="/dashboard"; }
      else alert("신청 중 오류가 발생했습니다.");
    } catch (e) { alert("오류가 발생했습니다."); }
  };

  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const finalRequestedTime = requestedTimePreset === "CUSTOM" ? customTime : requestedTimePreset;

    if (!finalRequestedTime) {
      alert("변경 희망 근무시간을 선택하거나 입력해 주세요.");
      return;
    }

    const payload = {
      applyDate: fd.get("applyDate"),
      originalTime: fd.get("originalTime"),
      requestedTime: finalRequestedTime,
      reason: fd.get("reason"),
    };

    try {
      const res = await fetch("/api/adjustments", { method: "POST", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } });
      if (res.ok) { alert("근무시간 조정 신청이 완료되었습니다."); window.location.href="/dashboard"; }
      else alert("신청 중 오류가 발생했습니다.");
    } catch (e) { alert("오류가 발생했습니다."); }
  };

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", marginBottom: "20px" }}>근태 신청</h1>

      {/* 탭 네비게이션 */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", backgroundColor: "#f1f5f9", padding: "6px", borderRadius: "8px" }}>
        <button
          type="button"
          onClick={() => setActiveTab("LEAVE")}
          style={{ flex: 1, padding: "10px 14px", backgroundColor: activeTab === "LEAVE" ? "#ffffff" : "transparent", color: activeTab === "LEAVE" ? "#1e293b" : "#64748b", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "14px", boxShadow: activeTab === "LEAVE" ? "0 1px 3px rgba(0,0,0,0.1)" : "none", transition: "all 0.2s" }}
        >
          휴가 신청
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("OVERTIME")}
          style={{ flex: 1, padding: "10px 14px", backgroundColor: activeTab === "OVERTIME" ? "#ffffff" : "transparent", color: activeTab === "OVERTIME" ? "#1e293b" : "#64748b", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "14px", boxShadow: activeTab === "OVERTIME" ? "0 1px 3px rgba(0,0,0,0.1)" : "none", transition: "all 0.2s" }}
        >
          시간외근무 신청
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("ADJUSTMENT")}
          style={{ flex: 1, padding: "10px 14px", backgroundColor: activeTab === "ADJUSTMENT" ? "#ffffff" : "transparent", color: activeTab === "ADJUSTMENT" ? "#1e293b" : "#64748b", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "14px", boxShadow: activeTab === "ADJUSTMENT" ? "0 1px 3px rgba(0,0,0,0.1)" : "none", transition: "all 0.2s" }}
        >
          근무시간 조정 신청
        </button>
      </div>

      <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "28px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        {/* 1. 휴가 신청 폼 */}
        {activeTab === "LEAVE" && (
          <form onSubmit={handleLeaveSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div>
              <label style={labelStyle}>휴가 구분 선택</label>
              <select name="type" style={inputStyle} required defaultValue="ANNUAL">
                <option value="ANNUAL">연차 (1일)</option>
                <option value="HALF_AM">오전 반차 (0.5일)</option>
                <option value="HALF_PM">오후 반차 (0.5일)</option>
                <option value="SICK">병가</option>
                <option value="OFFICIAL">공가</option>
                <option value="FAMILY_CARE">가족돌봄휴가</option>
                <option value="COMPENSATORY">대체휴가</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: "15px" }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>시작일</label>
                <input name="startDate" type="date" style={inputStyle} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>종료일</label>
                <input name="endDate" type="date" style={inputStyle} required />
              </div>
            </div>
            <div>
              <label style={labelStyle}>사용 일수 (일)</label>
              <input name="daysUsed" type="number" step="0.5" defaultValue="1" style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>신청 사유</label>
              <textarea name="reason" rows={3} style={inputStyle} placeholder="사유를 기재해 주세요."></textarea>
            </div>
            <button type="submit" style={btnStyle}>휴가 신청 제출</button>
          </form>
        )}

        {/* 2. 시간외근무 신청 폼 */}
        {activeTab === "OVERTIME" && (
          <form onSubmit={handleOvertimeSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div>
              <label style={labelStyle}>근무일</label>
              <input name="date" type="date" style={inputStyle} required />
            </div>
            <div style={{ display: "flex", gap: "15px" }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>시작 시간</label>
                <input name="startTime" type="time" style={inputStyle} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>종료 시간</label>
                <input name="endTime" type="time" style={inputStyle} required />
              </div>
            </div>
            <div>
              <label style={labelStyle}>상세 업무 내용 및 사유</label>
              <textarea name="description" rows={3} style={inputStyle} placeholder="야근 사유 및 연장 근무 내용을 상세히 적어주세요." required></textarea>
            </div>
            <button type="submit" style={btnStyle}>시간외근무 신청 제출</button>
          </form>
        )}

        {/* 3. 근무시간 조정 신청 폼 */}
        {activeTab === "ADJUSTMENT" && (
          <form onSubmit={handleAdjustmentSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div>
              <label style={labelStyle}>적용 희망일자</label>
              <input name="applyDate" type="date" style={inputStyle} required />
            </div>

            <div>
              <label style={labelStyle}>현재 설정된 기본 근무시간</label>
              <input name="originalTime" type="text" defaultValue="09:00 - 18:00" style={inputStyle} required />
            </div>

            <div>
              <label style={labelStyle}>변경 희망 근무시간 선택</label>
              <select
                value={requestedTimePreset}
                onChange={(e) => setRequestedTimePreset(e.target.value)}
                style={inputStyle}
              >
                <option value="08:30 - 17:30">08:30 - 17:30 (8:30 출근 - 5:30 퇴근)</option>
                <option value="09:00 - 18:00">09:00 - 18:00 (9:00 출근 - 6:00 퇴근)</option>
                <option value="09:00 - 18:30">09:00 - 18:30 (9:00 출근 - 6:30 퇴근)</option>
                <option value="09:30 - 18:30">09:30 - 18:30 (9:30 출근 - 6:30 퇴근)</option>
                <option value="직접시간입력">직접 시간 입력</option>
              </select>
            </div>

            {requestedTimePreset === "직접시간입력" && (
              <div>
                <label style={labelStyle}>직접 입력 시간 (예: 10:00 - 19:00)</label>
                <input
                  type="text"
                  placeholder="예: 10:00 - 19:00"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
            )}

            <div>
              <label style={labelStyle}>조정 사유</label>
              <textarea name="reason" rows={3} style={inputStyle} placeholder="시차출퇴근제 또는 사유를 기재해 주세요."></textarea>
            </div>

            <button type="submit" style={btnStyle}>근무시간 조정 신청 제출</button>
          </form>
        )}
      </div>
    </div>
  );
}
