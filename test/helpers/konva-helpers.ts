import Konva from 'konva';

export function focusRectsOnCanvas(stroke: string, stage?: Konva.Stage) {
  const s = stage ?? Konva.stages[Konva.stages.length - 1];
  if (!s) return [];
  return s.find('Rect').filter((r) => (r as Konva.Rect).stroke() === stroke);
}

export function countShapes(stage: Konva.Stage, type: string) {
  return stage.find(type).length;
}

export function lastStage(): Konva.Stage | undefined {
  return Konva.stages[Konva.stages.length - 1];
}
