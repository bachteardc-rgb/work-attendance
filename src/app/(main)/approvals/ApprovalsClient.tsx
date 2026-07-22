"use client";

import { useState, useEffect } from "react";

export default function ApprovalsClient({ 
  leaves, 
  overtimes, 
  adjustments,
  users, 
  leaveTypes: initialLeaveTypes 
}: { 
  leaves: any[]; 
  overtimes: any[]; 
  adjustments: any[];
  users: any[]; 
  leaveTypes: any[];
}) {
  const [activeTab, setActiveTab] = useState<"APPROVALS" | "QUOTAS" | "LEAVE_TYPES" | "USERS">("APPROVALS");
  const [loading, setLoading] = useState<string | null>(null);

  // Users 폼 및 상태
  const [usersList, setUsersList] = useState<any[]>(users);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserDepartment, setNewUserDepartment] = useState("");
  const [newUserRole, setNewUserRole] = useState("USER");

  // Quota 폼 및 상태
  const [selectedYear, setSelectedYear] = useState(2026);
  const [quotaUserId, setQuotaUserId] = useState(users[0]?.id || "");
  const [quotaLeaveType, setQuotaLeaveType] = useState(initialLeaveTypes[0]?.code || "ANNUAL");
  const [quotaTotalDays, setQuotaTotalDays] = useState("15");
  const [quotasData, setQuotasData] = useState<any[]>([]);

  // LeaveType 폼 및 상태
  const [leaveTypes, setLeaveTypes] = useState<any[]>(initialLeaveTypes);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newIsPaid, setNewIsPaid] = useState(true);

  // 휴가 코드별 한글명 매핑 헬퍼
  const getLeaveTypeName = (code: string) => {
    const matched = leaveTypes.find(lt => lt.code === code);
    if (matched) return matched.name;
    if (code === "HALF_AM") return "오전 반차";
    if (code === "HALF_PM") return "오후 반차";
    if (code === "ANNUAL") return "연차";
    if (code === "SICK") return "병가";
    if (code === "OFFICIAL") return "공가";
    if (code === "FAMILY_CARE") return "가족돌봄휴가";
    if (code === "COMPENSATORY") return "대체휴가";
    return code;
  };

  // 쿼터 목록 가져오기
  const fetchQuotas = async () => {
    try {
      const res = await fetch(`/api/admin/quotas?year=${selectedYear}`);
      if (res.ok) {
        const data = await res.json();
        setQuotasData(data.users || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTab === "QUOTAS") {
      fetchQuotas();
    }
  }, [activeTab, selectedYear]);

  // 승인/반려 처리
  const handleApprove = async (type: "leaves" | "overtime" | "adjustments", id: string, status: "APPROVED" | "REJECTED") => {
    setLoading(id);
    try {
      const res = await fetch(`/api/${type}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("Failed to update");
      alert("처리가 완료되었습니다.");
      window.location.reload();
    } catch (e) {
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(null);
    }
  };

  // 신규 직원 등록
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      alert("이름과 이메일을 입력해 주세요.");
      return;
    }

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          department: newUserDepartment,
          role: newUserRole,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        alert(`신규 직원 (${created.name}) 계정이 생성되었습니다.`);
        setUsersList([...usersList, created]);
        setNewUserName("");
        setNewUserEmail("");
        setNewUserDepartment("");
        setNewUserRole("USER");
        // 부여 탭 등에서 새 직원을 선택할 수 있도록 사용자 목록을 갱신하는 것이 좋습니다.
        // 현재 usersList 상태에 새로 생성된 유저를 추가했으므로 렌더링에 반영됩니다.
      } else {
        const err = await res.json();
        alert(err.error || "생성 중 오류가 발생했습니다.");
      }
    } catch (e) {
      alert("오류가 발생했습니다.");
    }
  };


  // 쿼터 부여 저장
  const handleSaveQuota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotaUserId || !quotaLeaveType || !quotaTotalDays) {
      alert("모든 값을 입력해 주세요.");
      return;
    }

    try {
      const res = await fetch("/api/admin/quotas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: quotaUserId,
          year: selectedYear,
          leaveType: quotaLeaveType,
          totalDays: parseFloat(quotaTotalDays),
        }),
      });

      if (res.ok) {
        alert("휴가 일수가 부여/수정 되었습니다.");
        fetchQuotas();
      } else {
        alert("저장 중 오류가 발생했습니다.");
      }
    } catch (e) {
      alert("오류가 발생했습니다.");
    }
  };

  // 휴가 종류 생성
  const handleCreateLeaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) {
      alert("휴가 식별코드와 휴가명을 입력해 주세요.");
      return;
    }

    try {
      const res = await fetch("/api/admin/leavetypes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode,
          name: newName,
          description: newDesc,
          isPaid: newIsPaid,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        alert(`신규 휴가 종류 (${created.name})가 생성되었습니다.`);
        setLeaveTypes([...leaveTypes, created]);
        setNewCode("");
        setNewName("");
        setNewDesc("");
      } else {
        alert("생성 중 오류가 발생했습니다.");
      }
    } catch (e) {
      alert("오류가 발생했습니다.");
    }
  };

  const inputStyle = { padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px" };
  const labelStyle = { display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "600" as const, color: "#475569" };

  return (
    <div>
      {/* 서브 탭 네비게이션 */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "2px solid #e2e8f0", paddingBottom: "8px", overflowX: "auto" }}>
        <button
          onClick={() => setActiveTab("APPROVALS")}
          style={{
            padding: "10px 18px",
            backgroundColor: activeTab === "APPROVALS" ? "#2563eb" : "#f1f5f9",
            color: activeTab === "APPROVALS" ? "#ffffff" : "#475569",
            border: "none",
            borderRadius: "6px",
            fontWeight: "600",
            cursor: "pointer",
            whiteSpace: "nowrap"
          }}
        >
          신청 결재함
        </button>
        <button
          onClick={() => setActiveTab("USERS")}
          style={{
            padding: "10px 18px",
            backgroundColor: activeTab === "USERS" ? "#2563eb" : "#f1f5f9",
            color: activeTab === "USERS" ? "#ffffff" : "#475569",
            border: "none",
            borderRadius: "6px",
            fontWeight: "600",
            cursor: "pointer",
            whiteSpace: "nowrap"
          }}
        >
          직원 계정 관리
        </button>
        <button
          onClick={() => setActiveTab("QUOTAS")}
          style={{
            padding: "10px 18px",
            backgroundColor: activeTab === "QUOTAS" ? "#2563eb" : "#f1f5f9",
            color: activeTab === "QUOTAS" ? "#ffffff" : "#475569",
            border: "none",
            borderRadius: "6px",
            fontWeight: "600",
            cursor: "pointer",
            whiteSpace: "nowrap"
          }}
        >
          연도별 휴가 부여
        </button>
        <button
          onClick={() => setActiveTab("LEAVE_TYPES")}
          style={{
            padding: "10px 18px",
            backgroundColor: activeTab === "LEAVE_TYPES" ? "#2563eb" : "#f1f5f9",
            color: activeTab === "LEAVE_TYPES" ? "#ffffff" : "#475569",
            border: "none",
            borderRadius: "6px",
            fontWeight: "600",
            cursor: "pointer",
            whiteSpace: "nowrap"
          }}
        >
          휴가 종류 설정
        </button>
      </div>

      {/* 1. 결재함 탭 */}
      {activeTab === "APPROVALS" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* 휴가 결재 */}
          <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px" }}>
            <h2 style={{ fontSize: "17px", color: "#0f172a", marginBottom: "15px", fontWeight: "700" }}>휴가 결재 대기 건</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                  <th style={{ padding: "10px 14px", color: "#475569", fontSize: "13px" }}>직원명 (부서)</th>
                  <th style={{ padding: "10px 14px", color: "#475569", fontSize: "13px" }}>구분 및 기간</th>
                  <th style={{ padding: "10px 14px", color: "#475569", fontSize: "13px" }}>사유</th>
                  <th style={{ padding: "10px 14px", color: "#475569", fontSize: "13px" }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {leaves.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>대기 중인 휴가 결재가 없습니다.</td></tr>
                ) : (
                  leaves.map((item) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 14px", fontSize: "14px", fontWeight: "500" }}>
                        {item.user?.name} <span style={{ color: "#64748b", fontSize: "12px" }}>({item.user?.department})</span>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: "14px" }}>
                        <span style={{ fontWeight: "600", color: "#2563eb" }}>{getLeaveTypeName(item.type)}</span> ({item.daysUsed}일)
                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                          {new Date(item.startDate).toLocaleDateString()} ~ {new Date(item.endDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: "13px", color: "#334155" }}>{item.reason || "-"}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <button onClick={() => handleApprove("leaves", item.id, "APPROVED")} disabled={loading === item.id} style={{ marginRight: "6px", padding: "6px 12px", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>승인</button>
                        <button onClick={() => handleApprove("leaves", item.id, "REJECTED")} disabled={loading === item.id} style={{ padding: "6px 12px", backgroundColor: "#dc2626", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>반려</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 시간외근무 결재 */}
          <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px" }}>
            <h2 style={{ fontSize: "17px", color: "#0f172a", marginBottom: "15px", fontWeight: "700" }}>시간외근무 결재 대기 건</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                  <th style={{ padding: "10px 14px", color: "#475569", fontSize: "13px" }}>직원명 (부서)</th>
                  <th style={{ padding: "10px 14px", color: "#475569", fontSize: "13px" }}>근무 일시</th>
                  <th style={{ padding: "10px 14px", color: "#475569", fontSize: "13px" }}>내용</th>
                  <th style={{ padding: "10px 14px", color: "#475569", fontSize: "13px" }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {overtimes.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>대기 중인 시간외근무 결재가 없습니다.</td></tr>
                ) : (
                  overtimes.map((item) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 14px", fontSize: "14px", fontWeight: "500" }}>
                        {item.user?.name} <span style={{ color: "#64748b", fontSize: "12px" }}>({item.user?.department})</span>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: "14px" }}>
                        {new Date(item.date).toLocaleDateString()}
                        <div style={{ fontSize: "12px", color: "#d97706", marginTop: "2px", fontWeight: "600" }}>
                          {item.startTime} ~ {item.endTime} ({item.totalHours}시간)
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: "13px", color: "#334155" }}>{item.description || "-"}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <button onClick={() => handleApprove("overtime", item.id, "APPROVED")} disabled={loading === item.id} style={{ marginRight: "6px", padding: "6px 12px", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>승인</button>
                        <button onClick={() => handleApprove("overtime", item.id, "REJECTED")} disabled={loading === item.id} style={{ padding: "6px 12px", backgroundColor: "#dc2626", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>반려</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 근무시간 조정 결재 */}
          <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px" }}>
            <h2 style={{ fontSize: "17px", color: "#0f172a", marginBottom: "15px", fontWeight: "700" }}>근무시간 조정 결재 대기 건</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                  <th style={{ padding: "10px 14px", color: "#475569", fontSize: "13px" }}>직원명 (부서)</th>
                  <th style={{ padding: "10px 14px", color: "#475569", fontSize: "13px" }}>적용 희망일</th>
                  <th style={{ padding: "10px 14px", color: "#475569", fontSize: "13px" }}>조정 시간</th>
                  <th style={{ padding: "10px 14px", color: "#475569", fontSize: "13px" }}>사유</th>
                  <th style={{ padding: "10px 14px", color: "#475569", fontSize: "13px" }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>대기 중인 근무시간 조정 결재가 없습니다.</td></tr>
                ) : (
                  adjustments.map((item) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 14px", fontSize: "14px", fontWeight: "500" }}>
                        {item.user?.name} <span style={{ color: "#64748b", fontSize: "12px" }}>({item.user?.department})</span>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: "14px" }}>
                        {new Date(item.applyDate).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: "14px" }}>
                        <span style={{ textDecoration: "line-through", color: "#94a3b8", fontSize: "12px" }}>{item.originalTime}</span>
                        <div style={{ fontWeight: "700", color: "#2563eb" }}>변경: {item.requestedTime}</div>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: "13px", color: "#334155" }}>{item.reason || "-"}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <button onClick={() => handleApprove("adjustments", item.id, "APPROVED")} disabled={loading === item.id} style={{ marginRight: "6px", padding: "6px 12px", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>승인</button>
                        <button onClick={() => handleApprove("adjustments", item.id, "REJECTED")} disabled={loading === item.id} style={{ padding: "6px 12px", backgroundColor: "#dc2626", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>반려</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. 직원 계정 관리 탭 */}
      {activeTab === "USERS" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* 직원 추가 폼 */}
          <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px" }}>
            <h2 style={{ fontSize: "17px", color: "#0f172a", marginBottom: "15px", fontWeight: "700" }}>신규 직원 등록</h2>
            <form onSubmit={handleCreateUser} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", alignItems: "end" }}>
              <div>
                <label style={labelStyle}>이름</label>
                <input type="text" placeholder="홍길동" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} style={inputStyle} required />
              </div>

              <div>
                <label style={labelStyle}>이메일 (로그인 ID)</label>
                <input type="email" placeholder="user@example.com" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} style={inputStyle} required />
              </div>

              <div>
                <label style={labelStyle}>소속 부서</label>
                <input type="text" placeholder="기획팀" value={newUserDepartment} onChange={(e) => setNewUserDepartment(e.target.value)} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>시스템 권한</label>
                <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)} style={inputStyle}>
                  <option value="USER">일반 사용자 (USER)</option>
                  <option value="ADMIN">최고 관리자 (ADMIN)</option>
                </select>
              </div>

              <button type="submit" style={{ padding: "9px 16px", backgroundColor: "#16a34a", color: "#ffffff", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>
                직원 등록하기
              </button>
            </form>
          </div>

          {/* 직원 목록 테이블 */}
          <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px" }}>
            <h2 style={{ fontSize: "17px", color: "#0f172a", marginBottom: "15px", fontWeight: "700" }}>등록된 직원 목록</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                  <th style={{ padding: "10px 14px", color: "#475569", fontSize: "13px" }}>이름</th>
                  <th style={{ padding: "10px 14px", color: "#475569", fontSize: "13px" }}>이메일</th>
                  <th style={{ padding: "10px 14px", color: "#475569", fontSize: "13px" }}>부서</th>
                  <th style={{ padding: "10px 14px", color: "#475569", fontSize: "13px" }}>권한</th>
                </tr>
              </thead>
              <tbody>
                {usersList.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>등록된 직원이 없습니다.</td></tr>
                ) : (
                  usersList.map((u) => (
                    <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 14px", fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>{u.name}</td>
                      <td style={{ padding: "12px 14px", fontSize: "14px", color: "#475569" }}>{u.email}</td>
                      <td style={{ padding: "12px 14px", fontSize: "14px", color: "#475569" }}>{u.department || "-"}</td>
                      <td style={{ padding: "12px 14px", fontSize: "13px" }}>
                        <span style={{ 
                          padding: "3px 8px", 
                          borderRadius: "4px", 
                          backgroundColor: u.role === "ADMIN" ? "#fee2e2" : "#f1f5f9", 
                          color: u.role === "ADMIN" ? "#991b1b" : "#475569", 
                          fontWeight: "600" 
                        }}>
                          {u.role === "ADMIN" ? "관리자" : "일반"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. 직원별 연도 휴가 부여 관리 탭 */}
      {activeTab === "QUOTAS" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* 부여 설정 입력 폼 */}
          <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px" }}>
            <h2 style={{ fontSize: "17px", color: "#0f172a", marginBottom: "15px", fontWeight: "700" }}>직원별 휴가 일수 부여 및 수정</h2>
            <form onSubmit={handleSaveQuota} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "15px", alignItems: "end" }}>
              <div>
                <label style={labelStyle}>적용 연도</label>
                <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} style={inputStyle}>
                  <option value={2025}>2025년</option>
                  <option value={2026}>2026년</option>
                  <option value={2027}>2027년</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>대상 직원</label>
                <select value={quotaUserId} onChange={(e) => setQuotaUserId(e.target.value)} style={inputStyle}>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.department || "미지정"}) - {u.email}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>휴가 종류</label>
                <select value={quotaLeaveType} onChange={(e) => setQuotaLeaveType(e.target.value)} style={inputStyle}>
                  {leaveTypes.map((lt) => (
                    <option key={lt.code} value={lt.code}>{lt.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>총 부여 일수</label>
                <input type="number" step="0.5" value={quotaTotalDays} onChange={(e) => setQuotaTotalDays(e.target.value)} style={inputStyle} required />
              </div>

              <button type="submit" style={{ padding: "9px 16px", backgroundColor: "#2563eb", color: "#ffffff", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>
                부여 일수 저장
              </button>
            </form>
          </div>

          {/* 현황 리스트 테이블 */}
          <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px" }}>
            <h2 style={{ fontSize: "17px", color: "#0f172a", marginBottom: "15px", fontWeight: "700" }}>{selectedYear}년 직원별 휴가 부여 및 사용 현황</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                  <th style={{ padding: "10px 14px", color: "#475569", fontSize: "13px" }}>직원명</th>
                  <th style={{ padding: "10px 14px", color: "#475569", fontSize: "13px" }}>부서</th>
                  <th style={{ padding: "10px 14px", color: "#475569", fontSize: "13px" }}>휴가 부여 내역 (종류별 부여일수 / 사용일수)</th>
                </tr>
              </thead>
              <tbody>
                {quotasData.length === 0 ? (
                  <tr><td colSpan={3} style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>등록된 직원 휴가 부여 정보가 없습니다.</td></tr>
                ) : (
                  quotasData.map((u) => (
                    <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 14px", fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>{u.name}</td>
                      <td style={{ padding: "12px 14px", fontSize: "13px", color: "#64748b" }}>{u.department || "-"}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                          {u.leaveQuotas?.map((q: any) => {
                            const name = getLeaveTypeName(q.leaveType);
                            const remain = q.totalDays - q.usedDays;
                            return (
                              <div key={q.id} style={{ backgroundColor: "#f1f5f9", padding: "6px 10px", borderRadius: "6px", fontSize: "12px", border: "1px solid #e2e8f0" }}>
                                <span style={{ fontWeight: "600", color: "#334155" }}>{name}:</span>{" "}
                                <span style={{ color: "#2563eb", fontWeight: "700" }}>{q.totalDays}일</span> 부여 /{" "}
                                <span style={{ color: "#dc2626" }}>{q.usedDays}일</span> 사용 (잔여 <span style={{ color: "#16a34a", fontWeight: "700" }}>{remain}일</span>)
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. 휴가 종류 생성 및 관리 탭 */}
      {activeTab === "LEAVE_TYPES" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* 휴가 종류 추가 폼 */}
          <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px" }}>
            <h2 style={{ fontSize: "17px", color: "#0f172a", marginBottom: "15px", fontWeight: "700" }}>신규 휴가 종류 추가</h2>
            <form onSubmit={handleCreateLeaveType} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", alignItems: "end" }}>
              <div>
                <label style={labelStyle}>휴가 식별코드 (영문)</label>
                <input type="text" placeholder="예: REWARD, SICK, OFFICIAL" value={newCode} onChange={(e) => setNewCode(e.target.value)} style={inputStyle} required />
              </div>

              <div>
                <label style={labelStyle}>휴가 명칭</label>
                <input type="text" placeholder="예: 포상휴가, 병가, 경조휴가" value={newName} onChange={(e) => setNewName(e.target.value)} style={inputStyle} required />
              </div>

              <div>
                <label style={labelStyle}>설명</label>
                <input type="text" placeholder="예: 우수 성과자 포상 휴가" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>유급 여부</label>
                <select value={newIsPaid ? "true" : "false"} onChange={(e) => setNewIsPaid(e.target.value === "true")} style={inputStyle}>
                  <option value="true">유급 휴가</option>
                  <option value="false">무급 휴가</option>
                </select>
              </div>

              <button type="submit" style={{ padding: "9px 16px", backgroundColor: "#16a34a", color: "#ffffff", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>
                휴가 종류 생성
              </button>
            </form>
          </div>

          {/* 등록된 휴가 종류 목록 */}
          <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px" }}>
            <h2 style={{ fontSize: "17px", color: "#0f172a", marginBottom: "15px", fontWeight: "700" }}>등록된 휴가 종류 목록</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                  <th style={{ padding: "10px 14px", color: "#475569", fontSize: "13px" }}>휴가 명칭</th>
                  <th style={{ padding: "10px 14px", color: "#475569", fontSize: "13px" }}>유급 구분</th>
                  <th style={{ padding: "10px 14px", color: "#475569", fontSize: "13px" }}>설명</th>
                </tr>
              </thead>
              <tbody>
                {leaveTypes.map((lt) => (
                  <tr key={lt.id || lt.code} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 14px", fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>{lt.name}</td>
                    <td style={{ padding: "12px 14px", fontSize: "13px" }}>
                      <span style={{ padding: "3px 8px", borderRadius: "4px", backgroundColor: lt.isPaid ? "#dcfce7" : "#f1f5f9", color: lt.isPaid ? "#15803d" : "#64748b", fontWeight: "600" }}>
                        {lt.isPaid ? "유급" : "무급"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: "13px", color: "#64748b" }}>{lt.description || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
