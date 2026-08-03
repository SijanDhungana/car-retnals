import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { authConfig } from "@/auth.config";
import { loginSchema } from "@/lib/validation";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Staff login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        // Compare against a dummy hash when the account is missing so a wrong
        // email and a wrong password take about the same time to reject.
        const hash =
          user?.passwordHash ??
          "$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv";

        const ok = await compare(password, hash);
        if (!user || !ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});

/** Session for the current request, or a redirect to /login if there is none. */
export async function requireSession() {
  const session = await auth();
  // `redirect` returns `never`, so callers get a non-nullable session.
  if (!session?.user) redirect("/login");
  return session;
}
