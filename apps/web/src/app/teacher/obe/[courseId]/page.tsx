import { ObeCoursePage } from "@/features/obe/obe-course";

export const metadata = { title: "OBE CO-PO Mapping — Ed8AI" };

export default function ObeTeacherPage({ params }: { params: { courseId: string } }) {
  return <ObeCoursePage courseId={params.courseId} />;
}
