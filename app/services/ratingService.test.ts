import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";

let testDb: ReturnType<typeof createTestDb>;
let base: ReturnType<typeof seedBaseData>;

vi.mock("~/db", () => ({
  get db() {
    return testDb;
  },
}));

// Import after mock so the module picks up our test db
import {
  rateCourse,
  getUserCourseRating,
  getCourseRatingSummary,
} from "./ratingService";
import { enrollUser } from "./enrollmentService";

function createStudent(email: string) {
  return testDb
    .insert(schema.users)
    .values({ name: "Another Student", email, role: schema.UserRole.Student })
    .returning()
    .get();
}

describe("ratingService", () => {
  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
    enrollUser(base.user.id, base.course.id, false, false);
  });

  describe("rateCourse", () => {
    it("creates a rating for an enrolled user", () => {
      const rating = rateCourse(base.user.id, base.course.id, 4);

      expect(rating).toBeDefined();
      expect(rating.userId).toBe(base.user.id);
      expect(rating.courseId).toBe(base.course.id);
      expect(rating.rating).toBe(4);
      expect(rating.createdAt).toBeDefined();
    });

    it("updates the existing rating when the user rates again", () => {
      const first = rateCourse(base.user.id, base.course.id, 2);
      const second = rateCourse(base.user.id, base.course.id, 5);

      expect(second.id).toBe(first.id);
      expect(second.rating).toBe(5);

      const summary = getCourseRatingSummary(base.course.id);
      expect(summary.ratingCount).toBe(1);
      expect(summary.averageRating).toBe(5);
    });

    it("throws when the user is not enrolled", () => {
      const stranger = createStudent("stranger@example.com");

      expect(() => rateCourse(stranger.id, base.course.id, 5)).toThrowError(
        "You must be enrolled in this course to rate it"
      );
    });

    it("throws for a non-existent course", () => {
      expect(() => rateCourse(base.user.id, 9999, 5)).toThrowError(
        "Course not found"
      );
    });

    it.each([0, 6, -1, 3.5])("throws for invalid rating %s", (value) => {
      expect(() => rateCourse(base.user.id, base.course.id, value)).toThrowError(
        "Rating must be an integer between 1 and 5"
      );
    });
  });

  describe("getUserCourseRating", () => {
    it("returns the user's rating when it exists", () => {
      rateCourse(base.user.id, base.course.id, 3);

      const rating = getUserCourseRating(base.user.id, base.course.id);
      expect(rating?.rating).toBe(3);
    });

    it("returns undefined when the user has not rated", () => {
      expect(getUserCourseRating(base.user.id, base.course.id)).toBeUndefined();
    });
  });

  describe("getCourseRatingSummary", () => {
    it("returns null average and zero count with no ratings", () => {
      const summary = getCourseRatingSummary(base.course.id);

      expect(summary.averageRating).toBeNull();
      expect(summary.ratingCount).toBe(0);
    });

    it("averages ratings across users", () => {
      const other = createStudent("other@example.com");
      enrollUser(other.id, base.course.id, false, false);

      rateCourse(base.user.id, base.course.id, 5);
      rateCourse(other.id, base.course.id, 2);

      const summary = getCourseRatingSummary(base.course.id);
      expect(summary.averageRating).toBe(3.5);
      expect(summary.ratingCount).toBe(2);
    });

    it("only counts ratings for the given course", () => {
      const otherCourse = testDb
        .insert(schema.courses)
        .values({
          title: "Other Course",
          slug: "other-course",
          description: "Another course",
          instructorId: base.instructor.id,
          categoryId: base.category.id,
          status: schema.CourseStatus.Published,
        })
        .returning()
        .get();
      enrollUser(base.user.id, otherCourse.id, false, false);
      rateCourse(base.user.id, otherCourse.id, 1);
      rateCourse(base.user.id, base.course.id, 5);

      const summary = getCourseRatingSummary(base.course.id);
      expect(summary.averageRating).toBe(5);
      expect(summary.ratingCount).toBe(1);
    });
  });
});