# 19.3.0: React 19.3 support

## Upgrade requirements

Upgrade React and React DOM to matching 19.3 versions before you install this release.
The minimum React and React DOM version is now 19.3.0.

```sh
npm install react@19.3.0 react-dom@19.3.0 react-konva@19.3.0
```

For React 19.2 projects, pin `react-konva` to `~19.2.7`.
The range `^19.2.7` also allows 19.3.0, which requires the React upgrade.
For React 18 projects, use the React Konva 18 release line.

## Fixes and improvements

- Fixes the `useActionState` crash inside `Stage` with React 19.3. This resolves [#859](https://github.com/konvajs/react-konva/issues/859) through [#860](https://github.com/konvajs/react-konva/pull/860).
- Updates the bundled `react-reconciler` to 0.34.0 and `scheduler` to 0.28.0 for React 19.3.
- Canvas roots inherit React StrictMode checks from the DOM tree.
- Activity and Suspense preserve canvas state and node identity through hiding and reveal. Effects and refs disconnect and reconnect as each boundary requires.
- Stage removal discards pending child updates and runs effect cleanup, including for hidden Stages.
- Canvas components read the surrounding DOM form status through `useFormStatus`, including the submitted data and action.
- `useId` values remain stable on updates and distinct across DOM and Stage roots.
- Both package formats register with React DevTools. Development builds support hook state changes.

## Renderer boundaries

Error boundaries inside `Stage` handle canvas errors and display Konva fallbacks.
DOM error boundaries around `Stage` do not catch errors from canvas children.
Uncaught canvas errors appear in the console with the original error and component stack, including errors during cleanup.

Canvas Suspense boundaries display Konva fallbacks.
Canvas suspension does not activate a surrounding DOM Suspense boundary.
A promise read before Stage renders can activate that DOM fallback.

A DOM `ViewTransition` can animate the Stage container.
A `ViewTransition` inside Stage with Konva nodes or a ref throws a clear error.
Fragment children remain supported, but Fragment refs stay `null` and provide no DOM methods.

The [React compatibility matrix](docs/react-compatibility.md) lists the supported hooks, features, fallbacks, and remaining limits.
Native input synchronization and the fallback for older Konva versions continue from [19.2.7](https://github.com/konvajs/react-konva/blob/d9c73c21a5c164d5551ca62c15d5aa150a420053/RELEASE_NOTES.md).

## Validation

CI passes with Chromium, Firefox, and WebKit in development and production.
The minimum React and React DOM 19.3.0 job also passes.
The suite covers 196 correctness tests per build and 38 performance checks.
Package checks cover both module formats, server rendering, package exports, consumer types, and the DevTools protocol.
