import type { TaskWithCourse } from "@/types/task";
import { TaskCard } from "@/components/task-card";

interface TaskListProps {
  tasks: TaskWithCourse[];
  onRequestEditCustomTask?: (task: TaskWithCourse) => void;
}

export function TaskList({
  tasks,
  onRequestEditCustomTask,
}: TaskListProps) {
  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onRequestEditCustomTask={onRequestEditCustomTask}
        />
      ))}
    </div>
  );
}
