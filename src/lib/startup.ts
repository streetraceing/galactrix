export class StartupTimeoutError extends Error {
  constructor() {
    super('Application startup timed out');
    this.name = 'StartupTimeoutError';
  }
}

/** Read-only startup work has a deadline; late replies cannot mutate UI state. */
export async function loadStartupData<Jobs, Snapshot>(
  loadJobs: () => Promise<Jobs>,
  loadSnapshot: () => Promise<Snapshot>,
  timeoutMs = 15_000,
): Promise<{ jobs: Jobs; snapshot: Snapshot }> {
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      expired = true;
      reject(new StartupTimeoutError());
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      (async () => {
        // Keep jobs-before-snapshot ordering so completed responses are not lost.
        const jobs = await loadJobs();
        if (expired) throw new StartupTimeoutError();
        const snapshot = await loadSnapshot();
        return { jobs, snapshot };
      })(),
      deadline,
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
