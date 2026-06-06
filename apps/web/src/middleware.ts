import { auth } from "@/auth";
import { NextResponse } from "next/server";

type Role =
  | "ADMIN" | "PRINCIPAL" | "DEAN" | "TRUSTEE"
  | "FACULTY" | "HOD" | "COUNSELLOR"
  | "STUDENT" | "PARENT" | "RECRUITER" | "APPLICANT";

const ADMIN_ROLES: Role[] = ["ADMIN", "PRINCIPAL", "DEAN", "TRUSTEE", "HOD"];
const TEACHER_ROLES: Role[] = ["FACULTY", "HOD", "COUNSELLOR"];

function rolePrefixAllowed(pathname: string, role: Role): boolean {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return ADMIN_ROLES.includes(role);
  if (pathname.startsWith("/teacher/")) return TEACHER_ROLES.includes(role) || ADMIN_ROLES.includes(role);
  if (pathname.startsWith("/student/")) return role === "STUDENT";
  if (pathname.startsWith("/parent/")) return role === "PARENT";
  if (pathname.startsWith("/recruiter/")) return role === "RECRUITER";
  if (pathname.startsWith("/admit/")) return role === "APPLICANT" || ADMIN_ROLES.includes(role);
  if (pathname === "/dashboard") return role !== "RECRUITER" && role !== "APPLICANT";
  return true;
}

function homeForRole(role: Role): string {
  if (ADMIN_ROLES.includes(role)) return "/dashboard";
  if (TEACHER_ROLES.includes(role)) return "/dashboard";
  if (role === "STUDENT") return "/student/dashboard";
  if (role === "PARENT") return "/parent/dashboard";
  if (role === "RECRUITER") return "/recruiter/dashboard";
  if (role === "APPLICANT") return "/admit/dashboard";
  return "/dashboard";
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const publicPaths = ["/", "/login", "/admit/apply", "/admit/register"];
  const isPublic = publicPaths.includes(pathname) || pathname.startsWith("/api/auth") || pathname.startsWith("/verify/");
  if (isPublic) return NextResponse.next();

  if (!req.auth) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  const role = req.auth.user?.role as Role | undefined;
  if (role && !rolePrefixAllowed(pathname, role)) {
    return NextResponse.redirect(new URL(homeForRole(role), req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
