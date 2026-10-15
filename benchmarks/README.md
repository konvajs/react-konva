# Interaction performance

Count tests run in `npm test` and fail on extra work. The timing benchmark
compares elapsed time without noisy millisecond thresholds. All tests and both
benchmark variants use the same installed Konva.

## Required count tests

```sh
npm run test:performance
BROWSER=firefox npm run test:performance
BROWSER=webkit npm run test:performance
```

Install the selected Playwright browser first. Run development, production, and
profiling suites sequentially; they share Vite's dependency cache.

Each case measures three steps without `act()` or a test-imposed flush around
input. Native drag and resize must commit before dispatch returns. The fixture
checks committed state, node geometry, anchor positions, and DOM values. A stale
result cannot count as an optimization.

The 41 cases cover live resize and drag state above Stage, at the canvas root,
and in canvas leaves. Selection sizes range from one to 600 shapes. Other cases
include 1,000 changing DOM spans and a leaf beneath ten Groups beside 5,000
canvas shapes and 5,000 static DOM spans. Ordinary state updates, direct no-op
handlers, idle window movement, and native canvas movement are measured separately.
Moves dispatched over the canvas also exercise the content and window listeners.
Eight cases pass `runInAction` around the same React-state workloads to ensure the
custom wrapper adds no renders, commits, geometry work, or React flushes. The regular
MobX tests separately verify one reaction and one commit per renderer for a 100-node
drag or resize.

| Counter | Meaning |
| --- | --- |
| `canvasCommits`, `domCommits` | React Profiler callbacks for the two renderers. |
| `stateOwnerRenders` | Render calls in components that own changing state. |
| `transformerUpdates` | Calls to the Transformer's public `update()`. Cached node-change refreshes can bypass it; use `anchorSetAttrs` to compare actual layout work. |
| `transformerRefreshes`, `selectionBounds` | Actual `_update()` refreshes and `__getNodeRect()` selection measurements. When Konva provides `beginUpdateBatch()`, ordinary updates permit one of each and resize permits two, including Konva's gesture update. Multi-node drag permits one refresh and two bounds measurements. |
| `anchorSetAttrs` | Attribute writes through `setAttrs()` on Transformer anchors. |
| `nodeClientRects` | Selected shapes' `getClientRect()` calls. |
| `rendererFlushes` | Explicit calls through exported `KonvaRenderer.flushSyncWork`. |
| `eventBatches` | Calls to the Stage's native integration callback. |
| `customBatches` | Calls to the optional JSX wrapper, once per native batch when configured. |
| `domFlushes` | Public React DOM `flushSync` calls during measured input. |
| `handlers` | Application handler calls. |

Both renderers use their distributed production profiling builds. The fixture
asserts that profiling reports the initial mounts. One hundred leaf renders can
belong to one canvas commit; these are different counters.

Each state-changing step in this fixture permits one canvas commit. State above
Stage also permits one DOM commit and one explicit renderer flush through Stage's
existing DOM-to-canvas bridge. No-op and idle cases permit no commits, geometry
updates, or explicit renderer flushes.

A batch is scoped to a Konva listener. One browser event can reach several
listeners. In these fixtures, a resize move over the canvas permits three batches
and four DOM flushes, including the initial anchor drag cancellation. A drag move
over the canvas permits two batches and three DOM flushes. Empty batches add no
React commits. Idle native canvas movement enters one batch even without a handler;
direct `node.fire()` and idle window movement enter none.

The renderer drains only microtasks it already scheduled. It drains them inside
a DOM scope so canvas effects can also update DOM state. There is no forced canvas
flush after every handler. The regular correctness suite checks effects crossing
renderers and releases where separate updating listeners produce separate commits.
Those tests verify event order, layout reads, passive effects, and final geometry.

Geometry counts are workload-specific ceilings. Attribute changes and change
listeners stay synchronous. Inside a change listener, Transformer bounds are
computed on read; anchor layout may wait until the batch finishes. Layout effects
and completed native events must see the committed anchors without forcing a
refresh. Correctness tests check those contracts alongside the count limits.

Results go to ignored `.bench-tools/counts-results.json`. To update the reviewed
[baseline](counts-results.json) deliberately:

```sh
BENCH_OUTPUT=benchmarks/counts-results.json npm run test:performance
```

The report records source, fixture, and installed Transformer hashes.

## Elapsed-time comparison

```sh
npm run bench:events -- HEAD
BENCH_OUTPUT=benchmarks/events-results.json npm run bench:events -- HEAD
```

The runner copies the selected Git ref and current source into an ignored
temporary directory. A directory containing `src/` can also supply the baseline.
Both variants use the installed Konva and React versions, isolating react-konva
changes. The report records source hashes, Konva build hashes, environment details,
and raw samples. Its default output is ignored `.bench-tools/events-results.json`.

Three browser runs alternate baseline/current order. Each workload has two warm-ups
and five measured samples per run, giving 15 samples per variant.

Resize workloads use 24 native pointer moves, 1/10/100/600 selected shapes, all three
state locations, and 1,000 changing DOM spans. A large-tree case sends 24 native
moves in bursts of eight with 5,000 canvas shapes and DOM spans. Separate workloads
send 10,000 native idle or no-op moves over a drawn canvas. Resize timings dispatch
to the window; the count suite also covers content-originating input.

`dispatchMs` measures synchronous event handling. `settledMs` includes the event
and the final state-owner layout effect, including scheduling delay when React
commits asynchronously. Do not add these times together. `ownerEffects` counts
state-owner effects, not root commits. `inlineSteps` records whether React state
was committed when dispatch returned. `settledStaleReads` must remain zero.

Compare distributions, not just medians. Desktop Chromium measurements do not
establish mobile frame rates. Synchronous input can cost more than deferred
scheduling for bursts of separate native events: each listener now has a commit
deadline. Direct programmatic event bursts retain normal React batching.

## Published Konva 10.5.0 measurements

The [saved comparison](events-results.json) compares react-konva `c644571` with
the synchronized-input candidate before the optional application wrapper was added.
Both use React 19.2.8 and the same registry Konva 10.5.0 files.
These are median `settledMs` totals from 15 samples on desktop Chromium.
Resize and large-tree rows contain 24 moves; idle and no-op rows contain 10,000.

| Workload | Previous react-konva (ms) | Candidate (ms) |
| --- | ---: | ---: |
| Resize 1 shape, root state | 1.1 | 1.7 |
| Resize 1 shape, leaf state | 0.8 | 1.4 |
| Resize 1 shape, state above Stage | 2.1 | 1.6 |
| Resize 10 shapes, root state | 3.7 | 2.2 |
| Resize 10 shapes, leaf state | 1.8 | 2.3 |
| Resize 10 shapes, state above Stage | 3.0 | 2.4 |
| Resize 100 shapes, root state | 188.7 | 22.9 |
| Resize 100 shapes, leaf state | 22.3 | 22.1 |
| Resize 100 shapes, state above Stage | 24.5 | 22.1 |
| Resize 100 shapes, above Stage + 1,000 changing DOM spans | 42.9 | 40.2 |
| Move bursts, 5,000 canvas shapes + 5,000 DOM spans | 35.2 | 35.8 |
| Native idle movement | 32.0 | 31.8 |
| Native no-op handlers | 32.6 | 34.8 |

Small canvas resize cases add about 0.025 ms per move. The 100-shape shared-state
case improves substantially: state-owner effects fall from 2,400 to 24 across
the gesture. Leaf effects remain 2,400 because 100 independent owners each commit
24 updates; the profiling suite verifies these belong to one canvas commit per
step. Large-tree timing is similar. The no-op difference is about 0.00022 ms per
move. These measurements do not promise a speedup for every application.

All samples have zero stale outline reads after React commits. With state above
Stage, the candidate also finishes all 24 commits before dispatch returns; the
previous implementation finishes them later.
