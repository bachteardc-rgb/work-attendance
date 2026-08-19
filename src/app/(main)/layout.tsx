import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // session.user can exist without an `id` if the DB row behind the JWT
  // was deleted after the token was issued (see session() callback in
  // src/lib/auth.ts) — treat that the same as no session.
  if (!session || !(session.user as any)?.id) {
    redirect("/auth/signin");
  }

  const role = (session.user as any)?.role || "USER";

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f9fafb" }}>
      {/* Sidebar */}
      <aside style={{ width: "240px", backgroundColor: "#ffffff", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px", borderBottom: "1px solid #e5e7eb" }}>
          <h2 style={{ margin: "0", fontSize: "18px", color: "#111827", fontWeight: "600" }}>근태관리</h2>
        </div>
        <nav style={{ flex: 1, padding: "20px 0" }}>
          <ul style={{ listStyle: "none", padding: "0", margin: "0" }}>
            <li>
              <Link href="/dashboard" style={{ display: "block", padding: "10px 20px", color: "#4b5563", textDecoration: "none", fontSize: "15px" }}>대시보드</Link>
            </li>
            <li>
              <Link href="/requests" style={{ display: "block", padding: "10px 20px", color: "#4b5563", textDecoration: "none", fontSize: "15px" }}>신청하기</Link>
            </li>
            {role === "ADMIN" && (
              <li>
                <Link href="/approvals" style={{ display: "block", padding: "10px 20px", color: "#4b5563", textDecoration: "none", fontSize: "15px", fontWeight: "500" }}>결재함 (관리자)</Link>
              </li>
            )}
          </ul>
        </nav>
        <div style={{ padding: "20px", borderTop: "1px solid #e5e7eb" }}>
          <div style={{ marginBottom: "10px", fontSize: "14px", color: "#374151" }}>
            {session.user?.name} 님
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "30px", overflowY: "auto" }}>
        {IS_DEMO && (
          <div style={{
            marginBottom: "20px",
            padding: "11px 16px",
            backgroundColor: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "8px",
            fontSize: "13px",
            color: "#92400e",
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            alignItems: "center"
          }}>
            <strong>데모 환경</strong>
            <span style={{ color: "#b45309" }}>
              — 표시되는 자료는 모두 예시이며 실제 근태 기록이 아닙니다. 입력한 내용은 언제든 초기화될 수 있습니다.
            </span>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
