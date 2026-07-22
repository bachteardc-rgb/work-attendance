import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import RequestsClient from "./RequestsClient";

export default async function RequestsPage() {
  const session = await getServerSession(authOptions);
  
  return (
    <div>
      <h1 style={{ fontSize: "24px", color: "#111827", marginBottom: "20px" }}>신청하기</h1>
      <RequestsClient />
    </div>
  );
}
