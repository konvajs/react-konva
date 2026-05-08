// Synthetic gated-snapshot store for §7's snapshot-race regression test.
//
// Mimics mobx-react-lite's race condition where a tracked dependency changes
// but the queued reaction handler that bumps the useSyncExternalStore snapshot
// version is gated out (mobx's `shouldCompute` check returns false). Driving
// `set(patch, { skipBump: true })` reproduces the same state-without-version-bump
// pattern that triggers React's `bailoutOnAlreadyFinishedWork` and discards the
// new render — leaving stale Konva nodes on canvas.
//
// Crucial detail: `getSnapshot()` returns ONLY the version number — not the
// data object. mobx-react-lite does the same thing (returns a `Symbol` from
// `adm.stateVersion`) so that React's `Object.is(prev, next)` snapshot check
// is on the version alone, not on the data. Reading the actual data goes
// through `getData()`, which is a closure read — not subscribed.

type Listener = () => void;

export interface BuggyStoreData {
  selected: boolean;
  focusedId: string | null;
}

export interface BuggyStore {
  getSnapshot(): number;
  getData(): BuggyStoreData;
  subscribe(cb: Listener): () => void;
  set(
    patch: Partial<BuggyStoreData>,
    opts?: { skipBump?: boolean }
  ): void;
  listenerCount(): number;
}

export function makeBuggyStore(): BuggyStore {
  let data: BuggyStoreData = { selected: false, focusedId: null };
  let version = 0;
  const listeners = new Set<Listener>();

  return {
    getSnapshot: () => version,
    getData: () => data,
    subscribe(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    set(patch, opts = {}) {
      data = { ...data, ...patch };
      if (!opts.skipBump) version++;
      listeners.forEach((l) => l());
    },
    listenerCount: () => listeners.size,
  };
}
