# React compatibility

This matrix covers React 19.3.0, React DOM 19.3.0, and react-reconciler 0.34.0.
It records renderer behavior and regression coverage. It does not guarantee every combination of React features or framework integrations.

A `Stage` creates a separate React root for its canvas children. Shape refs contain Konva objects.
Application context and DOM form status cross this boundary.
Error and Suspense boundaries stay within their renderer.
Place an error boundary inside Stage to display a Konva fallback for canvas errors.
Uncaught canvas errors appear in the console with the original error and component stack.

## Hooks

The inventory follows the [React hook reference](https://react.dev/reference/react/hooks) and the installed React exports.
Tests run components inside `Stage` unless a row describes the DOM boundary.

| API | Behavior | Regression coverage |
| --- | --- | --- |
| `useState`, `useReducer` | State updates reach Konva nodes. | [Hook tests](../test/27-react-hooks.test.tsx), [native events](../test/21-native-events.test.tsx) |
| `useRef`, `useImperativeHandle` | Refs expose Konva nodes or custom handles. Replacement and unmount clear refs. | [Ref lifecycle](../test/10-refs-lifecycle.test.tsx) |
| `useContext`, `use(context)` | Context updates cross Stage, including provider shorthand and memoized consumers. | [Hook tests](../test/27-react-hooks.test.tsx) |
| `useEffect`, `useLayoutEffect` | Effects run and clean up. Activity inside Stage disconnects and reconnects effects. | [Boundary tests](../test/28-react-boundaries.test.tsx), [scheduling tests](../test/16-scheduling-invariants.test.tsx) |
| `useInsertionEffect` | Insertion effects precede layout effects and clean up on update and unmount. | [Hook tests](../test/27-react-hooks.test.tsx) |
| `useEffectEvent` | Effect subscriptions read current props without reconnecting. | [Hook tests](../test/27-react-hooks.test.tsx) |
| `useMemo`, `useCallback` | Dependency changes update values and callbacks. Stable dependencies allow memoized children to skip rendering. | [Hook tests](../test/27-react-hooks.test.tsx) |
| `useTransition` | Canvas components expose pending state and commit asynchronous actions. | [Scheduler tests](../test/02-scheduler.test.tsx) |
| `useDeferredValue` | Old canvas content stays visible while deferred content suspends. | [Scheduler tests](../test/02-scheduler.test.tsx) |
| `useSyncExternalStore` | Subscriptions update canvas children and clean up. | [External store tests](../test/06-sync-external-store.test.tsx) |
| `useActionState` | Synchronous and asynchronous actions update canvas state. Rejections reach canvas error boundaries. | [Action tests](../test/25-actions.test.tsx), [error tests](../test/13-error-handling.test.tsx) |
| `useOptimistic` | Optimistic state appears during an action and settles to the saved state. | [Action tests](../test/25-actions.test.tsx) |
| `use(promise)` | Suspense handles pending promises. Error boundaries handle rejected promises. | [Suspense tests](../test/03-suspense.test.tsx), [error tests](../test/13-error-handling.test.tsx) |
| `useId` | IDs stay stable on updates and distinct across DOM and Stage roots. | [Hook tests](../test/27-react-hooks.test.tsx), [hydration test](../test/28-react-boundaries.test.tsx) |
| `useDebugValue` | Safe to call. Built packages register with React DevTools and support hook-state editing in development. | [Hook tests](../test/27-react-hooks.test.tsx), [DevTools protocol tests](../test/29-devtools.mjs). No inspector UI test. |
| React DOM `useFormStatus` | Inherits the surrounding DOM form status, including submitted data, method, and action. Other Stages remain independent. | [Hook tests](../test/27-react-hooks.test.tsx) |

Outside a form, the status is `{ pending: false, data: null, method: null, action: null }`.
Canvas controls can read `useFormStatus` directly without additional props.
React DOM's deprecated `useFormState` alias has no separate regression coverage. Use React's `useActionState` instead.

## Components and rendering

| Feature | Behavior and limits | Regression coverage |
| --- | --- | --- |
| Function and class components, keys, `memo` | React reconciles components and preserves keyed node identity. | [Mounting tests](../test/01-mounting.test.tsx), [hook tests](../test/27-react-hooks.test.tsx), [error tests](../test/13-error-handling.test.tsx) |
| `StrictMode` | Canvas roots inherit DOM StrictMode checks, including state initializers and memo calculations. React Konva's strict prop mode is a separate feature. | [StrictMode tests](../test/04-strict-mode.test.tsx), [action tests](../test/25-actions.test.tsx) |
| Function component `ref` props, `forwardRef`, callback cleanup | Refs reach shapes. Callback cleanup runs on replacement and unmount. | [Ref lifecycle](../test/10-refs-lifecycle.test.tsx) |
| `Fragment` | Children mount, update, reorder, and unmount. Fragment refs remain `null`. DOM Fragment methods are unavailable. | [Host feature tests](../test/26-react-host-features.test.tsx) |
| `Suspense`, `lazy` inside Stage | Fallbacks, retries, and hiding committed nodes work. Fallbacks must contain Konva elements. | [Suspense tests](../test/03-suspense.test.tsx) |
| Error boundaries | Boundaries inside Stage handle canvas errors and display Konva fallbacks. Uncaught errors are reported in the console. DOM boundaries do not catch canvas errors. | [Error tests](../test/13-error-handling.test.tsx) |
| `Activity` inside Stage | Hidden nodes retain state and identity. Nested boundaries preserve visibility and reconnect effects. | [Boundary tests](../test/28-react-boundaries.test.tsx), [pixel tests](../test/18-drawing.test.tsx) |
| `Activity` around Stage | Hide and reveal preserve Stage identity and canvas state. Effects and refs disconnect and reconnect. Hidden Stages dispose safely. | [Boundary tests](../test/28-react-boundaries.test.tsx) |
| `Suspense` around Stage | Promises read above Stage activate the DOM fallback. Mounted canvas state survives hiding. Layout effects disconnect, while passive effects remain active. | [Boundary tests](../test/28-react-boundaries.test.tsx) |
| `ViewTransition` | A DOM wrapper can animate the Stage container. A boundary inside Stage with Konva nodes or a ref throws an actionable error. | [Host feature tests](../test/26-react-host-features.test.tsx), [error tests](../test/13-error-handling.test.tsx) |
| Empty `ViewTransition` inside Stage | Commits finish without animation. Layout and passive effects still complete. | [Host feature tests](../test/26-react-host-features.test.tsx) |
| `startTransition`, `addTransitionType` | Each renderer schedules its own transitions. DOM pending state does not wait for canvas suspension. Transition types do not animate individual canvas shapes. | [Scheduler tests](../test/02-scheduler.test.tsx), [action tests](../test/25-actions.test.tsx) |
| `Profiler` | Canvas commit callbacks work in the profiling build. | [Commit-count benchmarks](../benchmarks/counts.bench.tsx) |
| Konva portals | `KonvaRenderer.createPortal` accepts Konva containers. Context, Activity visibility, target replacement, and disposal have coverage. | [Boundary tests](../test/28-react-boundaries.test.tsx) |
| DOM portals and overlays | DOM content requires React DOM and a DOM container. The Html fixture covers a separate DOM root. | [Portal tests](../test/05-roots-portals.test.tsx) |
| Server rendering and hydration | The server renders an empty Stage container. React DOM hydrates that container, then Konva mounts the canvas children. | [Packaged SSR tests](../test/11-ssr.mjs), [hydration test](../test/28-react-boundaries.test.tsx) |

The lifecycle tests cover Activity and compare canvas effects with DOM siblings under Suspense.
They cover overlapping suspension, replacement of pending children, and deletion before a promise resolves.
An initially hidden Stage creates its canvas when revealed. It does not prerender canvas children before that first reveal.
Development effects can replay in both roots. Cleanup must support repeated setup.
Errors during Stage disposal are reported in the console, including errors from multiple child cleanups.
Event-handler errors use browser error reporting. Error boundaries handle render, effect, and action failures.

## Choosing a Suspense boundary

For a canvas fallback, put the boundary inside Stage:

```jsx
<Stage width={600} height={400}>
  <Layer>
    <Suspense fallback={<Text text="Loading…" />}>
      <CanvasContent />
    </Suspense>
  </Layer>
</Stage>
```

Without a canvas boundary, Stage uses an empty canvas fallback until its children are ready.
It can replace pending children or unmount without waiting for their promises.
Canvas suspension does not activate a DOM Suspense boundary around Stage.

For a DOM fallback, read the promise above Stage:

```jsx
function Drawing({ drawingPromise }) {
  const drawing = use(drawingPromise);
  return (
    <Stage width={600} height={400}>
      <Layer><Rect fill={drawing.fill} width={100} height={100} /></Layer>
    </Stage>
  );
}

<Suspense fallback={<p>Loading…</p>}>
  <Drawing drawingPromise={drawingPromise} />
</Suspense>
```

Keep each promise stable across retries. Create it outside the component that reads it.
With this pattern, a DOM transition can keep the previous canvas visible while data loads.
Alternatively, own transition state inside Stage when canvas components read the promises.
An update passed through Stage props commits in the DOM before the canvas renders those props.
It cannot extend the original DOM transition when a canvas child suspends.

## APIs outside the canvas renderer

DOM elements, text children, forms, stylesheets, and document metadata are not Konva nodes.
Use `<Text text="..." />` for canvas text. Use a DOM overlay for HTML content.
Unknown element types produce a warning and substitute a `Group`. This fallback does not implement HTML behavior.

React DOM resource hints, form reset, and DOM portals operate on real DOM resources.
React DOM's `flushSync` does not independently flush state owned by the separate canvas renderer.
The native Konva event integration coordinates both renderers. [Scheduling tests](../test/16-scheduling-invariants.test.tsx) cover their commit ordering.

Client `cache` calls its function without server memoization. Client `cacheSignal` returns `null`.
These are React client defaults, not canvas caching features.
Element utilities such as `Children`, `cloneElement`, and `isValidElement` use React's implementation.

DevTools protocol tests cover registration, commit notifications, and development hook-state editing in both built package formats.
Browser extension UI, Server Components, Server Functions, streaming resumption, and React Compiler output require separate integration coverage.
This matrix does not claim that coverage. Experimental exports and future React minors are also outside this audit.
