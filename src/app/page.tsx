export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <main className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Task Aggregator
        </h1>
        <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
          All your university tasks from UVEC and Google Classroom in one place.
        </p>
        <div className="mt-4 rounded-lg border border-zinc-200 bg-white px-6 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Phase 0 scaffolding complete. Authentication coming in Phase 1.
          </p>
        </div>
      </main>
    </div>
  );
}
