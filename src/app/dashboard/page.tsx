export const metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Today&apos;s Tasks
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Your upcoming assignments, quizzes, and deadlines.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white p-12 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
          <span className="text-2xl">📋</span>
        </div>
        <h2 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          No tasks yet
        </h2>
        <p className="mt-1 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Tasks from UVEC and Google Classroom will appear here once data
          ingestion is set up in Phase 2.
        </p>
      </div>
    </div>
  );
}
