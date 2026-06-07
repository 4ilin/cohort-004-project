import { eq, and, sql } from "drizzle-orm";
import { db } from "~/db";
import { courseRatings, courses } from "~/db/schema";
import { isUserEnrolled } from "~/services/enrollmentService";

// ─── Rating Service ───
// Handles 5-star course ratings by enrolled students: one rating per
// student per course (re-rating updates the existing record), plus
// aggregate average/count used wherever a course is displayed.
// Uses positional parameters (project convention).

export function getUserCourseRating(userId: number, courseId: number) {
  return db
    .select()
    .from(courseRatings)
    .where(
      and(
        eq(courseRatings.userId, userId),
        eq(courseRatings.courseId, courseId)
      )
    )
    .get();
}

export function getCourseRatingSummary(courseId: number) {
  const result = db
    .select({
      averageRating: sql<number | null>`avg(${courseRatings.rating})`,
      ratingCount: sql<number>`count(*)`,
    })
    .from(courseRatings)
    .where(eq(courseRatings.courseId, courseId))
    .get();

  return {
    averageRating: result?.averageRating ?? null,
    ratingCount: result?.ratingCount ?? 0,
  };
}

export function rateCourse(userId: number, courseId: number, rating: number) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Rating must be an integer between 1 and 5");
  }

  const course = db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId))
    .get();
  if (!course) {
    throw new Error("Course not found");
  }

  if (!isUserEnrolled(userId, courseId)) {
    throw new Error("You must be enrolled in this course to rate it");
  }

  const existing = getUserCourseRating(userId, courseId);
  if (existing) {
    return db
      .update(courseRatings)
      .set({ rating, updatedAt: new Date().toISOString() })
      .where(eq(courseRatings.id, existing.id))
      .returning()
      .get();
  }

  return db
    .insert(courseRatings)
    .values({ userId, courseId, rating })
    .returning()
    .get();
}