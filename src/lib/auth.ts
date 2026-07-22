import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "테스트/이메일 로그인",
      credentials: {
        email: { label: "이메일", type: "email", placeholder: "user@example.com" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          throw new Error("이메일을 입력해 주세요.");
        }

        const email = credentials.email.trim();

        // DB에서 사용자 조회
        let user = await prisma.user.findUnique({
          where: { email },
        });

        // DB에 사용자가 없는 경우 자동 생성 (테스트 편의성)
        if (!user) {
          const isAdmin = email.includes("admin");
          user = await prisma.user.create({
            data: {
              email,
              name: isAdmin ? "관리자" : email.split("@")[0],
              role: isAdmin ? "ADMIN" : "USER",
              department: isAdmin ? "인사팀" : "개발팀",
              annualLeaveTotal: 15.0,
              annualLeaveUsed: 0.0,
            },
          });
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "credentials") {
        return true;
      }
      if (!user.email) return false;

      try {
        // Google 로그인 시 유저가 없으면 자동 생성 (upsert)
        await prisma.user.upsert({
          where: { email: user.email },
          update: {
            name: user.name ?? undefined,
            image: user.image ?? undefined,
          },
          create: {
            email: user.email,
            name: user.name ?? null,
            image: user.image ?? null,
          },
        });

        // Account 정보도 저장 (OAuth 토큰 관리용)
        if (account) {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
          });
          if (dbUser) {
            await prisma.account.upsert({
              where: {
                provider_providerAccountId: {
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                },
              },
              update: {
                access_token: account.access_token ?? null,
                refresh_token: account.refresh_token ?? null,
                expires_at: account.expires_at ?? null,
                token_type: account.token_type ?? null,
                scope: account.scope ?? null,
                id_token: account.id_token ?? null,
                session_state: (account.session_state as string) ?? null,
              },
              create: {
                userId: dbUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token ?? null,
                refresh_token: account.refresh_token ?? null,
                expires_at: account.expires_at ?? null,
                token_type: account.token_type ?? null,
                scope: account.scope ?? null,
                id_token: account.id_token ?? null,
                session_state: (account.session_state as string) ?? null,
              },
            });
          }
        }

        return true;
      } catch (error) {
        console.error("[NextAuth] signIn 에러:", error);
        return false;
      }
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        // DB에서 유저 정보 조회하여 세션에 추가
        const user = await prisma.user.findUnique({
          where: { id: token.sub },
        });
        if (user) {
          (session.user as any).id = user.id;
          (session.user as any).role = user.role;
          (session.user as any).department = user.department;
          (session.user as any).annualLeaveTotal = user.annualLeaveTotal;
          (session.user as any).annualLeaveUsed = user.annualLeaveUsed;
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      // 로그인 시 DB에서 실제 유저 ID를 가져와서 token.sub에 설정
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (dbUser) {
          token.sub = dbUser.id;
        }
      }
      return token;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};

