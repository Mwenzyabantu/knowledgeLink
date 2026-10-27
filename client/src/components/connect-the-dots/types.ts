import type { UseMutationResult } from "@tanstack/react-query";
import type {
  ConnectCourseWithTopics,
  ConnectMapDetail,
  ConnectMapSummary,
} from "@shared/schema";

export type CourseInput = {
  career: string;
  program: string;
  courseName: string;
  topics: string[];
};

export type CreateMapInput = {
  courseId: string;
  entryPath: "topics" | "known_use";
  knownUse?: string;
};

export type LandingProps = {
  courses: ConnectCourseWithTopics[];
  coursesLoading: boolean;
  coursesError: string | null;
  retryCourses: () => void;
  maps: ConnectMapSummary[];
  mapsLoading: boolean;
  mapsError: string | null;
  retryMaps: () => void;
  createCourse: UseMutationResult<ConnectCourseWithTopics, Error, CourseInput, unknown>;
  updateCourse: UseMutationResult<ConnectCourseWithTopics, Error, { id: string; input: CourseInput }, unknown>;
  createMap: UseMutationResult<ConnectMapDetail, Error, CreateMapInput, unknown>;
  deleteMap: UseMutationResult<{ ok: true }, Error, string, unknown>;
};
