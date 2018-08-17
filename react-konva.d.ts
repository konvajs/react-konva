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
  onTransform?(evt: any): void;
  onTransformStart?(evt: any): void;
  onTransformEnd?(evt: any): void;
  onContextMenu?(evt: any): void;
}

export interface KonvaNodeComponent<
  Node extends Konva.Node,
  Props = Konva.NodeConfig
  // We use React.ClassAttributes to fake the 'ref' attribute. This will ensure
  // consumers get the proper 'Node' type in 'ref' instead of the wrapper
  // component type.
> extends React.SFC<Props & KonvaNodeProps & React.ClassAttributes<Node>> {
  getPublicInstance(): Node;
  getNativeNode(): Node;
  // putEventListener(type: string, listener: Function): void;
  // handleEvent(event: Event): void;
}

export interface KonvaContainerComponent<
  Container extends Konva.Container,
  Props = Konva.ContainerConfig
  // See comment inside KonvaNodeComponent if modifiying next line.
> extends React.SFC<Props & KonvaNodeProps & React.ClassAttributes<Container>> {
  // moveChild(prevChild, lastPlacedNode, nextIndex, lastIndex): void;
  // createChild(child, afterNode, mountImage): void;
  // removeChild(child, node): void;
  // updateChildrenAtRoot(nextChildren, transaction): void;
  // mountAndInjectChildrenAtRoot(children, transaction): void;
  // updateChildren(nextChildren, transaction, context): void;
  // mountAndInjectChildren(children, transaction, context): void;
  // mountAndAddChildren(): void;
}

export interface StageProps
  extends Konva.NodeConfig,
    Pick<
      React.HTMLProps<any>,
      'className' | 'role' | 'style' | 'tabIndex' | 'title'
    > {
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
  onContentWheel?(evt: any): void;
  onContentContextMenu?(evt: any): void;
}

// Stage is the only real class because the others are stubs that only know how
// to be rendered when they are under stage. Since there is no real backing
// class and are in reality are a string literal we don't want users to actually
// try and use them as a type. By defining them as a variable with an interface
// consumers will not be able to use the values as a type or constructor.
// The down side to this approach, is that typescript thinks the type is a
// function, but if the user tries to call it a runtime exception will occur.

/** Stage */
export class Stage extends React.Component<StageProps & KonvaNodeProps> {
  getStage(): Konva.Stage;
}

/** Containers */
export var Layer: KonvaContainerComponent<
  Konva.Layer,
  Konva.LayerConfig
>;
export var FastLayer: KonvaContainerComponent<
  Konva.FastLayer,
  Konva.LayerConfig
>;
export var Group: KonvaContainerComponent<Konva.Group>;
export var Label: KonvaContainerComponent<Konva.Label>;

/** Shapes */
export var Rect: KonvaNodeComponent<Konva.Rect, Konva.RectConfig>;
export var Circle: KonvaNodeComponent<
  Konva.Circle,
  Konva.CircleConfig
>;
export var Ellipse: KonvaNodeComponent<
  Konva.Ellipse,
  Konva.EllipseConfig
>;
export var Wedge: KonvaNodeComponent<Konva.Wedge, Konva.WedgeConfig>;
export var Transformer: KonvaNodeComponent<Konva.Transformer, Konva.TransformerConfig>;
export var Line: KonvaNodeComponent<Konva.Line, Konva.LineConfig>;
export var Sprite: KonvaNodeComponent<
  Konva.Sprite,
  Konva.SpriteConfig
>;
export var Image: KonvaNodeComponent<Konva.Image, Konva.ImageConfig>;
export var Text: KonvaNodeComponent<Konva.Text, Konva.TextConfig>;
export var TextPath: KonvaNodeComponent<
  Konva.TextPath,
  Konva.TextPathConfig
>;
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
