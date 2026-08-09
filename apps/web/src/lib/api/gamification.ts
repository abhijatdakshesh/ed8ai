/** Gamification — student achievements & leaderboard. Backend: /api/gamification */
import { apiGet } from "./client";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

export interface Badge { code: string; title: string; icon: string; description: string; earned: boolean; }
export interface GamificationProfile {
  usn: string; courseId: string; streak: number; learningHours: number; points: number;
  badges: Badge[]; earnedCount: number;
}
export interface LeaderboardRow { rank: number; usn: string; name: string; points: number; streak: number; isMe: boolean; }

const MOCK_PROFILE: GamificationProfile = {
  usn: "1RV21CS001", courseId: "CS501", streak: 6, learningHours: 18, points: 235, earnedCount: 4,
  badges: [
    { code: "FIRST_STEP", title: "First Step", icon: "👣", description: "Started learning", earned: true },
    { code: "STREAK_3", title: "3-Day Streak", icon: "🔥", description: "Learned 3 days in a row", earned: true },
    { code: "STREAK_7", title: "Week Warrior", icon: "⚡", description: "7-day learning streak", earned: false },
    { code: "HOURS_5", title: "Getting Serious", icon: "📚", description: "5+ learning hours", earned: true },
    { code: "HOURS_20", title: "Scholar", icon: "🎓", description: "20+ learning hours", earned: false },
  ],
};
const MOCK_BOARD: LeaderboardRow[] = [
  { rank: 1, usn: "1RV21CS002", name: "Priya Sharma", points: 210, streak: 9, isMe: false },
  { rank: 2, usn: "1RV21CS003", name: "Arjun Kumar", points: 150, streak: 6, isMe: false },
  { rank: 3, usn: "me", name: "You", points: 120, streak: 6, isMe: true },
  { rank: 4, usn: "1RV21CS006", name: "Sneha Reddy", points: 100, streak: 4, isMe: false },
  { rank: 5, usn: "1RV21CS007", name: "Mohammed Irfan", points: 55, streak: 2, isMe: false },
];

export function getProfile(courseId: string): Promise<GamificationProfile> {
  return USE_MOCKS ? Promise.resolve(MOCK_PROFILE) : apiGet<GamificationProfile>(`/api/gamification/profile/${courseId}`);
}
export function getLeaderboard(courseId: string): Promise<LeaderboardRow[]> {
  return USE_MOCKS ? Promise.resolve(MOCK_BOARD) : apiGet<LeaderboardRow[]>(`/api/gamification/leaderboard/${courseId}`);
}
