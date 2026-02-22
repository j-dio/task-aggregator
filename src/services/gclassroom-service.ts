// Google Classroom API client for Task Aggregator
// Phase 3: Scaffolding only

// Removed unused z import
import {
  GClassroomCourseSchema,
  GClassroomCourseWorkSchema,
  GClassroomAnnouncementSchema,
} from "../lib/parsers/gclassroom-parser";

// Placeholder for Google Classroom API endpoints
interface GClassroomApiConfig {
  accessToken: string;
}

const BASE_URL = "https://classroom.googleapis.com/v1";

export class GClassroomService {
  private accessToken: string;

  constructor(config: GClassroomApiConfig) {
    this.accessToken = config.accessToken;
  }

  private async fetch<T>(endpoint: string): Promise<T> {
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
      if (!res.ok) {
        throw new Error(`Google Classroom API error: ${res.status}`);
      }
      return await res.json();
    } catch {
      // Do not expose internal error details
      throw new Error("Failed to fetch Google Classroom data");
    }
  }

  async getCourses(): Promise<GClassroomCourse[]> {
    const data = await this.fetch<{ courses: unknown[] }>("/courses");
    if (!data.courses) return [];
    return data.courses
      .map((course) => {
        try {
          return GClassroomCourseSchema.parse(course);
        } catch {
          return null;
        }
      })
      .filter(Boolean) as GClassroomCourse[];
  }

  async getCourseWork(courseId: string): Promise<GClassroomCourseWork[]> {
    const data = await this.fetch<{ courseWork: unknown[] }>(
      `/courses/${courseId}/courseWork`,
    );
    if (!data.courseWork) return [];
    return data.courseWork
      .map((cw) => {
        try {
          return GClassroomCourseWorkSchema.parse(cw);
        } catch {
          return null;
        }
      })
      .filter(Boolean) as GClassroomCourseWork[];
  }

  async getAnnouncements(courseId: string): Promise<GClassroomAnnouncement[]> {
    const data = await this.fetch<{ announcements: unknown[] }>(
      `/courses/${courseId}/announcements`,
    );
    if (!data.announcements) return [];
    return data.announcements
      .map((ann) => {
        try {
          return GClassroomAnnouncementSchema.parse(ann);
        } catch {
          return null;
        }
      })
      .filter(Boolean) as GClassroomAnnouncement[];
  }
}

// Zod schemas will be added in a later commit
