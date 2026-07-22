"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/auth/signin" })}
      style={{
        width: "100%",
        padding: "8px 12px",
        backgroundColor: "#f3f4f6",
        color: "#4b5563",
        border: "1px solid #d1d5db",
        borderRadius: "4px",
        fontSize: "14px",
        cursor: "pointer",
        textAlign: "center"
      }}
    >
      로그아웃
    </button>
  );
}
