// Sync engine for Task Aggregator
// Phase 3: Scaffolding only

import { Task } from './types/task';
import { GClassroomService } from '../services/gclassroom-service';
import { parseGClassroomResponse } from './parsers/gclassroom-parser';
import { getUVECTasks } from './actions/auth'; // Placeholder for UVEC source

interface SyncEngineConfig {
  gclassroomToken: string;
}

  let uvecTasks: Task[] = [];
  let gclassroomTasks: Task[] = [];

  try {
    const fetched = await getUVECTasks();
    uvecTasks = Array.isArray(fetched) ? [...fetched] : [];
  } catch {
    uvecTasks = [];
  }

  if (config?.gclassroomToken) {
    try {
      const gclassroom = new GClassroomService({ accessToken: config.gclassroomToken });
      const courses = await gclassroom.getCourses();
      const allCourseWork: unknown[] = [];
      for (const course of courses) {
        const courseWork = await gclassroom.getCourseWork(course.id);
        allCourseWork.push(...courseWork);
      }
      gclassroomTasks = parseGClassroomResponse({ courseWork: allCourseWork });
    } catch {
      gclassroomTasks = [];
    }
  }

  // Merge and deduplicate tasks by id
  const merged = [...uvecTasks, ...gclassroomTasks];
  const uniqueTasks = Array.from(
    new Map(merged.map((t) => [t.id, t])).values()
  );
  return uniqueTasks;
