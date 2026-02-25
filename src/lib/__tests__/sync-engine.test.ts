// Integration tests for sync engine

import { syncTasks } from "../sync-engine";

describe("syncTasks", () => {
  it("should return empty tasks and no errors when called without config", async () => {
    const result = await syncTasks();
    expect(result.tasks).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it("should return empty tasks when config has no sources", async () => {
    const result = await syncTasks({});
    expect(result.tasks).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it("should return SyncResult shape", async () => {
    const result = await syncTasks();
    expect(result).toHaveProperty("tasks");
    expect(result).toHaveProperty("errors");
    expect(Array.isArray(result.tasks)).toBe(true);
    expect(Array.isArray(result.errors)).toBe(true);
  });
});
