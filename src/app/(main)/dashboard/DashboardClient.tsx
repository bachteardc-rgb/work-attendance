"use client";

import { useState } from "react";

export default function DashboardClient({
  user,
  currentYear,
  currentMonthOvertime,
  userQuotas,
  leaveTypes,
  recentLeaves,
  recentAdjustments,
  allUsersData,
  allAdjustments
}: {
  user: any;
  currentYear: number;
  currentMonthOvertime: number;
  userQuotas: any[];
  leaveTypes: any[];
  recentLeaves: any[];
  recentAdjustments: any[];
  allUsersData: any[];
  allAdjustments: any[];
}) {
  const [activeTab, setActiveTab] = useState<"MY_STATUS" | "ALL_USERS_STATUS" | "ALL_SCHEDULES">("MY_STATUS");

  // 유저별로 가장 최신의 승인된 근무시간 조정 내역을 추출
  const latestAdjustmentsMap = new Map<string, any>();
  if (allAdjustments) {
    for (const adj of allAdjustments) {
      if (!latestAdjustmentsMap.has(adj.userId)) {
        latestAdjustmentsMap.set(adj.userId, adj);
      } else {
        const existing = latestAdjustmentsMap.get(adj.userId);
        if (new Date(adj.applyDate) > new Date(existing.applyDate)) {
          latestAdjustmentsMap.set(adj.userId, adj);
        }
      }
    }
  }

  // 시간대(requestedTime)별로 그룹화
  const groupedSchedules: Record<string, any[]> = {};
  Array.from(latestAdjustmentsMap.values()).forEach((adj) => {
    const time = adj.requestedTime || "기본 (09:00 - 18:00)";
    if (!groupedSchedules[time]) {
      groupedSchedules[time] = [];
    }
    groupedSchedules[time].push(adj);
  });

  return (
    <div>
      <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", marginBottom: "20px" }}>대시보드</h1>

      {/* 탭 네비게이션 (관리자일 때만 노출) */}
      {user?.role === "ADMIN" && (
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "2px solid #e2e8f0", paddingBottom: "8px", overflowX: "auto" }}>
          <button
            onClick={() => setActiveTab("MY_STATUS")}
            style={{
              padding: "10px 18px",
              backgroundColor: activeTab === "MY_STATUS" ? "#2563eb" : "#f1f5f9",
              color: activeTab === "MY_STATUS" ? "#ffffff" : "#475569",
              border: "none",
              borderRadius: "6px",
              fontWeight: "600",
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            내 근태 현황
          </button>
          <button
            onClick={() => setActiveTab("ALL_USERS_STATUS")}
            style={{
              padding: "10px 18px",
              backgroundColor: activeTab === "ALL_USERS_STATUS" ? "#2563eb" : "#f1f5f9",
              color: activeTab === "ALL_USERS_STATUS" ? "#ffffff" : "#475569",
              border: "none",
              borderRadius: "6px",
              fontWeight: "600",
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            전체 직원 근태 현황
          </button>
          <button
            onClick={() => setActiveTab("ALL_SCHEDULES")}
            style={{
              padding: "10px 18px",
              backgroundColor: activeTab === "ALL_SCHEDULES" ? "#2563eb" : "#f1f5f9",
              color: activeTab === "ALL_SCHEDULES" ? "#ffffff" : "#475569",
              border: "none",
              borderRadius: "6px",
              fontWeight: "600",
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            시간대별 근무 현황
          </button>
        </div>
      )}

      {/* 내 근태 현황 탭 */}
      {activeTab === "MY_STATUS" && (
        <>
          {/* 쿼터 카드 갤러리 */}
          <h2 style={{ fontSize: "16px", color: "#475569", marginBottom: "12px", fontWeight: "600" }}>
            {currentYear}년 부여된 휴가 잔여 현황
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "30px" }}>
            {/* 잔여 연차 기본 카드 */}
            <div style={{ padding: "18px", backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#64748b" }}>올해 잔여 연차</h3>
              <div style={{ fontSize: "28px", fontWeight: "700", color: "#2563eb" }}>
                {((user?.annualLeaveTotal || 15) - (user?.annualLeaveUsed || 0)).toFixed(1)} <span style={{ fontSize: "15px", color: "#64748b", fontWeight: "normal" }}>일</span>
              </div>
              <div style={{ marginTop: "8px", fontSize: "12px", color: "#94a3b8" }}>
                총 {user?.annualLeaveTotal || 15}일 중 {user?.annualLeaveUsed || 0}일 사용
              </div>
            </div>

            {/* 부여된 추가 휴가 종류별 카드 */}
            {userQuotas
              .filter((q: any) => q.leaveType !== "ANNUAL")
              .map((q: any) => {
                const matchedType = leaveTypes.find((lt: any) => lt.code === q.leaveType);
                const typeName = matchedType ? matchedType.name : q.leaveType;
                const remain = q.totalDays - q.usedDays;
                return (
                  <div key={q.id} style={{ padding: "18px", backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                    <h3 style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#64748b" }}>잔여 {typeName}</h3>
                    <div style={{ fontSize: "28px", fontWeight: "700", color: "#16a34a" }}>
                      {remain.toFixed(1)} <span style={{ fontSize: "15px", color: "#64748b", fontWeight: "normal" }}>일</span>
                    </div>
                    <div style={{ marginTop: "8px", fontSize: "12px", color: "#94a3b8" }}>
                      총 {q.totalDays}일 중 {q.usedDays}일 사용
                    </div>
                  </div>
                );
              })}

            {/* 이번 달 시간외근무 카드 */}
            <div style={{ padding: "18px", backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#64748b" }}>이번 달 승인된 시간외근무</h3>
              <div style={{ fontSize: "28px", fontWeight: "700", color: "#d97706" }}>
                {currentMonthOvertime.toFixed(1)} <span style={{ fontSize: "15px", color: "#64748b", fontWeight: "normal" }}>시간</span>
              </div>
              <div style={{ marginTop: "8px", fontSize: "12px", color: "#94a3b8" }}>
                당월 승인 기준 누적
              </div>
            </div>
          </div>

          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#111827", marginBottom: "15px" }}>최근 휴가 신청 내역</h2>
          <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "0", overflow: "hidden", marginBottom: "30px" }}>
            {recentLeaves.length === 0 ? (
              <div style={{ padding: "20px", color: "#64748b", textAlign: "center" }}>
                최근 휴가 신청 내역이 없습니다.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                    <th style={{ padding: "12px 20px", color: "#475569", fontSize: "14px", fontWeight: "600" }}>구분</th>
                    <th style={{ padding: "12px 20px", color: "#475569", fontSize: "14px", fontWeight: "600" }}>기간 및 사용일수</th>
                    <th style={{ padding: "12px 20px", color: "#475569", fontSize: "14px", fontWeight: "600" }}>사유</th>
                    <th style={{ padding: "12px 20px", color: "#475569", fontSize: "14px", fontWeight: "600" }}>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeaves.map((req) => {
                    const matchedType = leaveTypes.find((lt: any) => lt.code === req.type);
                    const typeLabel = matchedType ? matchedType.name : (req.type === "HALF_AM" ? "오전 반차" : req.type === "HALF_PM" ? "오후 반차" : req.type);
                    return (
                      <tr key={req.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "12px 20px", fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>
                          {typeLabel}
                        </td>
                        <td style={{ padding: "12px 20px", fontSize: "14px", color: "#475569" }}>
                          {new Date(req.startDate).toISOString().split("T")[0]} ~ {new Date(req.endDate).toISOString().split("T")[0]} ({req.daysUsed}일)
                        </td>
                        <td style={{ padding: "12px 20px", fontSize: "13px", color: "#64748b" }}>
                          {req.reason || "-"}
                        </td>
                        <td style={{ padding: "12px 20px", fontSize: "14px" }}>
                          <span style={{
                            padding: "4px 10px",
                            borderRadius: "9999px",
                            fontSize: "12px",
                            fontWeight: "600",
                            backgroundColor: req.status === "APPROVED" ? "#dcfce7" : req.status === "REJECTED" ? "#fee2e2" : "#fef3c7",
                            color: req.status === "APPROVED" ? "#166534" : req.status === "REJECTED" ? "#991b1b" : "#92400e"
                          }}>
                            {req.status === "APPROVED" ? "승인됨" : req.status === "REJECTED" ? "반려됨" : "대기 중"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#111827", marginBottom: "15px" }}>최근 근무시간 조정 신청 내역</h2>
          <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "0", overflow: "hidden" }}>
            {recentAdjustments && recentAdjustments.length === 0 ? (
              <div style={{ padding: "20px", color: "#64748b", textAlign: "center" }}>
                최근 근무시간 조정 신청 내역이 없습니다.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                    <th style={{ padding: "12px 20px", color: "#475569", fontSize: "14px", fontWeight: "600" }}>적용 희망일</th>
                    <th style={{ padding: "12px 20px", color: "#475569", fontSize: "14px", fontWeight: "600" }}>조정된 근무시간</th>
                    <th style={{ padding: "12px 20px", color: "#475569", fontSize: "14px", fontWeight: "600" }}>사유</th>
                    <th style={{ padding: "12px 20px", color: "#475569", fontSize: "14px", fontWeight: "600" }}>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAdjustments?.map((adj) => (
                    <tr key={adj.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 20px", fontSize: "14px", color: "#475569" }}>
                        {new Date(adj.applyDate).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "12px 20px", fontSize: "14px", color: "#1e293b", fontWeight: "600" }}>
                        {adj.requestedTime}
                      </td>
                      <td style={{ padding: "12px 20px", fontSize: "13px", color: "#64748b" }}>
                        {adj.reason || "-"}
                      </td>
                      <td style={{ padding: "12px 20px", fontSize: "14px" }}>
                        <span style={{
                          padding: "4px 10px",
                          borderRadius: "9999px",
                          fontSize: "12px",
                          fontWeight: "600",
                          backgroundColor: adj.status === "APPROVED" ? "#dcfce7" : adj.status === "REJECTED" ? "#fee2e2" : "#fef3c7",
                          color: adj.status === "APPROVED" ? "#166534" : adj.status === "REJECTED" ? "#991b1b" : "#92400e"
                        }}>
                          {adj.status === "APPROVED" ? "승인됨" : adj.status === "REJECTED" ? "반려됨" : "대기 중"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* 전체 직원 근태 현황 탭 */}
      {activeTab === "ALL_USERS_STATUS" && user?.role === "ADMIN" && (
        <>
          <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px" }}>
            <h2 style={{ fontSize: "17px", color: "#0f172a", marginBottom: "15px", fontWeight: "700" }}>전체 직원 근태 요약</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                  <th style={{ padding: "10px 14px", color: "#475569", fontSize: "13px" }}>직원명 (부서)</th>
                  <th style={{ padding: "10px 14px", color: "#475569", fontSize: "13px" }}>이번 달 시간외근무 합계</th>
                  <th style={{ padding: "10px 14px", color: "#475569", fontSize: "13px" }}>잔여 연차</th>
                  <th style={{ padding: "10px 14px", color: "#475569", fontSize: "13px" }}>기타 휴가 현황</th>
                </tr>
              </thead>
              <tbody>
                {allUsersData.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>등록된 직원 정보가 없습니다.</td></tr>
                ) : (
                  allUsersData.map((u) => {
                    const annualRemain = (u.annualLeaveTotal || 15) - (u.annualLeaveUsed || 0);
                    return (
                      <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "12px 14px", fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>
                          {u.name} <span style={{ color: "#64748b", fontSize: "12px", fontWeight: "normal" }}>({u.department || "-"})</span>
                        </td>
                        <td style={{ padding: "12px 14px", fontSize: "14px" }}>
                          {u.overtimeHours > 0 ? (
                            <span style={{ fontWeight: "700", color: "#d97706" }}>{u.overtimeHours.toFixed(1)}시간</span>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>0시간</span>
                          )}
                        </td>
                        <td style={{ padding: "12px 14px", fontSize: "14px" }}>
                          <span style={{ fontWeight: "600", color: "#2563eb" }}>{annualRemain.toFixed(1)}일</span>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {u.quotas?.filter((q: any) => q.leaveType !== "ANNUAL").map((q: any) => {
                              const matchedType = leaveTypes.find((lt: any) => lt.code === q.leaveType);
                              const typeName = matchedType ? matchedType.name : q.leaveType;
                              const remain = q.totalDays - q.usedDays;
                              return (
                                <span key={q.id} style={{ padding: "2px 6px", backgroundColor: "#f1f5f9", borderRadius: "4px", fontSize: "12px", color: "#475569" }}>
                                  {typeName}: 잔여 <span style={{ color: "#16a34a", fontWeight: "600" }}>{remain}일</span>
                                </span>
                              );
                            })}
                            {(!u.quotas || u.quotas.filter((q: any) => q.leaveType !== "ANNUAL").length === 0) && (
                              <span style={{ fontSize: "12px", color: "#94a3b8" }}>-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 시간대별 근무 현황 탭 */}
      {activeTab === "ALL_SCHEDULES" && user?.role === "ADMIN" && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {Object.keys(groupedSchedules).length === 0 ? (
              <div style={{ padding: "30px", backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", textAlign: "center", color: "#64748b" }}>
                승인된 유연근무(근무시간 조정) 내역이 없습니다.
              </div>
            ) : (
              Object.keys(groupedSchedules).sort().map((time) => (
                <div key={time} style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px" }}>
                  <h3 style={{ fontSize: "16px", color: "#0f172a", marginBottom: "15px", fontWeight: "700", borderBottom: "2px solid #f1f5f9", paddingBottom: "10px" }}>
                    근무시간: <span style={{ color: "#2563eb" }}>{time}</span>
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
                    {groupedSchedules[time].map((adj) => (
                      <div key={adj.id} style={{ padding: "12px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontWeight: "600", fontSize: "14px", color: "#1e293b", marginBottom: "4px" }}>
                          {adj.user?.name}
                        </div>
                        <div style={{ fontSize: "13px", color: "#64748b" }}>
                          부서: {adj.user?.department || "-"}
                        </div>
                        <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "8px" }}>
                          적용 희망일: {new Date(adj.applyDate).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
