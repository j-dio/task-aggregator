import type { TaskWithCourse } from "@/types/task";
import { TaskCard } from "@/components/task-card";

interface TaskListProps {
  tasks: TaskWithCourse[];
}

export function TaskList({ tasks }: TaskListProps) {
  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}
