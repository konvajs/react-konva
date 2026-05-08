// Minimal <Html> fixture mirroring react-konva-utils' Html. Co-located here so
// react-konva's tests can exercise the secondary-react-dom-root + useContextBridge
// + queueMicrotask + flushSync contract without taking a dep on the sibling package.
//
// Keep this in sync with react-konva-utils/src/Html.tsx — if behavior diverges,
// these fixture-based tests will silently stop reflecting reality.

import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import Konva from 'konva';
import { Group, useContextBridge } from '../../src/ReactKonva';

export interface HtmlProps {
  children: React.ReactNode;
}

export function Html({ children }: HtmlProps) {
  const Bridge = useContextBridge();
  const groupRef = React.useRef<Konva.Group>(null);
  const [div] = React.useState(() => document.createElement('div'));
  const root = React.useMemo<Root>(() => createRoot(div), [div]);

  React.useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const container = group.getStage()?.container();
    if (!container) return;
    container.appendChild(div);
    return () => {
      div.parentNode?.removeChild(div);
    };
  }, [div]);

  React.useLayoutEffect(() => {
    queueMicrotask(() => {
      flushSync(() => {
        root.render(<Bridge>{children}</Bridge>);
      });
    });
  });

  React.useLayoutEffect(() => {
    return () => {
      setTimeout(() => root.unmount());
    };
  }, [root]);

  return <Group ref={groupRef} />;
}
