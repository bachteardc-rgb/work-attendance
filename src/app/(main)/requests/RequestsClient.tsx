"use client";

import { useState, useEffect, useCallback } from "react";

type TabKey =
  | "LEAVE"
  | "OVERTIME"
  | "ADJUSTMENT"
  | "EDUCATION"
  | "EDU_RESULT"
  | "TRIP"
  | "TRIP_RESULT";

const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px", boxSizing: "border-box" as const };
const labelStyle = { display: "block", marginBottom: "6px", fontSize: "14px", color: "#374151", fontWeight: "600" as const };
const btnStyle = { padding: "12px", backgroundColor: "#2563eb", color: "#ffffff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" as const, width: "100%", marginTop: "15px", fontSize: "15px" };

const statusBadge = (status: string) => ({
  padding: "3px 9px",
  borderRadius: "9999px",
  fontSize: "12px",
  fontWeight: "600" as const,
  backgroundColor: status === "APPROVED" ? "#dcfce7" : status === "REJECTED" ? "#fee2e2" : "#fef3c7",
  color: status === "APPROVED" ? "#166534" : status === "REJECTED" ? "#991b1b" : "#92400e",
});

const fmtDate = (d: string) => new Date(d).toISOString().split("T")[0];

/**
 * 교육결과 / 출장결과 제출 패널.
 * 승인된 신청 건을 나열하고, 각 건에 대해 결과 보고를 작성/수정할 수 있습니다.
 */
function ResultSection({
  endpoint,
  title,
  emptyLabel,
  placeholder,
  renderHeading,
  renderMeta,
}: {
  endpoint: "educations" | "trips";
  title: string;
  emptyLabel: string;
  placeholder: string;
  renderHeading: (item: any) => string;
  renderMeta: (item: any) => string;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  // effect 안에서 동기적으로 setState 하지 않도록, 최초 로딩은 초기값(true)에 맡깁니다.
  // isCancelled: 언마운트/탭 전환 후 뒤늦게 도착한 응답은 버립니다.
  const load = useCallback(async (isCancelled: () => boolean = () => false) => {
    try {
      const res = await fetch(`/api/${endpoint}`);
      if (!res.ok) throw new Error("불러오기 실패");
      const data = await res.json();
      if (isCancelled()) return;
      // 결과는 승인된 신청 건에 대해서만 제출할 수 있습니다.
      const approved = data.filter((i: any) => i.status === "APPROVED");
      setItems(approved);
      const initial: Record<string, string> = {};
      approved.forEach((i: any) => {
        initial[i.id] = i.resultContent || "";
      });
      setDrafts(initial);
    } catch (e) {
      if (!isCancelled()) alert("목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      if (!isCancelled()) setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    let cancelled = false;
    load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [load]);

  const handleSubmit = async (id: string) => {
    const content = (drafts[id] || "").trim();
    if (!content) {
      alert("결과 내용을 입력해 주세요.");
      return;
    }
    setSaving(id);
    try {
      const res = await fetch(`/api/${endpoint}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultContent: content }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "제출 실패");
      }
      alert("결과가 제출되었습니다.");
      await load();
    } catch (e: any) {
      alert(e.message || "제출 중 오류가 발생했습니다.");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <div style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>불러오는 중...</div>;
  }

  return (
    <div>
      <h2 style={{ fontSize: "17px", fontWeight: "700", color: "#0f172a", marginBottom: "6px" }}>{title}</h2>
      <p style={{ fontSize: "13px", color: "#64748b", marginTop: 0, marginBottom: "18px" }}>
        승인된 건에 대해서만 결과를 제출할 수 있습니다. 이미 제출한 결과도 다시 수정할 수 있습니다.
      </p>

      {items.length === 0 ? (
        <div style={{ padding: "30px", textAlign: "center", color: "#64748b", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
          {emptyLabel}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {items.map((item) => (
            <div key={item.id} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "18px", backgroundColor: "#f8fafc" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "4px" }}>
                <div style={{ fontWeight: "700", fontSize: "15px", color: "#1e293b" }}>{renderHeading(item)}</div>
                {item.resultSubmittedAt ? (
                  <span style={{ ...statusBadge("APPROVED"), whiteSpace: "nowrap" }}>제출 완료</span>
                ) : (
                  <span style={{ ...statusBadge("PENDING"), whiteSpace: "nowrap" }}>결과 미제출</span>
                )}
              </div>
              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>{renderMeta(item)}</div>

              <textarea
                rows={4}
                value={drafts[item.id] ?? ""}
                onChange={(e) => setDrafts({ ...drafts, [item.id]: e.target.value })}
                placeholder={placeholder}
                style={{ ...inputStyle, backgroundColor: "#ffffff", resize: "vertical" }}
              />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", gap: "12px" }}>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                  {item.resultSubmittedAt
                    ? `최종 제출: ${new Date(item.resultSubmittedAt).toLocaleString()}`
                    : "아직 제출되지 않았습니다."}
                </span>
                <button
                  type="button"
                  onClick={() => handleSubmit(item.id)}
                  disabled={saving === item.id}
                  style={{
                    padding: "9px 18px",
                    backgroundColor: saving === item.id ? "#94a3b8" : "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: saving === item.id ? "not-allowed" : "pointer",
                    fontWeight: "600",
                    fontSize: "14px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {saving === item.id ? "제출 중..." : item.resultSubmittedAt ? "결과 수정" : "결과 제출"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RequestsClient() {
  const [activeTab, setActiveTab] = useState<TabKey>("LEAVE");
  const [requestedTimePreset, setRequestedTimePreset] = useState("08:30 - 17:30");
  const [customTime, setCustomTime] = useState("");

  // 시간외근무: 선택한 근무일이 속한 달의 부여/사용/잔여 현황
  const [otDate, setOtDate] = useState("");
  const [otStart, setOtStart] = useState("");
  const [otEnd, setOtEnd] = useState("");
  const [otSummary, setOtSummary] = useState<any | null>(null);

  // 근무일이 정해지면 그 달의 시간외근무 한도를 조회합니다.
  useEffect(() => {
    if (!otDate) {
      setOtSummary(null);
      return;
    }
    const d = new Date(otDate);
    if (Number.isNaN(d.getTime())) return;
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/overtime/summary?year=${y}&month=${m}`);
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (!cancelled) setOtSummary(json);
      } catch {
        if (!cancelled) setOtSummary(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [otDate]);

  // "HH:MM" 두 개로 근무 시간을 계산합니다 (서버 계산과 동일한 규칙).
  const requestedOtHours = (() => {
    if (!otStart || !otEnd) return 0;
    const [sh, sm] = otStart.split(":").map(Number);
    const [eh, em] = otEnd.split(":").map(Number);
    if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
    let h = eh + em / 60 - (sh + sm / 60);
    if (h < 0) h += 24; // 자정을 넘긴 야간 근무
    return parseFloat(h.toFixed(2));
  })();

  const TABS: { key: TabKey; label: string }[] = [
    { key: "LEAVE", label: "휴가 신청" },
    { key: "OVERTIME", label: "시간외근무" },
    { key: "ADJUSTMENT", label: "근무시간 조정" },
    { key: "EDUCATION", label: "교육 신청" },
    { key: "EDU_RESULT", label: "교육 결과" },
    { key: "TRIP", label: "출장 신청" },
    { key: "TRIP_RESULT", label: "출장 결과" },
  ];

  const postJson = async (url: string, payload: any, successMsg: string) => {
    try {
      const res = await fetch(url, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        alert(successMsg);
        window.location.href = "/dashboard";
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "신청 중 오류가 발생했습니다.");
      }
    } catch (e) {
      alert("오류가 발생했습니다.");
    }
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    await postJson(
      "/api/leaves",
      {
        type: fd.get("type"),
        startDate: fd.get("startDate"),
        endDate: fd.get("endDate"),
        daysUsed: parseFloat((fd.get("daysUsed") as string) || "1"),
        reason: fd.get("reason"),
      },
      "휴가 신청이 완료되었습니다."
    );
  };

  const handleOvertimeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);

    // 월 부여시간이 설정된 경우, 잔여를 넘기면 신청 전에 알려 줍니다.
    if (otSummary?.hasQuota && requestedOtHours > 0) {
      const remain = otSummary.remainingHours;
      const after = otSummary.usedHours + requestedOtHours;
      if (remain <= 0) {
        const ok = window.confirm(
          `${otSummary.month}월 시간외근무 한도를 이미 초과했습니다.\n` +
            `월 부여 ${otSummary.monthlyHours}시간 / 사용 ${otSummary.usedHours}시간 (${Math.abs(remain).toFixed(1)}시간 초과)\n\n` +
            `이 신청(${requestedOtHours}시간)을 계속 진행할까요?`
        );
        if (!ok) return;
      } else if (requestedOtHours > remain) {
        const ok = window.confirm(
          `${otSummary.month}월 시간외근무 잔여는 ${remain.toFixed(1)}시간입니다.\n` +
            `월 부여 ${otSummary.monthlyHours}시간 / 사용 ${otSummary.usedHours}시간\n\n` +
            `이번 신청 ${requestedOtHours}시간을 더하면 ${after.toFixed(1)}시간이 되어 ` +
            `${(after - otSummary.monthlyHours).toFixed(1)}시간 초과합니다.\n계속 진행할까요?`
        );
        if (!ok) return;
      }
    }

    await postJson(
      "/api/overtime",
      {
        date: fd.get("date"),
        startTime: fd.get("startTime"),
        endTime: fd.get("endTime"),
        description: fd.get("description"),
      },
      "시간외근무 신청이 완료되었습니다."
    );
  };

  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const finalRequestedTime = requestedTimePreset === "직접시간입력" ? customTime : requestedTimePreset;

    if (!finalRequestedTime) {
      alert("변경 희망 근무시간을 선택하거나 입력해 주세요.");
      return;
    }

    await postJson(
      "/api/adjustments",
      {
        applyDate: fd.get("applyDate"),
        originalTime: fd.get("originalTime"),
        requestedTime: finalRequestedTime,
        reason: fd.get("reason"),
      },
      "근무시간 조정 신청이 완료되었습니다."
    );
  };

  const handleEducationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    await postJson(
      "/api/educations",
      {
        title: fd.get("title"),
        institution: fd.get("institution"),
        startDate: fd.get("startDate"),
        endDate: fd.get("endDate"),
        cost: fd.get("cost"),
        purpose: fd.get("purpose"),
      },
      "교육 신청이 완료되었습니다."
    );
  };

  const handleTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    await postJson(
      "/api/trips",
      {
        destination: fd.get("destination"),
        purpose: fd.get("purpose"),
        startDate: fd.get("startDate"),
        endDate: fd.get("endDate"),
        companions: fd.get("companions"),
        cost: fd.get("cost"),
      },
      "출장 신청이 완료되었습니다."
    );
  };

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", marginBottom: "20px" }}>근태 신청</h1>

      {/* 탭 네비게이션 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "24px", backgroundColor: "#f1f5f9", padding: "6px", borderRadius: "8px" }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: "1 1 auto",
              padding: "10px 12px",
              backgroundColor: activeTab === tab.key ? "#ffffff" : "transparent",
              color: activeTab === tab.key ? "#1e293b" : "#64748b",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "13px",
              whiteSpace: "nowrap",
              boxShadow: activeTab === tab.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
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
              <input
                name="date"
                type="date"
                style={inputStyle}
                required
                value={otDate}
                onChange={(e) => setOtDate(e.target.value)}
              />
            </div>

            {/* 선택한 달의 시간외근무 한도 현황 */}
            {otSummary && (
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "8px",
                  border: `1px solid ${!otSummary.hasQuota ? "#e2e8f0" : otSummary.remainingHours < 0 ? "#fecaca" : "#bfdbfe"}`,
                  backgroundColor: !otSummary.hasQuota ? "#f8fafc" : otSummary.remainingHours < 0 ? "#fef2f2" : "#eff6ff",
                }}
              >
                {!otSummary.hasQuota ? (
                  <div style={{ fontSize: "13px", color: "#64748b" }}>
                    {otSummary.year}년 {otSummary.month}월 시간외근무 부여시간이 아직 설정되지 않았습니다.
                    <span style={{ color: "#94a3b8" }}> (관리자 문의)</span>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: "13px", color: "#334155", fontWeight: "600", marginBottom: "4px" }}>
                      {otSummary.year}년 {otSummary.month}월 시간외근무 현황
                    </div>
                    <div style={{ fontSize: "14px", color: "#1e293b" }}>
                      총 <strong>{otSummary.monthlyHours}</strong>시간 중{" "}
                      <strong style={{ color: "#d97706" }}>{otSummary.usedHours.toFixed(1)}</strong>시간 사용 ·{" "}
                      {otSummary.remainingHours < 0 ? (
                        <strong style={{ color: "#dc2626" }}>
                          {Math.abs(otSummary.remainingHours).toFixed(1)}시간 초과
                        </strong>
                      ) : (
                        <>
                          잔여 <strong style={{ color: "#16a34a" }}>{otSummary.remainingHours.toFixed(1)}</strong>시간
                        </>
                      )}
                    </div>
                    {otSummary.pendingHours > 0 && (
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                        결재 대기 중 {otSummary.pendingHours.toFixed(1)}시간은 사용시간에 포함되지 않았습니다.
                      </div>
                    )}
                    {requestedOtHours > 0 && (
                      <div
                        style={{
                          fontSize: "13px",
                          marginTop: "8px",
                          paddingTop: "8px",
                          borderTop: "1px dashed #cbd5e1",
                          fontWeight: "700",
                          color:
                            otSummary.usedHours + requestedOtHours > otSummary.monthlyHours ? "#dc2626" : "#16a34a",
                        }}
                      >
                        이번 신청 {requestedOtHours}시간 반영 시{" "}
                        {otSummary.usedHours + requestedOtHours > otSummary.monthlyHours
                          ? `${(otSummary.usedHours + requestedOtHours - otSummary.monthlyHours).toFixed(1)}시간 초과`
                          : `잔여 ${(otSummary.monthlyHours - otSummary.usedHours - requestedOtHours).toFixed(1)}시간`}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: "15px" }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>시작 시간</label>
                <input
                  name="startTime"
                  type="time"
                  style={inputStyle}
                  required
                  value={otStart}
                  onChange={(e) => setOtStart(e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>종료 시간</label>
                <input
                  name="endTime"
                  type="time"
                  style={inputStyle}
                  required
                  value={otEnd}
                  onChange={(e) => setOtEnd(e.target.value)}
                />
              </div>
            </div>
            {requestedOtHours > 0 && (
              <div style={{ fontSize: "13px", color: "#64748b", marginTop: "-8px" }}>
                신청 시간: <strong style={{ color: "#1e293b" }}>{requestedOtHours}시간</strong>
              </div>
            )}
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

        {/* 4. 교육 신청 폼 */}
        {activeTab === "EDUCATION" && (
          <form onSubmit={handleEducationSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div>
              <label style={labelStyle}>교육명</label>
              <input name="title" type="text" style={inputStyle} placeholder="예: 정보보호 담당자 실무 과정" required />
            </div>
            <div>
              <label style={labelStyle}>교육기관</label>
              <input name="institution" type="text" style={inputStyle} placeholder="예: 한국생산성본부" />
            </div>
            <div style={{ display: "flex", gap: "15px" }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>교육 시작일</label>
                <input name="startDate" type="date" style={inputStyle} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>교육 종료일</label>
                <input name="endDate" type="date" style={inputStyle} required />
              </div>
            </div>
            <div>
              <label style={labelStyle}>교육비 (원)</label>
              <input name="cost" type="number" step="1000" min="0" defaultValue="0" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>교육 목적 및 신청 사유</label>
              <textarea name="purpose" rows={3} style={inputStyle} placeholder="교육 목적과 업무 연관성을 기재해 주세요."></textarea>
            </div>
            <button type="submit" style={btnStyle}>교육 신청 제출</button>
          </form>
        )}

        {/* 5. 교육 결과 제출 */}
        {activeTab === "EDU_RESULT" && (
          <ResultSection
            endpoint="educations"
            title="교육 결과 보고"
            emptyLabel="결과를 제출할 승인된 교육 신청 건이 없습니다."
            placeholder="교육 내용, 습득한 지식, 업무 적용 계획 등을 기재해 주세요."
            renderHeading={(item) => item.title}
            renderMeta={(item) =>
              `${item.institution || "기관 미기재"} · ${fmtDate(item.startDate)} ~ ${fmtDate(item.endDate)}`
            }
          />
        )}

        {/* 6. 출장 신청 폼 */}
        {activeTab === "TRIP" && (
          <form onSubmit={handleTripSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div>
              <label style={labelStyle}>출장지</label>
              <input name="destination" type="text" style={inputStyle} placeholder="예: 부산 지사" required />
            </div>
            <div style={{ display: "flex", gap: "15px" }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>출장 시작일</label>
                <input name="startDate" type="date" style={inputStyle} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>출장 종료일</label>
                <input name="endDate" type="date" style={inputStyle} required />
              </div>
            </div>
            <div>
              <label style={labelStyle}>동행자</label>
              <input name="companions" type="text" style={inputStyle} placeholder="예: 홍길동, 김철수 (없으면 비워두세요)" />
            </div>
            <div>
              <label style={labelStyle}>출장비 (원)</label>
              <input name="cost" type="number" step="1000" min="0" defaultValue="0" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>출장 목적</label>
              <textarea name="purpose" rows={3} style={inputStyle} placeholder="출장 목적과 주요 업무를 기재해 주세요."></textarea>
            </div>
            <button type="submit" style={btnStyle}>출장 신청 제출</button>
          </form>
        )}

        {/* 7. 출장 결과 제출 */}
        {activeTab === "TRIP_RESULT" && (
          <ResultSection
            endpoint="trips"
            title="출장 결과 보고"
            emptyLabel="결과를 제출할 승인된 출장 신청 건이 없습니다."
            placeholder="출장 수행 내용, 주요 협의 사항, 후속 조치 계획 등을 기재해 주세요."
            renderHeading={(item) => item.destination}
            renderMeta={(item) =>
              `${fmtDate(item.startDate)} ~ ${fmtDate(item.endDate)}${item.companions ? ` · 동행: ${item.companions}` : ""}`
            }
          />
        )}
      </div>
    </div>
  );
}
