import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/**
 * Every route is behind the session guard except the login page and the
 * Auth.js endpoints themselves — this is an internal tool with no public
 * surface area.
 */
export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
