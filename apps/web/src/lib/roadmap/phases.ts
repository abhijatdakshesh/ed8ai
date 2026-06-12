import type { UserRole } from "@/lib/auth/session";

export interface NavItem {
  key: string;
  title: string;
  route: string;
  icon?: string;
  allowedRoles: UserRole[];
  group?: string;
}

// ── Portal labels ─────────────────────────────────────────────────────────────

export function portalLabel(role: UserRole): string {
  switch (role) {
    case "ADMIN":      return "Admin Portal";
    case "PRINCIPAL":  return "Principal Portal";
    case "DEAN":       return "Dean Portal";
    case "TRUSTEE":    return "Trustee Portal";
    case "HOD":        return "HoD Portal";
    case "FACULTY":    return "Teacher Portal";
    case "COUNSELLOR": return "Counsellor Portal";
    case "STUDENT":    return "Student Portal";
    case "PARENT":     return "Parent Portal";
    case "RECRUITER":  return "Recruiter Portal";
    case "APPLICANT":  return "Admission Portal";
    default:
      return "Ed8AI";
  }
}

// ── Complete navigation registry ──────────────────────────────────────────────
// Each entry: which roles see it, which route it maps to, which sidebar group.

export const navItems: NavItem[] = [

  // ── ADMIN PORTAL ──────────────────────────────────────────────────────────

  { key: "dashboard",         title: "Dashboard",               route: "/dashboard",              allowedRoles: ["ADMIN","PRINCIPAL","DEAN","TRUSTEE","HOD"],     group: "Admin" },
  { key: "users",             title: "User Management",         route: "/admin/users",            allowedRoles: ["ADMIN"],                                        group: "Admin" },
  { key: "classes",           title: "Class Management",        route: "/admin/classes",          allowedRoles: ["ADMIN","HOD"],                                  group: "Admin" },
  { key: "departments",       title: "Departments",             route: "/admin/departments",      allowedRoles: ["ADMIN","HOD","PRINCIPAL"],                      group: "Admin" },
  { key: "courses",           title: "Course Management",       route: "/admin/courses",          allowedRoles: ["ADMIN","HOD"],                                  group: "Admin" },
  { key: "reports",           title: "Reports & Analytics",     route: "/reports",                allowedRoles: ["ADMIN","PRINCIPAL","DEAN","HOD"],               group: "Admin" },
  { key: "attendance-audit",  title: "Attendance Audit",        route: "/admin/attendance-audit", allowedRoles: ["ADMIN","HOD","PRINCIPAL","DEAN","COUNSELLOR"],  group: "Admin" },
  { key: "settings",          title: "System Settings",         route: "/admin/settings",         allowedRoles: ["ADMIN"],                                        group: "Admin" },
  { key: "bulk-import",       title: "Bulk Import",             route: "/admin/bulk-import",      allowedRoles: ["ADMIN"],                                        group: "Admin" },
  { key: "alert-feed",        title: "Alert Feed",              route: "/admin/alerts",           allowedRoles: ["ADMIN","PRINCIPAL","HOD"],                      group: "Admin" },
  { key: "naac",              title: "NAAC Intelligence",       route: "/admin/naac",             allowedRoles: ["ADMIN","PRINCIPAL"],                            group: "Admin" },
  { key: "timetable",         title: "Timetable Generator",     route: "/admin/timetable",        allowedRoles: ["ADMIN","HOD","PRINCIPAL"],                      group: "Admin" },
  { key: "placement-pred",    title: "Placement Predictor",     route: "/admin/placement",        allowedRoles: ["ADMIN","PRINCIPAL","HOD"],                      group: "Admin" },
  { key: "risk-tracker",     title: "Risk Tracker",            route: "/admin/risk",             allowedRoles: ["ADMIN","PRINCIPAL","HOD","COUNSELLOR"],         group: "Admin" },
  { key: "comms-settings",    title: "Communication Settings",  route: "/admin/comms",            allowedRoles: ["ADMIN"],                                        group: "Admin" },
  { key: "ia-marks",          title: "IA Marks Submission",     route: "/admin/ia-submission",    allowedRoles: ["ADMIN","HOD"],                                  group: "Admin" },
  { key: "vtu-admin",         title: "VTU Registration",        route: "/admin/vtu",              allowedRoles: ["ADMIN","HOD"],                                  group: "Admin" },
  { key: "ai-call-logs",      title: "AI Call Logs",            route: "/admin/ai-calls",         allowedRoles: ["ADMIN"],                                        group: "Admin" },
  { key: "voice-calling",     title: "Voice Calling Centre",    route: "/admin/voice-calling",    allowedRoles: ["ADMIN"],                                        group: "Admin" },
  { key: "ask-your-data",    title: "Ask Your Data",           route: "/admin/ask",              allowedRoles: ["ADMIN","PRINCIPAL"],                            group: "Admin" },
  { key: "document-centre",  title: "Document Centre",         route: "/admin/documents",        allowedRoles: ["ADMIN","PRINCIPAL"],                            group: "Admin" },
  { key: "report-generator", title: "Report Generator",        route: "/admin/report-generator", allowedRoles: ["ADMIN","PRINCIPAL"],                            group: "Admin" },
  { key: "fee-intelligence", title: "Fee Intelligence",         route: "/admin/fees",             allowedRoles: ["ADMIN","PRINCIPAL","HOD"],                      group: "Admin" },
  { key: "automation",        title: "Automation Rules",        route: "/admin/automation",       allowedRoles: ["ADMIN"],                                        group: "Admin" },
  { key: "lang-prefs",        title: "Language Preferences",    route: "/admin/language",         allowedRoles: ["ADMIN"],                                        group: "Admin" },
  { key: "integrations",      title: "Integrations",            route: "/integrations",           allowedRoles: ["ADMIN"],                                        group: "Admin" },
  { key: "promotion",         title: "Student Promotion",       route: "/admin/promotion",        allowedRoles: ["ADMIN","HOD","PRINCIPAL"],                      group: "Admin" },
  { key: "data-exports",      title: "Data Exports",            route: "/admin/exports",          allowedRoles: ["ADMIN","HOD","PRINCIPAL","DEAN"],               group: "Admin" },
  { key: "result-analysis",   title: "Result Analysis",         route: "/admin/results",          allowedRoles: ["ADMIN","PRINCIPAL","HOD","DEAN"],               group: "Admin" },

  // ── TEACHER PORTAL ────────────────────────────────────────────────────────

  { key: "teacher-home",      title: "Dashboard",               route: "/dashboard",              allowedRoles: ["FACULTY","HOD","COUNSELLOR"],                   group: "Teacher" },
  { key: "take-attendance",   title: "Take Attendance",         route: "/attendance",             allowedRoles: ["FACULTY","HOD","COUNSELLOR"],                   group: "Teacher" },
  { key: "mark-attendance",   title: "Mark Attendance",         route: "/teacher/mark-attendance", allowedRoles: ["FACULTY","HOD"],                                group: "Teacher" },
  { key: "call-panel",        title: "Manual Call Panel",       route: "/teacher/call-panel",     allowedRoles: ["FACULTY","HOD"],                                group: "Teacher" },
  { key: "my-classes",        title: "My Classes",              route: "/teacher/classes",        allowedRoles: ["FACULTY","HOD"],                                group: "Teacher" },
  { key: "teacher-assign",    title: "Assignments",             route: "/teacher/assignments",    allowedRoles: ["FACULTY","HOD"],                                group: "Teacher" },
  { key: "assign-intel",      title: "Assignment Intelligence", route: "/teacher/assign-intel",   allowedRoles: ["FACULTY","HOD"],                                group: "Teacher" },
  { key: "attend-summary",    title: "Attendance Summary",      route: "/teacher/attend-summary", allowedRoles: ["FACULTY","HOD","COUNSELLOR"],                   group: "Teacher" },
  { key: "upload-results",    title: "Upload Results",          route: "/teacher/upload-results", allowedRoles: ["FACULTY","HOD"],                                group: "Teacher" },
  { key: "marks-entry",       title: "Marks Entry",             route: "/teacher/marks-entry",    allowedRoles: ["FACULTY","HOD"],                                group: "Teacher" },
  { key: "ia-vtu-marks",      title: "IA / VTU Marks",          route: "/teacher/ia-marks",       allowedRoles: ["FACULTY","HOD"],                                group: "Teacher" },
  { key: "teacher-announce",  title: "Announcements",           route: "/teacher/announcements",  allowedRoles: ["FACULTY","HOD","COUNSELLOR"],                   group: "Teacher" },
  { key: "teacher-schedule",  title: "Schedule",                route: "/teacher/schedule",       allowedRoles: ["FACULTY","HOD","COUNSELLOR"],                   group: "Teacher" },
  { key: "teacher-profile",   title: "Profile",                 route: "/teacher/profile",        allowedRoles: ["FACULTY","HOD","COUNSELLOR"],                   group: "Teacher" },
  { key: "gen-reports",       title: "Generate Reports",        route: "/teacher/reports",        allowedRoles: ["FACULTY","HOD"],                                group: "Teacher" },
  { key: "vtu-teacher",       title: "VTU Registration",        route: "/teacher/vtu",            allowedRoles: ["FACULTY","HOD"],                                group: "Teacher" },
  { key: "perf-drop",         title: "Performance Drop Alert",  route: "/teacher/perf-drop",      allowedRoles: ["FACULTY","HOD","COUNSELLOR"],                   group: "Teacher" },
  { key: "grievance-t",       title: "Grievance Cases",         route: "/grievance",              allowedRoles: ["FACULTY","HOD","COUNSELLOR"],                   group: "Teacher" },
  { key: "mentorship-t",      title: "Mentorship",              route: "/mentorship",             allowedRoles: ["FACULTY","HOD","COUNSELLOR"],                   group: "Teacher" },

  // ── STUDENT PORTAL ────────────────────────────────────────────────────────

  { key: "stu-dashboard",     title: "Dashboard",               route: "/student/dashboard",      allowedRoles: ["STUDENT"],                                      group: "Student" },
  { key: "stu-courses",       title: "Courses",                 route: "/student/courses",        allowedRoles: ["STUDENT"],                                      group: "Student" },
  { key: "stu-learn",         title: "Learn (LMS)",             route: "/student/learn/CS501",    allowedRoles: ["STUDENT"],                                      group: "Student" },
  { key: "stu-schedule",      title: "Schedule",                route: "/student/schedule",       allowedRoles: ["STUDENT"],                                      group: "Student" },
  { key: "stu-results",       title: "Results Portal",          route: "/student/results",        allowedRoles: ["STUDENT"],                                      group: "Student" },
  { key: "stu-attendance",    title: "Attendance",              route: "/student/attendance",     allowedRoles: ["STUDENT"],                                      group: "Student" },
  { key: "stu-assignments",   title: "Assignments",             route: "/student/assignments",    allowedRoles: ["STUDENT"],                                      group: "Student" },
  { key: "stu-announce",      title: "Announcements",           route: "/student/announcements",  allowedRoles: ["STUDENT"],                                      group: "Student" },
  { key: "stu-jobs",          title: "Job Portal",              route: "/student/jobs",           allowedRoles: ["STUDENT"],                                      group: "Student" },
  { key: "stu-placement",     title: "Placement",               route: "/student/placement",      allowedRoles: ["STUDENT"],                                      group: "Student" },
  { key: "stu-fees",          title: "Fees & Scholarships",     route: "/student/fees",           allowedRoles: ["STUDENT"],                                      group: "Student" },
  { key: "stu-hostel",        title: "Hostel & Transport",      route: "/student/hostel",         allowedRoles: ["STUDENT"],                                      group: "Student" },
  { key: "stu-chatbot",       title: "Ask Ed8AI",                route: "/student/chatbot",        allowedRoles: ["STUDENT"],                                      group: "Student" },
  { key: "stu-hr",            title: "HR & Staff",              route: "/student/hr",             allowedRoles: ["STUDENT"],                                      group: "Student" },
  { key: "stu-study-plan",    title: "Study Plan",              route: "/student/study-plan",     allowedRoles: ["STUDENT"],                                      group: "Student" },
  { key: "stu-revision",      title: "Revision Plan",           route: "/student/revision",       allowedRoles: ["STUDENT"],                                      group: "Student" },
  { key: "stu-exam-prep",     title: "Exam Prep & Wellness",    route: "/student/exam-prep",      allowedRoles: ["STUDENT"],                                      group: "Student" },
  { key: "stu-counselor",     title: "Book Counselor",          route: "/student/counselor",      allowedRoles: ["STUDENT"],                                      group: "Student" },
  { key: "stu-documents",     title: "Documents",               route: "/student/documents",      allowedRoles: ["STUDENT"],                                      group: "Student" },
  { key: "stu-vtu",           title: "VTU Status",              route: "/student/vtu",            allowedRoles: ["STUDENT"],                                      group: "Student" },
  { key: "stu-profile",       title: "Profile",                 route: "/student/profile",        allowedRoles: ["STUDENT"],                                      group: "Student" },

  // ── PARENT PORTAL ─────────────────────────────────────────────────────────

  { key: "par-dashboard",     title: "Dashboard",               route: "/parent/dashboard",       allowedRoles: ["PARENT"],                                       group: "Parent" },
  { key: "par-children",      title: "My Children",             route: "/parent/children",        allowedRoles: ["PARENT"],                                       group: "Parent" },
  { key: "par-attendance",    title: "Attendance",              route: "/parent/attendance",      allowedRoles: ["PARENT"],                                       group: "Parent" },
  { key: "par-results",       title: "Results",                 route: "/parent/results",         allowedRoles: ["PARENT"],                                       group: "Parent" },
  { key: "par-fees",          title: "Fees",                    route: "/parent/fees",            allowedRoles: ["PARENT"],                                       group: "Parent" },
  { key: "par-vtu",           title: "VTU Registration",        route: "/parent/vtu",             allowedRoles: ["PARENT"],                                       group: "Parent" },
  { key: "par-calls",         title: "AI Call History",         route: "/parent/calls",           allowedRoles: ["PARENT"],                                       group: "Parent" },
  { key: "par-announce",      title: "Announcements",           route: "/parent/announcements",   allowedRoles: ["PARENT"],                                       group: "Parent" },
  { key: "par-messages",      title: "Messages",                route: "/parent/messages",        allowedRoles: ["PARENT"],                                       group: "Parent" },
  { key: "par-scholarship",   title: "Scholarship Eligibility", route: "/parent/scholarship",     allowedRoles: ["PARENT"],                                       group: "Parent" },
  { key: "par-chatbot",       title: "Ask Ed8AI",                route: "/parent/chatbot",         allowedRoles: ["PARENT"],                                       group: "Parent" },

  // ── TEACHER CHATBOT ────────────────────────────────────────────────────────
  { key: "tea-chatbot",       title: "Ask Ed8AI",                route: "/teacher/chatbot",        allowedRoles: ["FACULTY","HOD"],                                group: "Teacher" },
  { key: "tea-authoring",     title: "Module Authoring (AI)",   route: "/teacher/authoring/CS501",allowedRoles: ["FACULTY","HOD"],                                group: "Teacher" },

  // ── ADMIN CHATBOT SESSIONS ────────────────────────────────────────────────
  { key: "admin-chatbot",     title: "Chat Sessions",           route: "/admin/chatbot",          allowedRoles: ["ADMIN","PRINCIPAL"],                            group: "Admin" },

  // ── OBE / CO-PO ATTAINMENT ─────────────────────────────────────────────────
  { key: "obe-attainment",    title: "OBE / CO-PO Attainment",  route: "/admin/obe",              allowedRoles: ["ADMIN","PRINCIPAL","DEAN","HOD"],               group: "Admin" },
  { key: "obe-course",        title: "CO-PO Mapping",           route: "/teacher/obe/CS501",      allowedRoles: ["FACULTY","HOD"],                                group: "Teacher" },

  // ── ADMISSION PORTAL (applicant) ──────────────────────────────────────────
  { key: "adm-dashboard",     title: "Dashboard",               route: "/admit/dashboard",        allowedRoles: ["APPLICANT"],                                    group: "Admission" },
  { key: "adm-apply",         title: "My Application",          route: "/admit/apply",            allowedRoles: ["APPLICANT"],                                    group: "Admission" },
  { key: "adm-documents",     title: "My Documents",            route: "/admit/documents",        allowedRoles: ["APPLICANT"],                                    group: "Admission" },
  { key: "adm-status",        title: "Application Status",      route: "/admit/status",           allowedRoles: ["APPLICANT"],                                    group: "Admission" },
  { key: "adm-pay",           title: "Admission Fee",           route: "/admit/pay",              allowedRoles: ["APPLICANT"],                                    group: "Admission" },

  // ── ADMISSIONS (admin review) ─────────────────────────────────────────────
  { key: "admissions-admin",  title: "Admissions",              route: "/admin/admissions",       allowedRoles: ["ADMIN","PRINCIPAL","DEAN"],                     group: "Admin" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function navForRole(role: UserRole): NavItem[] {
  return navItems.filter((item) => item.allowedRoles.includes(role));
}

// Legacy compat — used by old dashboard pages
export interface PhaseModule {
  key: string;
  title: string;
  description: string;
  route: string;
  phase: number;
  allowedRoles: UserRole[];
  checklist: string[];
}

export const phaseModules: PhaseModule[] = navItems.map((n) => ({
  key: n.key,
  title: n.title,
  description: n.title,
  route: n.route,
  phase: 1,
  allowedRoles: n.allowedRoles,
  checklist: [],
}));
