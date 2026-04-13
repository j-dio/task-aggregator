"use client";

import { Suspense, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";

const SESSION_KEY_TODO_DISPLAY = "todoDisplayLimit";
const SESSION_KEY_DONE_DISPLAY = "doneDisplayLimit";
const SESSION_KEY_INPROGRESS_DISPLAY = "inProgressDisplayLimit";

function readTodoDisplayLimit(): number {
  if (typeof window === "undefined") return 7;
  const stored = sessionStorage.getItem(SESSION_KEY_TODO_DISPLAY);
  const parsed = stored ? parseInt(stored, 10) : NaN;
  return isNaN(parsed) ? 7 : parsed;
}

function readDoneDisplayLimit(): number {
  if (typeof window === "undefined") return 7;
  const stored = sessionStorage.getItem(SESSION_KEY_DONE_DISPLAY);
  const parsed = stored ? parseInt(stored, 10) : NaN;
  return isNaN(parsed) ? 7 : parsed;
}

function readInProgressDisplayLimit(): number {
  if (typeof window === "undefined") return 7;
  const stored = sessionStorage.getItem(SESSION_KEY_INPROGRESS_DISPLAY);
  const parsed = stored ? parseInt(stored, 10) : NaN;
  return isNaN(parsed) ? 7 : parsed;
}
import { useTasks, type TaskFilters } from "@/hooks/use-tasks";
import { useCourses } from "@/hooks/use-courses";
import { useSync } from "@/hooks/use-sync";
import { useAutoSync } from "@/hooks/use-auto-sync";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { useActionBoard } from "@/hooks/use-action-board";
import { useUpNext } from "@/hooks/use-up-next";
import { useFocusMode } from "@/hooks/use-focus-mode";
import { ActionBoard } from "@/components/action-board";
import { FirstSyncBanner } from "@/components/first-sync-banner";
import { ErrorBoundary } from "@/components/error-boundary";
import { TaskFilters as FilterBar } from "@/components/task-filters";
import { TaskList } from "@/components/task-list";
import { UpNextWidget } from "@/components/up-next-widget";
import { FocusModeToggle } from "@/components/focus-mode-toggle";
import { EmptyState } from "@/components/empty-state";
import { ViewToggle } from "@/components/view-toggle";
import { CustomTaskModal } from "@/components/custom-task-modal";
import { OnboardingTour } from "@/components/onboarding-tour";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ClipboardList, Plus } from "lucide-react";
import { useTaskActions } from "@/hooks/use-task-actions";
import type { TaskWithCourse } from "@/types/task";

function DashboardContent() {
  const searchParams = useSearchParams();
  const { mutate: sync, isPending: isSyncing } = useSync();
  const { archivePastDue } = useTaskActions();
  const [focusMode, setFocusMode] = useState(false);
  const [customTaskModalOpen, setCustomTaskModalOpen] = useState(false);
  const [customTaskToEdit, setCustomTaskToEdit] = useState<
    TaskWithCourse | undefined
  >(undefined);

  const handleCustomTaskModalOpenChange = useCallback((open: boolean) => {
    setCustomTaskModalOpen(open);
    if (!open) setCustomTaskToEdit(undefined);
  }, []);

  const openNewCustomTask = useCallback(() => {
    setCustomTaskToEdit(undefined);
    setCustomTaskModalOpen(true);
  }, []);

  const requestEditCustomTask = useCallback((task: TaskWithCourse) => {
    setCustomTaskToEdit(task);
    setCustomTaskModalOpen(true);
  }, []);

  const filters: TaskFilters = {};
  const source = searchParams.get("source");
  const type = searchParams.get("type");
  const course = searchParams.get("course");
  const status = searchParams.get("status");
  if (source && source !== "all")
    filters.source = source as TaskFilters["source"];
  if (type && type !== "all") filters.type = type as TaskFilters["type"];
  if (course && course !== "all") filters.courseId = course;
  if (status && status !== "all")
    filters.status = status as TaskFilters["status"];

  const { data: tasks, isLoading: tasksLoading } = useTasks(filters);
  const { data: courses } = useCourses();
  useAutoSync();
  const { bind, pullDistance, isReady } = usePullToRefresh({
    onRefresh: async () => {
      sync();
    },
    disabled: isSyncing,
  });

  const [todoDisplayLimit, setTodoDisplayLimit] =
    useState<number>(readTodoDisplayLimit);
  const handleShowMoreTodo = useCallback(() => {
    setTodoDisplayLimit((l) => {
      const next = l + 7;
      sessionStorage.setItem(SESSION_KEY_TODO_DISPLAY, String(next));
      return next;
    });
  }, []);
  const handleShowLessTodo = useCallback(() => {
    setTodoDisplayLimit((l) => {
      const next = Math.max(l - 7, 7);
      if (next === 7) {
        sessionStorage.removeItem(SESSION_KEY_TODO_DISPLAY);
      } else {
        sessionStorage.setItem(SESSION_KEY_TODO_DISPLAY, String(next));
      }
      return next;
    });
  }, []);

  const [doneDisplayLimit, setDoneDisplayLimit] =
    useState<number>(readDoneDisplayLimit);
  const handleShowMoreDone = useCallback(() => {
    setDoneDisplayLimit((l) => {
      const next = l + 7;
      sessionStorage.setItem(SESSION_KEY_DONE_DISPLAY, String(next));
      return next;
    });
  }, []);
  const handleShowLessDone = useCallback(() => {
    setDoneDisplayLimit((l) => {
      const next = Math.max(l - 7, 7);
      if (next === 7) {
        sessionStorage.removeItem(SESSION_KEY_DONE_DISPLAY);
      } else {
        sessionStorage.setItem(SESSION_KEY_DONE_DISPLAY, String(next));
      }
      return next;
    });
  }, []);

  const [inProgressDisplayLimit, setInProgressDisplayLimit] = useState<number>(
    readInProgressDisplayLimit,
  );
  const handleShowMoreInProgress = useCallback(() => {
    setInProgressDisplayLimit((l) => {
      const next = l + 7;
      sessionStorage.setItem(SESSION_KEY_INPROGRESS_DISPLAY, String(next));
      return next;
    });
  }, []);
  const handleShowLessInProgress = useCallback(() => {
    setInProgressDisplayLimit((l) => {
      const next = Math.max(l - 7, 7);
      if (next === 7) {
        sessionStorage.removeItem(SESSION_KEY_INPROGRESS_DISPLAY);
      } else {
        sessionStorage.setItem(SESSION_KEY_INPROGRESS_DISPLAY, String(next));
      }
      return next;
    });
  }, []);

  const {
    todo,
    inProgress,
    done,
    todoHasMore,
    doneHasMore,
    inProgressHasMore,
  } = useActionBoard(
    tasks ?? [],
    todoDisplayLimit,
    doneDisplayLimit,
    inProgressDisplayLimit,
  );
  const upNextTask = useUpNext(tasks ?? []);
  const focusTasks = useFocusMode(tasks ?? []);

  return (
    <div className="flex flex-col gap-6" {...bind}>
      <div className="lg:hidden" aria-live="polite" aria-atomic="true">
        {(isSyncing || pullDistance > 0) && (
          <p className="text-muted-foreground text-center text-xs">
            {isSyncing
              ? "Syncing..."
              : isReady
                ? "Release to sync"
                : "Pull to refresh"}
          </p>
        )}
      </div>

      {/* First-sync banner — only visible to new users with stale UVEC tasks */}
      {tasks && tasks.length > 0 && (
        <FirstSyncBanner
          tasks={tasks}
          onArchive={(taskIds) => archivePastDue.mutate(taskIds)}
          isArchiving={archivePastDue.isPending}
        />
      )}

      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          {focusMode && (
            <p className="text-muted-foreground mt-0.5 text-[13px]">
              Tasks due within 24 hours.
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            className="skeu-btn h-8 gap-1.5 px-3 text-[13px] font-medium text-white"
            onClick={openNewCustomTask}
          >
            <Plus className="size-3.5" />
            New task
          </Button>
          <FocusModeToggle
            enabled={focusMode}
            onToggle={() => setFocusMode(!focusMode)}
          />
        </div>
      </div>

      {/* Toolbar: view toggle (mobile) + filters in one row */}
      <div className="flex flex-wrap items-center gap-2">
        <ViewToggle />
        <FilterBar courses={courses ?? []} />
      </div>

      {/* Content */}
      {tasksLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <div className="flex gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex-1 space-y-3">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
        </div>
      ) : tasks && tasks.length > 0 ? (
        focusMode ? (
          <div className="space-y-4">
            {focusTasks.length > 0 ? (
              <TaskList
                tasks={focusTasks}
                onRequestEditCustomTask={requestEditCustomTask}
              />
            ) : (
              <EmptyState
                icon={ClipboardList}
                title="No urgent tasks"
                description="You have no tasks due within the next 24 hours."
              />
            )}
          </div>
        ) : (
          <>
            <UpNextWidget
              task={upNextTask}
              onRequestEditCustomTask={requestEditCustomTask}
            />
            <ErrorBoundary>
              <ActionBoard
                todoTasks={todo}
                inProgressTasks={inProgress}
                doneTasks={done}
                onShowMoreTodo={todoHasMore ? handleShowMoreTodo : undefined}
                onShowLessTodo={
                  todoDisplayLimit > 7 ? handleShowLessTodo : undefined
                }
                onShowMoreDone={doneHasMore ? handleShowMoreDone : undefined}
                onShowLessDone={
                  doneDisplayLimit > 7 ? handleShowLessDone : undefined
                }
                onShowMoreInProgress={
                  inProgressHasMore ? handleShowMoreInProgress : undefined
                }
                onShowLessInProgress={
                  inProgressDisplayLimit > 7
                    ? handleShowLessInProgress
                    : undefined
                }
                onRequestEditCustomTask={requestEditCustomTask}
              />
            </ErrorBoundary>
          </>
        )
      ) : (
        <EmptyState
          icon={ClipboardList}
          title="No tasks yet"
          description="Connect UVEC or Google Classroom in Settings to start pulling in your tasks."
          action={{ label: "Go to Settings", href: "/dashboard/settings" }}
        />
      )}

      <CustomTaskModal
        open={customTaskModalOpen}
        onOpenChange={handleCustomTaskModalOpenChange}
        task={customTaskToEdit}
      />
      <OnboardingTour />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="flex flex-col gap-6">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-24 w-full" />
            <div className="flex gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex-1 space-y-3">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ))}
            </div>
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </ErrorBoundary>
  );
}
