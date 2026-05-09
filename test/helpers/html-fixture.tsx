// Minimal <Html> fixture for tests. NOT a sync'd copy of react-konva-utils'
// Html — it's a deliberately minimal implementation that exercises the
// secondary-react-dom-root + useContextBridge + queueMicrotask + flushSync
// contract that react-konva must support. We don't pull react-konva-utils
// as a dev dep because that creates a chicken-and-egg test setup: a bug in
// react-konva could break the fixture, masking the bug under test.

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
