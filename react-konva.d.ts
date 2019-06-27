import * as React from 'react';
import Konva from 'konva';

export interface KonvaNodeEvents {
  onMouseOver?(evt: Konva.KonvaEventObject<MouseEvent>): void;
  onMouseMove?(evt: Konva.KonvaEventObject<MouseEvent>): void;
  onMouseOut?(evt: Konva.KonvaEventObject<MouseEvent>): void;
  onMouseEnter?(evt: Konva.KonvaEventObject<MouseEvent>): void;
  onMouseLeave?(evt: Konva.KonvaEventObject<MouseEvent>): void;
  onMouseDown?(evt: Konva.KonvaEventObject<MouseEvent>): void;
  onMouseUp?(evt: Konva.KonvaEventObject<MouseEvent>): void;
  onWheel?(evt: Konva.KonvaEventObject<WheelEvent>): void;
  onClick?(evt: Konva.KonvaEventObject<MouseEvent>): void;
  onDblClick?(evt: Konva.KonvaEventObject<MouseEvent>): void;
  onTouchStart?(evt: Konva.KonvaEventObject<TouchEvent>): void;
  onTouchMove?(evt: Konva.KonvaEventObject<TouchEvent>): void;
  onTouchEnd?(evt: Konva.KonvaEventObject<TouchEvent>): void;
  onTap?(evt: Konva.KonvaEventObject<Event>): void;
  onDblTap?(evt: Konva.KonvaEventObject<Event>): void;
  onDragStart?(evt: Konva.KonvaEventObject<DragEvent>): void;
  onDragMove?(evt: Konva.KonvaEventObject<DragEvent>): void;
  onDragEnd?(evt: Konva.KonvaEventObject<DragEvent>): void;
  onTransform?(evt: Konva.KonvaEventObject<Event>): void;
  onTransformStart?(evt: Konva.KonvaEventObject<Event>): void;
  onTransformEnd?(evt: Konva.KonvaEventObject<Event>): void;
  onContextMenu?(evt: Konva.KonvaEventObject<PointerEvent>): void;
}

export interface KonvaNodeComponent<
  Node extends Konva.Node,
  Props = Konva.NodeConfig
  // We use React.ClassAttributes to fake the 'ref' attribute. This will ensure
  // consumers get the proper 'Node' type in 'ref' instead of the wrapper
  // component type.
> extends React.SFC<Props & KonvaNodeEvents & React.ClassAttributes<Node>> {
  getPublicInstance(): Node;
  getNativeNode(): Node;
  // putEventListener(type: string, listener: Function): void;
  // handleEvent(event: Event): void;
}

export interface StageProps
  extends Konva.NodeConfig,
    KonvaNodeEvents,
    Pick<
      React.HTMLProps<any>,
      'className' | 'role' | 'style' | 'tabIndex' | 'title'
    > {
  onContentMouseover?(evt: any): void;
  onContentMousemove?(evt: any): void;
  onContentMouseout?(evt: any): void;
  onContentMousedown?(evt: any): void;
  onContentMouseup?(evt: any): void;
  onContentClick?(evt: any): void;
  onContentDblclick?(evt: any): void;
  onContentTouchstart?(evt: any): void;
  onContentTouchmove?(evt: any): void;
  onContentTouchend?(evt: any): void;
  onContentTap?(evt: any): void;
  onContentDbltap?(evt: any): void;
  onContentWheel?(evt: any): void;
}

// Stage is the only real class because the others are stubs that only know how
// to be rendered when they are under stage. Since there is no real backing
// class and are in reality are a string literal we don't want users to actually
// try and use them as a type. By defining them as a variable with an interface
// consumers will not be able to use the values as a type or constructor.
// The down side to this approach, is that typescript thinks the type is a
// function, but if the user tries to call it a runtime exception will occur.

/** Stage */
export class Stage extends React.Component<StageProps & KonvaNodeEvents> {
  getStage(): Konva.Stage;
}

/** Containers */
export var Layer: KonvaNodeComponent<Konva.Layer, Konva.LayerConfig>;
export var FastLayer: KonvaNodeComponent<Konva.FastLayer, Konva.LayerConfig>;
export var Group: KonvaNodeComponent<Konva.Group>;
export var Label: KonvaNodeComponent<Konva.Label>;

/** Shapes */
export var Rect: KonvaNodeComponent<Konva.Rect, Konva.RectConfig>;
export var Circle: KonvaNodeComponent<Konva.Circle, Konva.CircleConfig>;
export var Ellipse: KonvaNodeComponent<Konva.Ellipse, Konva.EllipseConfig>;
export var Wedge: KonvaNodeComponent<Konva.Wedge, Konva.WedgeConfig>;
export var Transformer: KonvaNodeComponent<
  Konva.Transformer,
  Konva.TransformerConfig
>;
export var Line: KonvaNodeComponent<Konva.Line, Konva.LineConfig>;
export var Sprite: KonvaNodeComponent<Konva.Sprite, Konva.SpriteConfig>;
export var Image: KonvaNodeComponent<Konva.Image, Konva.ImageConfig>;
export var Text: KonvaNodeComponent<Konva.Text, Konva.TextConfig>;
export var TextPath: KonvaNodeComponent<Konva.TextPath, Konva.TextPathConfig>;
export var Star: KonvaNodeComponent<Konva.Star, Konva.StarConfig>;
export var Ring: KonvaNodeComponent<Konva.Ring, Konva.RingConfig>;
export var Arc: KonvaNodeComponent<Konva.Arc, Konva.ArcConfig>;
export var Tag: KonvaNodeComponent<Konva.Tag, Konva.TagConfig>;
export var Path: KonvaNodeComponent<Konva.Path, Konva.PathConfig>;
export var RegularPolygon: KonvaNodeComponent<
  Konva.RegularPolygon,
  Konva.RegularPolygonConfig
>;
export var Arrow: KonvaNodeComponent<Konva.Arrow, Konva.ArrowConfig>;
export var Shape: KonvaNodeComponent<Konva.Shape, Konva.ShapeConfig>;

export var useStrictMode: (useStrictMode: boolean) => void;
