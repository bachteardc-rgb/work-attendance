"use client";

import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";

function SignInContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams?.get("error");
  const callbackUrl = searchParams?.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleTestLogin = async (targetEmail: string) => {
    setLoading(true);
    setErrorMessage("");
    try {
      const res = await signIn("credentials", {
        email: targetEmail,
        callbackUrl,
        redirect: false,
      });

      if (res?.error) {
        setErrorMessage("로그인에 실패했습니다. 다시 시도해 주세요.");
        setLoading(false);
      } else if (res?.url) {
        router.push(res.url);
      }
    } catch (err) {
      setErrorMessage("로그인 처리 중 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage("이메일을 입력해 주세요.");
      return;
    }
    handleTestLogin(email.trim());
  };

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      backgroundColor: "#f3f4f6",
      fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif"
    }}>
      <div style={{
        padding: "40px",
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
        textAlign: "center",
        maxWidth: "420px",
        width: "100%",
        boxSizing: "border-box"
      }}>
        {/* 로고 & 타이틀 */}
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ margin: "0 0 6px 0", fontSize: "22px", color: "#111827", fontWeight: "700" }}>
            사내 근태관리 시스템
          </h1>
          <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>
            원하시는 로그인 방식을 선택해 주세요.
          </p>
        </div>

        {(error || errorMessage) && (
          <div style={{
            marginBottom: "20px",
            padding: "12px 14px",
            backgroundColor: "#fef2f2",
            color: "#991b1b",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            fontSize: "13px",
            textAlign: "left"
          }}>
            {errorMessage || "로그인 중 오류가 발생했습니다. 구글 인증 권한이 유효하지 않은 경우 아래의 간편 테스트 로그인을 이용해 보세요."}
          </div>
        )}

        {/* 1클릭 테스트 로그인 영역 */}
        <div style={{
          backgroundColor: "#f8fafc",
          border: "1px dashed #cbd5e1",
          borderRadius: "10px",
          padding: "16px",
          marginBottom: "24px"
        }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "10px", textAlign: "left" }}>
            빠른 테스트 전용 로그인
          </div>
          <div style={{ display: "grid", gap: "8px" }}>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleTestLogin("admin@example.com")}
              style={{
                padding: "10px 14px",
                backgroundColor: "#4f46e5",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s"
              }}
            >
              관리자 계정으로 로그인 (admin@example.com)
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleTestLogin("user@example.com")}
              style={{
                padding: "10px 14px",
                backgroundColor: "#059669",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s"
              }}
            >
              일반 직원 계정으로 로그인 (user@example.com)
            </button>
          </div>
        </div>

        {/* 이메일 직접 입력 Form */}
        <form onSubmit={handleEmailSubmit} style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="email"
              placeholder="이메일 입력 (예: test@company.com)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                fontSize: "14px",
                outline: "none"
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px 14px",
                backgroundColor: "#3b82f6",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              로그인
            </button>
          </div>
        </form>

        <div style={{ display: "flex", alignItems: "center", margin: "20px 0" }}>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#e5e7eb" }}></div>
          <span style={{ padding: "0 10px", fontSize: "12px", color: "#9ca3af" }}>또는</span>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#e5e7eb" }}></div>
        </div>

        {/* 기존 Google 로그인 */}
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl })}
          style={{
            width: "100%",
            padding: "12px 16px",
            backgroundColor: "#ffffff",
            color: "#374151",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
            cursor: "pointer",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "background-color 0.2s"
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
          </svg>
          Google 계정으로 로그인
        </button>
      </div>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInContent />
    </Suspense>
  );
}
