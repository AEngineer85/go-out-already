import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

/** Keywords blocked by default for every new user. They can remove these in Settings. */
export const DEFAULT_BLOCKED_KEYWORDS = [
  "hike", "walk", "weekender", "symphony", "boating", "artist", "java", "theatre",
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.events",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!account || account.provider !== "google") return false;

      const googleId = account.providerAccountId;
      const email = user.email!;
      const refreshToken = account.refresh_token;

      await prisma.user.upsert({
        where: { googleId },
        update: {
          email,
          ...(refreshToken && { refreshToken: encrypt(refreshToken) }),
        },
        create: {
          googleId,
          email,
          refreshToken: refreshToken ? encrypt(refreshToken) : null,
          blockedKeywords: DEFAULT_BLOCKED_KEYWORDS,
        },
      });

      return true;
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, account }) {
      if (account?.refresh_token) {
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
});
