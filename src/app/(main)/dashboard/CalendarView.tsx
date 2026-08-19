"use client";

import { useState, useEffect, useMemo } from "react";

type EventKind = "LEAVE" | "TRIP" | "EDU" | "ADJ" | "OT";

type CalEvent = {
  id: string;
  kind: EventKind;
  label: string; // 달력 칸에 표시할 짧은 라벨
  detail: string; // 상세 패널에 표시할 설명
  status: string;
  userName?: string;
  department?: string;
  dateKeys: string[]; // 이 일정이 걸쳐 있는 모든 날짜 (YYYY-MM-DD)
};

const KIND_META: Record<EventKind, { name: string; color: string; bg: string; border: string }> = {
  LEAVE: { name: "휴가", color: "#1d4ed8", bg: "#dbeafe", border: "#93c5fd" },
  TRIP: { name: "출장", color: "#6d28d9", bg: "#ede9fe", border: "#c4b5fd" },
  EDU: { name: "교육", color: "#15803d", bg: "#dcfce7", border: "#86efac" },
  ADJ: { name: "시간조정", color: "#b45309", bg: "#fef3c7", border: "#fcd34d" },
  OT: { name: "시간외근무", color: "#b91c1c", bg: "#fee2e2", border: "#fca5a5" },
};

const KIND_ORDER: EventKind[] = ["LEAVE", "TRIP", "EDU", "ADJ", "OT"];

const LEAVE_TYPE_NAMES: Record<string, string> = {
  ANNUAL: "연차",
  HALF_AM: "오전 반차",
  HALF_PM: "오후 반차",
  SICK: "병가",
  OFFICIAL: "공가",
  FAMILY_CARE: "가족돌봄휴가",
  COMPENSATORY: "대체휴가",
};

/** 저장된 날짜(UTC 자정 기준)를 YYYY-MM-DD 키로 변환합니다. */
function toKey(d: string | Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

/** 시작일~종료일 사이의 모든 날짜 키를 만듭니다. */
function rangeKeys(start: string | Date, end: string | Date): string[] {
  const s = new Date(start);
  const e = new Date(end);
  const cur = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()));
  const last = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()));
  const out: string[] = [];
  // 잘못된 데이터로 인한 무한 루프를 막기 위해 상한을 둡니다.
  let guard = 0;
  while (cur <= last && guard < 400) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
    guard += 1;
  }
  return out.length > 0 ? out : [toKey(start)];
}

const statusLabel = (s: string) => (s === "APPROVED" ? "승인" : s === "REJECTED" ? "반려" : "대기");

export default function CalendarView({ isAdmin }: { isAdmin: boolean }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1~12
  const [scope, setScope] = useState<"me" | "all">("me");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  // 응답을 조회 조건(viewKey)과 함께 보관해서, 월을 빠르게 넘길 때
  // 뒤늦게 도착한 이전 요청의 결과가 화면을 덮어쓰지 않도록 합니다.
  const [result, setResult] = useState<{ key: string; data: any | null; error: string | null } | null>(null);

  const viewKey = `${year}-${month}-${scope}`;
  const data = result?.data ?? null;
  const error = result?.key === viewKey ? result.error : null;
  // 현재 조건의 응답이 아직 없으면 로딩 상태로 봅니다 (별도 state 불필요).
  const loading = result?.key !== viewKey;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/calendar?year=${year}&month=${month}&scope=${scope}`);
        if (!res.ok) throw new Error("달력 데이터를 불러오지 못했습니다.");
        const json = await res.json();
        if (!cancelled) setResult({ key: viewKey, data: json, error: null });
      } catch (e: any) {
        if (!cancelled) setResult({ key: viewKey, data: null, error: e.message || "오류가 발생했습니다." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewKey, year, month, scope]);

  // 서버 응답을 달력이 쓰기 좋은 공통 이벤트 형태로 변환합니다.
  const events = useMemo<CalEvent[]>(() => {
    if (!data) return [];
    const out: CalEvent[] = [];

    (data.leaves || []).forEach((l: any) => {
      const typeName = LEAVE_TYPE_NAMES[l.type] || l.type;
      out.push({
        id: `leave-${l.id}`,
        kind: "LEAVE",
        label: typeName,
        detail: `${typeName} ${l.daysUsed}일 (${toKey(l.startDate)} ~ ${toKey(l.endDate)})${l.reason ? ` · 사유: ${l.reason}` : ""}`,
        status: l.status,
        userName: l.user?.name,
        department: l.user?.department,
        dateKeys: rangeKeys(l.startDate, l.endDate),
      });
    });

    (data.trips || []).forEach((t: any) => {
      out.push({
        id: `trip-${t.id}`,
        kind: "TRIP",
        label: t.destination,
        detail: `출장지: ${t.destination} (${toKey(t.startDate)} ~ ${toKey(t.endDate)})${t.purpose ? ` · 목적: ${t.purpose}` : ""}${t.companions ? ` · 동행: ${t.companions}` : ""}${t.resultSubmittedAt ? " · 결과보고 제출완료" : ""}`,
        status: t.status,
        userName: t.user?.name,
        department: t.user?.department,
        dateKeys: rangeKeys(t.startDate, t.endDate),
      });
    });

    (data.educations || []).forEach((ed: any) => {
      out.push({
        id: `edu-${ed.id}`,
        kind: "EDU",
        label: ed.title,
        detail: `${ed.title}${ed.institution ? ` (${ed.institution})` : ""} · ${toKey(ed.startDate)} ~ ${toKey(ed.endDate)}${ed.purpose ? ` · 목적: ${ed.purpose}` : ""}${ed.resultSubmittedAt ? " · 결과보고 제출완료" : ""}`,
        status: ed.status,
        userName: ed.user?.name,
        department: ed.user?.department,
        dateKeys: rangeKeys(ed.startDate, ed.endDate),
      });
    });

    (data.adjustments || []).forEach((a: any) => {
      out.push({
        id: `adj-${a.id}`,
        kind: "ADJ",
        label: a.requestedTime,
        detail: `근무시간 ${a.originalTime} → ${a.requestedTime}${a.reason ? ` · 사유: ${a.reason}` : ""}`,
        status: a.status,
        userName: a.user?.name,
        department: a.user?.department,
        dateKeys: [toKey(a.applyDate)],
      });
    });

    (data.overtimes || []).forEach((o: any) => {
      out.push({
        id: `ot-${o.id}`,
        kind: "OT",
        label: `${o.totalHours}시간`,
        detail: `시간외근무 ${o.startTime} ~ ${o.endTime} (${o.totalHours}시간)${o.description ? ` · ${o.description}` : ""}`,
        status: o.status,
        userName: o.user?.name,
        department: o.user?.department,
        dateKeys: [toKey(o.date)],
      });
    });

    return out;
  }, [data]);

  // 날짜별 이벤트 인덱스
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    events.forEach((ev) => {
      ev.dateKeys.forEach((k) => {
        if (!map[k]) map[k] = [];
        map[k].push(ev);
      });
    });
    return map;
  }, [events]);

  // 달력 그리드 (앞쪽 공백 + 해당 월의 날짜)
  const cells = useMemo(() => {
    const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const arr: (string | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      arr.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
    return arr;
  }, [year, month]);

  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const goMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setYear(y);
    setMonth(m);
    setSelectedKey(null);
  };

  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
    setSelectedKey(todayKey);
  };

  // 이번 달 종류별 집계
  const monthlyByKind = useMemo(() => {
    const map: Record<EventKind, CalEvent[]> = { LEAVE: [], TRIP: [], EDU: [], ADJ: [], OT: [] };
    events.forEach((ev) => map[ev.kind].push(ev));
    return map;
  }, [events]);

  const selectedEvents = selectedKey ? eventsByDate[selectedKey] || [] : [];

  const navBtn = {
    padding: "8px 14px",
    backgroundColor: "#ffffff",
    color: "#334155",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600" as const,
    fontSize: "14px",
  };

  return (
    <div>
      {/* 상단 컨트롤 */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button type="button" onClick={() => goMonth(-1)} style={navBtn}>◀ 이전달</button>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", minWidth: "150px", textAlign: "center" }}>
            {year}년 {month}월
          </div>
          <button type="button" onClick={() => goMonth(1)} style={navBtn}>다음달 ▶</button>
          <button type="button" onClick={goToday} style={{ ...navBtn, backgroundColor: "#2563eb", color: "#ffffff", border: "1px solid #2563eb" }}>오늘</button>
        </div>

        {isAdmin && (
          <div style={{ display: "flex", gap: "6px", backgroundColor: "#f1f5f9", padding: "4px", borderRadius: "6px" }}>
            <button
              type="button"
              onClick={() => { setScope("me"); setSelectedKey(null); }}
              style={{ padding: "7px 14px", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "600", fontSize: "13px", backgroundColor: scope === "me" ? "#ffffff" : "transparent", color: scope === "me" ? "#1e293b" : "#64748b" }}
            >
              내 일정
            </button>
            <button
              type="button"
              onClick={() => { setScope("all"); setSelectedKey(null); }}
              style={{ padding: "7px 14px", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "600", fontSize: "13px", backgroundColor: scope === "all" ? "#ffffff" : "transparent", color: scope === "all" ? "#1e293b" : "#64748b" }}
            >
              전체 직원
            </button>
          </div>
        )}
      </div>

      {/* 범례 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
        {KIND_ORDER.map((k) => (
          <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#475569" }}>
            <span style={{ width: "12px", height: "12px", borderRadius: "3px", backgroundColor: KIND_META[k].bg, border: `1px solid ${KIND_META[k].border}` }} />
            {KIND_META[k].name}
          </span>
        ))}
        <span style={{ fontSize: "12px", color: "#94a3b8" }}>· 기본 근무시간: {data?.baseSchedule || "09:00-18:00"}</span>
      </div>

      {error && (
        <div style={{ padding: "14px", backgroundColor: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: "8px", marginBottom: "14px", fontSize: "14px" }}>
          {error}
        </div>
      )}

      {/* 달력 그리드 */}
      <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", opacity: loading ? 0.55 : 1, transition: "opacity 0.15s" }}>
        {/* 요일 헤더 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
          {["일", "월", "화", "수", "목", "금", "토"].map((w, i) => (
            <div key={w} style={{ padding: "10px 0", textAlign: "center", fontSize: "13px", fontWeight: "700", color: i === 0 ? "#dc2626" : i === 6 ? "#2563eb" : "#475569" }}>
              {w}
            </div>
          ))}
        </div>

        {/* 날짜 칸 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {cells.map((key, idx) => {
            if (!key) {
              return <div key={`blank-${idx}`} style={{ minHeight: "104px", backgroundColor: "#fafafa", borderRight: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9" }} />;
            }
            const dayNum = parseInt(key.slice(8, 10), 10);
            const weekday = idx % 7;
            const dayEvents = eventsByDate[key] || [];
            const isToday = key === todayKey;
            const isSelected = key === selectedKey;

            return (
              <div
                key={key}
                onClick={() => setSelectedKey(isSelected ? null : key)}
                style={{
                  minHeight: "104px",
                  padding: "6px",
                  borderRight: "1px solid #f1f5f9",
                  borderBottom: "1px solid #f1f5f9",
                  cursor: "pointer",
                  backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                  outline: isSelected ? "2px solid #2563eb" : "none",
                  outlineOffset: "-2px",
                  transition: "background-color 0.12s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px" }}>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: isToday ? "700" : "600",
                      color: isToday ? "#ffffff" : weekday === 0 ? "#dc2626" : weekday === 6 ? "#2563eb" : "#334155",
                      backgroundColor: isToday ? "#2563eb" : "transparent",
                      borderRadius: "9999px",
                      width: "22px",
                      height: "22px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {dayNum}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  {dayEvents.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      title={ev.detail}
                      style={{
                        fontSize: "11px",
                        padding: "2px 5px",
                        borderRadius: "4px",
                        backgroundColor: KIND_META[ev.kind].bg,
                        color: KIND_META[ev.kind].color,
                        border: `1px solid ${KIND_META[ev.kind].border}`,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        fontWeight: "600",
                        opacity: ev.status === "PENDING" ? 0.65 : 1,
                      }}
                    >
                      {scope === "all" && ev.userName ? `${ev.userName} · ` : ""}
                      {ev.label}
                      {ev.status === "PENDING" ? " (대기)" : ""}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div style={{ fontSize: "11px", color: "#64748b", paddingLeft: "4px", fontWeight: "600" }}>
                      +{dayEvents.length - 3}건 더
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 선택한 날짜 상세 */}
      <div style={{ marginTop: "22px", backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "20px" }}>
        <h3 style={{ margin: "0 0 14px 0", fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
          {selectedKey ? `${selectedKey} 상세 근태` : "날짜를 선택하면 해당 일자의 상세 내역이 표시됩니다"}
        </h3>

        {selectedKey && (
          <>
            {/* 근태상황: 시간조정이 있으면 조정된 시간, 없으면 기본 근무시간 */}
            <div style={{ marginBottom: "14px", padding: "12px 14px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "600" }}>근태상황 · </span>
              {(() => {
                const adj = selectedEvents.find((e) => e.kind === "ADJ" && e.status === "APPROVED");
                const leave = selectedEvents.find((e) => e.kind === "LEAVE" && e.status === "APPROVED");
                const trip = selectedEvents.find((e) => e.kind === "TRIP" && e.status === "APPROVED");
                const edu = selectedEvents.find((e) => e.kind === "EDU" && e.status === "APPROVED");
                if (leave) return <span style={{ fontSize: "14px", color: "#1d4ed8", fontWeight: "700" }}>휴가 ({leave.label})</span>;
                if (trip) return <span style={{ fontSize: "14px", color: "#6d28d9", fontWeight: "700" }}>출장 ({trip.label})</span>;
                if (edu) return <span style={{ fontSize: "14px", color: "#15803d", fontWeight: "700" }}>교육 ({edu.label})</span>;
                if (adj) return <span style={{ fontSize: "14px", color: "#b45309", fontWeight: "700" }}>조정 근무 {adj.label}</span>;
                return <span style={{ fontSize: "14px", color: "#334155", fontWeight: "700" }}>정상 근무 {data?.baseSchedule || "09:00-18:00"}</span>;
              })()}
            </div>

            {selectedEvents.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>
                이 날짜에 등록된 휴가 · 출장 · 교육 · 시간조정 · 시간외근무 내역이 없습니다.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {KIND_ORDER.filter((k) => selectedEvents.some((e) => e.kind === k)).map((k) => (
                  <div key={k}>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: KIND_META[k].color, marginBottom: "6px" }}>
                      {KIND_META[k].name}
                    </div>
                    {selectedEvents
                      .filter((e) => e.kind === k)
                      .map((ev) => (
                        <div
                          key={ev.id}
                          style={{
                            padding: "10px 12px",
                            marginBottom: "6px",
                            backgroundColor: KIND_META[k].bg,
                            border: `1px solid ${KIND_META[k].border}`,
                            borderRadius: "6px",
                            fontSize: "13px",
                            color: "#334155",
                          }}
                        >
                          {ev.userName && (
                            <span style={{ fontWeight: "700", color: "#0f172a" }}>
                              {ev.userName}
                              {ev.department ? ` (${ev.department})` : ""} ·{" "}
                            </span>
                          )}
                          {ev.detail}
                          <span style={{ marginLeft: "6px", fontSize: "11px", fontWeight: "700", color: ev.status === "APPROVED" ? "#166534" : "#92400e" }}>
                            [{statusLabel(ev.status)}]
                          </span>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 월별 전체 내역 */}
      <div style={{ marginTop: "22px" }}>
        <h3 style={{ margin: "0 0 14px 0", fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
          {year}년 {month}월 전체 내역 ({events.length}건)
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
          {KIND_ORDER.map((k) => {
            const list = monthlyByKind[k];
            return (
              <div key={k} style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", paddingBottom: "8px", borderBottom: `2px solid ${KIND_META[k].border}` }}>
                  <span style={{ fontSize: "14px", fontWeight: "700", color: KIND_META[k].color }}>{KIND_META[k].name}</span>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#64748b" }}>{list.length}건</span>
                </div>

                {list.length === 0 ? (
                  <div style={{ fontSize: "13px", color: "#94a3b8", padding: "6px 0" }}>내역 없음</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {list.map((ev) => (
                      <div
                        key={ev.id}
                        onClick={() => setSelectedKey(ev.dateKeys[0])}
                        style={{ fontSize: "12px", color: "#475569", cursor: "pointer", paddingBottom: "6px", borderBottom: "1px dashed #f1f5f9" }}
                      >
                        <div style={{ fontWeight: "700", color: "#1e293b" }}>
                          {ev.dateKeys.length > 1
                            ? `${ev.dateKeys[0].slice(5)} ~ ${ev.dateKeys[ev.dateKeys.length - 1].slice(5)}`
                            : ev.dateKeys[0].slice(5)}
                          {ev.userName ? ` · ${ev.userName}` : ""}
                          <span style={{ marginLeft: "5px", fontWeight: "600", color: ev.status === "APPROVED" ? "#166534" : "#92400e" }}>
                            [{statusLabel(ev.status)}]
                          </span>
                        </div>
                        <div style={{ marginTop: "2px" }}>{ev.detail}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
