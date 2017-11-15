import * as React from 'react';
import * as Konva from 'konva';

export interface KonvaNodeProps {
  onMouseOver?(evt: any): void;
  onMouseMove?(evt: any): void;
  onMouseOut?(evt: any): void;
  onMouseEnter?(evt: any): void;
  onMouseLeave?(evt: any): void;
  onMouseDown?(evt: any): void;
  onMouseUp?(evt: any): void;
  onWheel?(evt: any): void;
  onClick?(evt: any): void;
  onDblClick?(evt: any): void;
  onTouchStart?(evt: any): void;
  onTouchMove?(evt: any): void;
  onTouchEnd?(evt: any): void;
  onTap?(evt: any): void;
  onDblTap?(evt: any): void;
  onDragStart?(evt: any): void;
  onDragMove?(evt: any): void;
  onDragEnd?(evt: any): void;
}

export class KonvaNodeComponent<Node extends Konva.Node, Props = Konva.NodeConfig> extends React.Component<Props & KonvaNodeProps> {
  getPublicInstance(): Node;
  getNativeNode(): Node;
  // putEventListener(type: string, listener: Function): void;
  // handleEvent(event: Event): void;
}

export class KonvaContainerComponent<Container extends Konva.Container, Props = Konva.ContainerConfig> extends React.Component<Props & KonvaNodeProps> {
  // moveChild(prevChild, lastPlacedNode, nextIndex, lastIndex): void;
  // createChild(child, afterNode, mountImage): void;
  // removeChild(child, node): void;
  // updateChildrenAtRoot(nextChildren, transaction): void;
  // mountAndInjectChildrenAtRoot(children, transaction): void;
  // updateChildren(nextChildren, transaction, context): void;
  // mountAndInjectChildren(children, transaction, context): void;
  // mountAndAddChildren(): void;
}

export interface StageProps extends Pick<React.HTMLProps<any>, 'className' | 'role' | 'style' | 'tabIndex' | 'title'> {
  x?: number;
  y?: number;
  name?: string;
  width?: number | string;
  height?: number | string;
  draggable?: boolean;
  onContentMouseOver?(evt: any): void;
  onContentMouseMove?(evt: any): void;
  onContentMouseOut?(evt: any): void;
  onContentMouseDown?(evt: any): void;
  onContentMouseUp?(evt: any): void;
  onContentClick?(evt: any): void;
  onContentDblClick?(evt: any): void;
  onContentTouchStart?(evt: any): void;
  onContentTouchMove?(evt: any): void;
  onContentTouchEnd?(evt: any): void;
  onContentTap?(evt: any): void;
  onContentDblTap?(evt: any): void;
}

/** Stage */
export class Stage extends KonvaContainerComponent<Konva.Stage, StageProps> {
  getStage(): Konva.Stage;
}

/** Containers */
export class Layer extends KonvaContainerComponent<Konva.Layer, Konva.LayerConfig> { }
export class FastLayer extends KonvaContainerComponent<Konva.FastLayer, Konva.LayerConfig> { }
export class Group extends KonvaContainerComponent<Konva.Group> { }
export class Label extends KonvaContainerComponent<Konva.Label> { }

/** Shapes */
export class Rect extends KonvaNodeComponent<Konva.Rect, Konva.RectConfig> { }
export class Circle extends KonvaNodeComponent<Konva.Circle, Konva.CircleConfig> { }
export class Ellipse extends KonvaNodeComponent<Konva.Ellipse, Konva.EllipseConfig> { }
export class Wedge extends KonvaNodeComponent<Konva.Wedge, Konva.WedgeConfig> { }
export class Line extends KonvaNodeComponent<Konva.Line, Konva.LineConfig> { }
export class Sprite extends KonvaNodeComponent<Konva.Sprite, Konva.SpriteConfig> { }
export class Image extends KonvaNodeComponent<Konva.Image, Konva.ImageConfig> { }
export class Text extends KonvaNodeComponent<Konva.Text, Konva.TextConfig> { }
export class TextPath extends KonvaNodeComponent<Konva.TextPath, Konva.TextPathConfig> { }
export class Star extends KonvaNodeComponent<Konva.Star, Konva.StarConfig> { }
export class Ring extends KonvaNodeComponent<Konva.Ring, Konva.RingConfig> { }
export class Arc extends KonvaNodeComponent<Konva.Arc, Konva.ArcConfig> { }
export class Tag extends KonvaNodeComponent<Konva.Tag, Konva.TagConfig> { }
export class Path extends KonvaNodeComponent<Konva.Path, Konva.PathConfig> { }
export class RegularPolygon extends KonvaNodeComponent<Konva.RegularPolygon, Konva.RegularPolygonConfig> { }
export class Arrow extends KonvaNodeComponent<Konva.Arrow, Konva.ArrowConfig> { }
export class Shape extends KonvaNodeComponent<Konva.Shape, Konva.ShapeConfig> { }
