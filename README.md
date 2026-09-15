<p align="center">
  <img src="https://konvajs.org/img/icon.png" alt="Konva logo" height="60" />
</p>

# React Konva

[![Financial Contributors on Open Collective](https://opencollective.com/konva/all/badge.svg?label=financial+contributors)](https://opencollective.com/konva)
[![npm version](https://badge.fury.io/js/react-konva.svg)](http://badge.fury.io/js/react-konva)
[![Build Status](https://github.com/konvajs/react-konva/actions/workflows/test.yml/badge.svg)](https://github.com/konvajs/react-konva/actions/workflows/test.yml)

React Konva provides declarative React components for the [Konva](https://konvajs.org/) 2D canvas scene graph. Use it to build design editors, whiteboards, diagrams, annotations, and other interactive graphics.

React Konva is MIT licensed. It supports Konva shapes and events. It does not support React Native.

- [React tutorial](https://konvajs.org/docs/react/index.html)
- [Live demos](https://konvajs.org/docs/sandbox.html)
- [Konva API](https://konvajs.org/api/Konva.html)
- [Star the project](https://github.com/konvajs/react-konva)

[![A Konva Transformer around a selected image](https://konvajs.org/assets/demos/image-resize-min.png)](https://konvajs.org/docs/react/Transformer.html)

## Install

React Konva 19.3 requires React and React DOM `^19.3.0`.
For React 19.2, install the latest React Konva 19.2 release.
For React 18, install the latest React Konva 18 release.

```bash
npm install react-konva konva
```

## Quick example

```javascript
import {useState} from 'react';
import {Stage, Layer, Rect} from 'react-konva';

export default function App() {
  const [color, setColor] = useState('#00a8e8');
  return (
    <Stage width={600} height={400}>
      <Layer>
        <Rect
          x={50} y={50} width={120} height={80}
          fill={color} draggable
          onClick={() => setColor(color === '#00a8e8' ? '#ff7a00' : '#00a8e8')}
        />
      </Layer>
    </Stage>
  );
}
```

> **Building a full design editor?** [Polotno](https://polotno.com/?utm_source=konvajs&utm_medium=readme&utm_content=react-konva) is a commercial design editor SDK built on Konva by the Konva maintainers. It ships templates, text editing, and export, so you integrate an editor instead of building one: `npm install polotno`.

To get more info about `Konva` you can read
[Konva Overview](https://konvajs.org/docs/overview.html).

`react-konva` follows the Konva API. Learn the Konva scene graph, properties, and events before you add framework-specific patterns.

## Core API

`react-konva` supports Konva shapes with the same names. Event props use React names such as `onClick`, `onTouchMove`, and `onDragEnd`.

### Getting reference to Konva objects

To get reference of `Konva` instance of a node you can use `ref` property.

```javascript
import React, { useEffect, useRef } from 'react';

const MyShape = () => {
  const circleRef = useRef();

  useEffect(() => {
    // log Konva.Circle instance
    console.log(circleRef.current);
  }, []);

  return <Circle ref={circleRef} radius={50} fill="black" />;
};
```

### React features inside Stage

`useActionState` and `useOptimistic` work inside a `Stage`.
Fragments group Konva children, but Fragment refs remain `null` because the
canvas renderer has no DOM Fragment instance.

`ViewTransition` is not supported inside a `Stage`.
To animate the Stage's DOM container, place `ViewTransition` around `Stage` in
the React DOM tree. Individual Konva shapes have no DOM elements for view transitions.

`useFormStatus` reads the surrounding DOM form's status inside `Stage`.
Place error boundaries inside `Stage` and use Konva elements for their fallbacks.
Uncaught canvas errors appear in the console with the error and component stack.
DOM error boundaries around `Stage` do not catch errors from canvas children.

Place `Suspense` inside `Stage` to show a Konva fallback for canvas children.
For a DOM loading indicator, read the promise in a component above `Stage`.
The DOM and canvas use separate React roots, so their Suspense boundaries and
transition pending states do not propagate between roots.

Activity and Suspense around `Stage` preserve canvas component state when they
hide and reveal an existing Stage. An initially hidden Stage creates its canvas
on the first reveal.

React's `StrictMode` also enables development checks inside `Stage`.
For hook coverage and renderer limits, see the [React compatibility matrix](docs/react-compatibility.md).

### Strict mode

By default `react-konva` works in "non-strict" mode. If you changed a property **manually** (or by user action like `drag&drop`) properties of the node will be not matched with properties from `render()`. `react-konva` updates ONLY properties changed in `render()`.

In strict mode `react-konva` will update all properties of the nodes to the values that you provided in `render()` function, no matter changed they or not.

You should decide what mode is better in your actual use case.

To enable strict mode globally you can do this:

```javascript
import { useStrictMode } from 'react-konva';

useStrictMode(true);
```

Or you can enable it only for some components:

```javascript
<Rect width={50} height={50} fill="black" _useStrictMode />
```

Take a look into this example:

```javascript
import { Circle } from 'react-konva';
import Konva from 'konva';

const Shape = () => {
  const [color, setColor] = React.useState();

  return (
    <Circle
      x={0}
      y={0}
      draggable
      radius={50}
      fill={color}
      onDragEnd={() => {
        setColor(Konva.Util.getRandomColor());
      }}
    />
  );
};
```

The circle is `draggable` and it changes its color on `dragend` event. In `strict` mode position of the node will be reset back to `{x: 0, y: 0}` (as we defined in render). But in `non-strict` mode the circle will keep its position, because `x` and `y` are not changed in render.

### Minimal bundle

By default `react-konva` imports full `Konva` version. With all the shapes and all filters. To minimize bundle size you can use minimal core version of `react-konva`:

```javascript
// load minimal version of 'react-konva`
import { Stage, Layer, Rect } from 'react-konva/lib/ReactKonvaCore';

// minimal version has NO support for core shapes and filters
// if you want import a shape into Konva namespace you can just do this:
import 'konva/lib/shapes/Rect';
```

Demo: [https://codesandbox.io/s/6l97wny44z](https://codesandbox.io/s/6l97wny44z)

## Usage with Next.js

Konva 10+ works with Next.js without extra canvas setup. Use a
[Client Component](https://nextjs.org/docs/app/api-reference/directives/use-client) (`'use client'`).

Konva 9 and earlier need extra setup, such as installing `canvas` or
[disabling SSR](https://nextjs.org/docs/app/guides/lazy-loading#skipping-ssr) for the canvas component.

### Usage with React Context

Components inside `Stage` receive React contexts from its parent tree automatically. This behavior is available since `react-konva@18.2.2`.

```jsx
import React from 'react';
import { Stage, Layer, Rect } from 'react-konva';

const ThemeContext = React.createContext('red');

function ThemedRect() {
  const fill = React.useContext(ThemeContext);
  return <Rect width={100} height={100} fill={fill} />;
}

function App() {
  return (
    <ThemeContext.Provider value="blue">
      <Stage width={300} height={200}>
        <Layer>
          <ThemedRect />
        </Layer>
      </Stage>
    </ThemeContext.Provider>
  );
}
```

## Event synchronization

With Konva 10.5+, native input batches ordinary React state updates per Konva
listener and commits them before that listener returns, keeping DOM and canvas in sync.
This includes drag and transform events. To batch MobX reactions too, pass `runInAction`:

```tsx
import { runInAction } from 'mobx';

<Stage eventBatchFunc={runInAction} width={600} height={400}>
  {/* Existing layers, shapes, and handlers */}
</Stage>
```

The wrapper must call its callback exactly once, synchronously. Older Konva versions
use normal React scheduling and ignore this prop. See the [release notes](RELEASE_NOTES.md)
for performance and compatibility details.

## Development and tests

Run `npm install` and `npx playwright install chromium` before the tests.

- `npm test` runs browser tests with development and production React, performance counts, package builds, server rendering, and TypeScript checks.
- `BROWSER=firefox npm test` and `BROWSER=webkit npm test` select other installed Playwright browsers.
- `npm run test:performance` runs commit and calculation limits with production profiling builds.
- `npm run test:ssr` checks all built entry points without a DOM or native canvas backend, including imports when the optional event hook is absent.
- `npm run test:typings` checks the source and consumer examples.
- `npm run bench:events -- HEAD` compares elapsed interaction time against a commit. See [the benchmark guide](https://github.com/konvajs/react-konva/blob/master/benchmarks/README.md).

All tests use the latest published Konva. Compatibility tests disable its optional
hook; they do not install historical versions. CI runs the full suite in Chromium,
Firefox, and WebKit. A separate job checks minimum React with latest Konva.
Run development, production, and
profiling suites sequentially because they share Vite's dependency cache.

All interaction regressions run in the regular suite. There is no separate
expected-failure command.

## [CHANGELOG](https://github.com/konvajs/react-konva/releases)

See the [Konva demos](https://konvajs.org/docs/sandbox.html) for more complete examples.
