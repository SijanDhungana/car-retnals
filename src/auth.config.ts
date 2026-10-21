import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe half of the Auth.js config.
 *
 * The middleware imports this file, so it must not pull in the database, the
 * Neon driver or bcrypt. The Credentials provider lives in `src/auth.ts`,
 * which only ever runs in the Node.js runtime.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 12, // a working day
  },
  trustHost: true,
  callbacks: {
    /** Route guard used by the middleware: everything except /food requires a session. */
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);
      const { pathname } = request.nextUrl;

      // The food call system is deliberately public: anyone with the link
      // can send or receive orders, no login.
      if (
        pathname === "/food" ||
        pathname.startsWith("/food/") ||
        pathname.startsWith("/api/food/")
      ) {
        return true;
      }

      if (pathname === "/login") {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", request.nextUrl));
        }
        return true;
      }

      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: string }).role ?? "STAFF";
        token.name = user.name ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "ADMIN" | "STAFF") ?? "STAFF";
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
