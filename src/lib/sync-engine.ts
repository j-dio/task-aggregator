// Sync engine for Task Aggregator
// Phase 3: Scaffolding only

import { Task } from './types/task';
import { GClassroomService } from '../services/gclassroom-service';
import { parseGClassroomResponse } from './parsers/gclassroom-parser';
import { getUVECTasks } from './actions/auth'; // Placeholder for UVEC source

interface SyncEngineConfig {
  gclassroomToken: string;
}

export async function syncTasks(config?: SyncEngineConfig): Promise<Task[]> {
  const results: Task[][] = [];
  // Sync UVEC tasks
  try {
    const uvecTasks = await getUVECTasks();
    results.push(Array.isArray(uvecTasks) ? uvecTasks : []);
  } catch {
    results.push([]);
  }
  // Sync Google Classroom tasks
  if (config?.gclassroomToken) {
    try {
      const gclassroom = new GClassroomService({ accessToken: config.gclassroomToken });
      const courses = await gclassroom.getCourses();
      const allCourseWork: any[] = [];
      for (const course of courses) {
        const courseWork = await gclassroom.getCourseWork(course.id);
        allCourseWork.push(...courseWork);
      }
      const gclassroomTasks = parseGClassroomResponse({ courseWork: allCourseWork });
      results.push(gclassroomTasks);
    } catch {
      results.push([]);
    }
  }
  // Merge and deduplicate tasks by id
  const merged = results.flat();
  const uniqueTasks = Array.from(
    new Map(merged.map((t) => [t.id, t])).values()
  );
  return uniqueTasks;
}
}
