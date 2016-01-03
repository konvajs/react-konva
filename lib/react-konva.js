// Adapted from ReactART:
// https://github.com/reactjs/react-art

"use strict";
var Konva = require('konva');


var React = require('react');
var ReactInstanceMap = require('react/lib/ReactInstanceMap');
var ReactMultiChild = require('react/lib/ReactMultiChild');
var ReactUpdates = require('react/lib/ReactUpdates');

var assign = require('react/lib/Object.assign');
var emptyObject = require('fbjs/lib/emptyObject');

function createComponent(name) {
    var ReactKonvaComponent = function(props) {
        this.node = null;
        this.subscriptions = null;
        this.listeners = null;
        this._mountImage = null;
        this._renderedChildren = null;
        this._mostRecentlyPlacedChild = null;
    };

    ReactKonvaComponent.displayName = name;
    for (var i = 1, l = arguments.length; i < l; i++) {
        assign(ReactKonvaComponent.prototype, arguments[i]);
    }

    return ReactKonvaComponent;
}


var ContainerMixin = assign({}, ReactMultiChild.Mixin, {

    // TODO: test and rewrite
    moveChild: function(child, toIndex) {
        var childNode = child._mountImage;
        var mostRecentlyPlacedChild = this._mostRecentlyPlacedChild;
        if (mostRecentlyPlacedChild == null) {
            // I'm supposed to be first.
            if (childNode.previousSibling) {
                if (this.node.firstChild) {
                    childNode.injectBefore(this.node.firstChild);
                } else {
                    childNode.inject(this.node);
                }
            }
        } else {
            // I'm supposed to be after the previous one.
            if (mostRecentlyPlacedChild.nextSibling !== childNode) {
                if (mostRecentlyPlacedChild.nextSibling) {
                    childNode.injectBefore(mostRecentlyPlacedChild.nextSibling);
                } else {
                    childNode.inject(this.node);
                }
            }
        }
        this._mostRecentlyPlacedChild = childNode;
    },


    createChild: function(child, childNode) {
        child._mountImage = childNode;
        var mostRecentlyPlacedChild = this._mostRecentlyPlacedChild;
        if (mostRecentlyPlacedChild == null) {
          // I'm supposed to be first.
          if (this.node.firstChild) {
            childNode.injectBefore(this.node.firstChild);
          } else {
            childNode.inject(this.node);
          }
        } else {
          // I'm supposed to be after the previous one.
          if (mostRecentlyPlacedChild.nextSibling) {
            childNode.injectBefore(mostRecentlyPlacedChild.nextSibling);
          } else {
            childNode.inject(this.node);
          }
        }
        this._mostRecentlyPlacedChild = childNode;
    },

  
    removeChild: function(child) {
        child._mountImage.eject();
        child._mountImage = null;
    },

    updateChildrenAtRoot: function(nextChildren, transaction) {
        this.updateChildren(nextChildren, transaction, emptyObject);
    },

    mountAndInjectChildrenAtRoot: function(children, transaction) {
        this.mountAndInjectChildren(children, transaction, emptyObject);
    },

    updateChildren: function(nextChildren, transaction, context) {
        this._mostRecentlyPlacedChild = null;
        this._updateChildren(nextChildren, transaction, context);
    },

    // Shorthands

    mountAndInjectChildren: function(children, transaction, context) {
        var mountedImages = this.mountChildren(
            children,
            transaction,
            context
        );
        // Each mount image corresponds to one of the flattened children
        var i = 0;
        for (var key in this._renderedChildren) {
            if (this._renderedChildren.hasOwnProperty(key)) {
                var child = this._renderedChildren[key];
                child._mountImage = mountedImages[i];
                mountedImages[i].moveTo(this.node);
                i++;
            }
        }
    }
});



var Stage = React.createClass({
    displayName: 'Stage',

    mixins: [ContainerMixin],

    componentDidMount: function() {

        this.node = new Konva.Stage({
            container: this.domNode,
            width: this.props.width,
            height: this.props.height
        });

        var transaction = ReactUpdates.ReactReconcileTransaction.getPooled();
        
        transaction.perform(
            this.mountAndInjectChildren,
            this,
            this.props.children,
            transaction,
            ReactInstanceMap.get(this)._context
        );
        ReactUpdates.ReactReconcileTransaction.release(transaction);
    },

  componentDidUpdate: function(oldProps) {
    var node = this.node;
    if (this.props.width != oldProps.width ||
        this.props.height != oldProps.height) {
      node.size({
        width: +this.props.width,
        height: +this.props.height
      });
    }

    var transaction = ReactUpdates.ReactReconcileTransaction.getPooled();
    transaction.perform(
      this.updateChildren,
      this,
      this.props.children,
      transaction,
      ReactInstanceMap.get(this)._context
    );
    ReactUpdates.ReactReconcileTransaction.release(transaction);

    if (node.render) {
      node.render();
    }
  },

  componentWillUnmount: function() {
    this.unmountChildren();
  },

  render: function() {
    // This is going to be a placeholder because we don't know what it will
    // actually resolve to because ART may render canvas, vml or svg tags here.
    // We only allow a subset of properties since others might conflict with
    // ART's properties.
    var props = this.props;

    // TODO: ART's Canvas Mode overrides surface title and cursor
    return (
      React.createElement('div', {
        ref: function(c)  {return this.domNode = c;}.bind(this), 
        accesskey: props.accesskey, 
        className: props.className, 
        draggable: props.draggable, 
        role: props.role, 
        style: props.style, 
        tabindex: props.tabindex, 
        title: props.title}
      )
    );
  }

});

// Various nodes that can go into a surface


var GroupMixin = {
  mountComponent: function(rootID, transaction, context) {
    // this.node = Mode.Group();
    this.node = new Konva[this.constructor.displayName]();
    var props = this._currentElement.props;
    this.applyGroupProps(emptyObject, props);
    this.mountAndInjectChildren(props.children, transaction, context);
    return this.node;
  },

  receiveComponent: function(nextComponent, transaction, context) {
    var props = nextComponent.props;
    var oldProps = this._currentElement.props;
    this.applyGroupProps(oldProps, props);
    this.updateChildren(props.children, transaction, context);
    this._currentElement = nextComponent;
  },

  applyGroupProps: function(oldProps, props) {
    this.node.width = props.width;
    this.node.height = props.height;
    this.applyNodeProps(oldProps, props);
  },

  unmountComponent: function() {
    this.destroyEventListeners();
    this.unmountChildren();
  }
}

// var EventTypes = {
//   onMouseMove: 'mousemove',
//   onMouseOver: 'mouseover',
//   onMouseOut: 'mouseout',
//   onMouseUp: 'mouseup',
//   onMouseDown: 'mousedown',
//   onClick: 'click'
// };

var NodeMixin = {

  construct: function(element) {
    this._currentElement = element;
  },

  getPublicInstance: function() {
    return this.node;
  },

  putEventListener: function(type, listener) {
    var subscriptions = this.subscriptions || (this.subscriptions = {});
    var listeners = this.listeners || (this.listeners = {});
    listeners[type] = listener;
    if (listener) {
      if (!subscriptions[type]) {
        subscriptions[type] = this.node.subscribe(type, listener, this);
      }
    } else {
      if (subscriptions[type]) {
        subscriptions[type]();
        delete subscriptions[type];
      }
    }
  },

  handleEvent: function(event) {
    var listener = this.listeners[event.type];
    if (!listener) {
      return;
    }
    if (typeof listener === 'function') {
      listener.call(this, event);
    } else if (listener.handleEvent) {
      listener.handleEvent(event);
    }
  },

  destroyEventListeners: function() {
    var subscriptions = this.subscriptions;
    if (subscriptions) {
      for (var type in subscriptions) {
        subscriptions[type]();
      }
    }
    this.subscriptions = null;
    this.listeners = null;
  },

  applyNodeProps: function(oldProps, props) {
    // var node = this.node;

    // var scaleX = props.scaleX != null ? props.scaleX :
    //              props.scale != null ? props.scale : 1;
    // var scaleY = props.scaleY != null ? props.scaleY :
    //              props.scale != null ? props.scale : 1;

    // pooledTransform
    //   .transformTo(1, 0, 0, 1, 0, 0)
    //   .move(props.x || 0, props.y || 0)
    //   .rotate(props.rotation || 0, props.originX, props.originY)
    //   .scale(scaleX, scaleY, props.originX, props.originY);

    // if (props.transform != null) {
    //   pooledTransform.transform(props.transform);
    // }

    // if (node.xx !== pooledTransform.xx || node.yx !== pooledTransform.yx ||
    //     node.xy !== pooledTransform.xy || node.yy !== pooledTransform.yy ||
    //     node.x  !== pooledTransform.x  || node.y  !== pooledTransform.y) {
    //   // TRANSFORMING???
    //   // node.transformTo(pooledTransform);
    // }

    // if (props.cursor !== oldProps.cursor || props.title !== oldProps.title) {
    //   node.indicate(props.cursor, props.title);
    // }

    // if (node.blend && props.opacity !== oldProps.opacity) {
    //   node.blend(props.opacity == null ? 1 : props.opacity);
    // }

    // if (props.visible !== oldProps.visible) {
    //   if (props.visible == null || props.visible) {
    //     node.show();
    //   } else {
    //     node.hide();
    //   }
    // }

    // for (var type in EventTypes) {
    //   this.putEventListener(EventTypes[type], props[type]);
    // }
  },

  mountComponentIntoNode: function(rootID, container) {
    throw new Error(
      'You cannot render an ART component standalone. ' +
      'You need to wrap it in a Stage.'
    );
  }

};

// Group

var Group = createComponent('Group', NodeMixin, ContainerMixin, GroupMixin);

var Layer = createComponent('Layer', NodeMixin, ContainerMixin, GroupMixin);


// Renderables

var RenderableMixin = assign({}, NodeMixin, {

  applyRenderableProps: function(oldProps, props) {
    if (oldProps.fill !== props.fill) {
      if (props.fill && props.fill.applyFill) {
        props.fill.applyFill(this.node);
      } else {
        this.node.fill(props.fill);
      }
    }
    if (
      oldProps.stroke !== props.stroke ||
      oldProps.strokeWidth !== props.strokeWidth ||
      oldProps.strokeCap !== props.strokeCap ||
      oldProps.strokeJoin !== props.strokeJoin ||
      // TODO: Consider a deep check of stokeDash.
      // This may benefit the VML version in IE.
      oldProps.strokeDash !== props.strokeDash
    ) {
      this.node.stroke(
        props.stroke,
        props.strokeWidth,
        props.strokeCap,
        props.strokeJoin,
        props.strokeDash
      );
    }
    this.applyNodeProps(oldProps, props);
  },

  unmountComponent: function() {
    this.destroyEventListeners();
  }

});

var ShapeMixin = {

  construct: function(element) {
    this._currentElement = element;
    this._oldPath = null;
  },

  mountComponent: function(rootID, transaction, context) {
    // this.node = Mode.Shape();
    this.node = new Konva[this.constructor.displayName]();
    var props = this._currentElement.props;
    this.applyShapeProps(emptyObject, props);
    return this.node;
  },

  receiveComponent: function(nextComponent, transaction, context) {
    var props = nextComponent.props;
    var oldProps = this._currentElement.props;
    this.applyShapeProps(oldProps, props);
    this._currentElement = nextComponent;
  },

  applyShapeProps: function(oldProps, props) {
    for(var key in oldProps) {
      var isEvent = (key.slice(0,2) === 'on');
      var toRemove = (oldProps[key] !== props[key]);
      if (isEvent && toRemove) {
        console.log('unsub');
        this.node.off(key.slice(2, key.length).toLowerCase(), oldProps[key]);
      }
    }
    for(var key in props) {
      var isEvent = (key.slice(0,2) === 'on');
      var toAdd = (oldProps[key] !== props[key]);
      console.log(isEvent, toAdd)
      if (isEvent && toAdd) {
        console.log('subscribe');
        this.node.on(key.slice(2, key.length).toLowerCase(), props[key]);
      }
    }
    

    this.node.setAttrs(props);
  }

};


var ReactKonva = {
  Stage: Stage,
  Group: Group,
  Layer: Layer,
};

var shapes = [
    'Rect', 'Circle', 'Ellipse', 'Wedge', 'Line', 'Sprite', 'Image', 'Text', 'TextPath',
    'Star', 'Ring', 'Arc', 'Label', 'Tag', 'Path', 'RegularPolygon',  'Arrow', 'Shape'
];

shapes.forEach(function(shapeName) {
  ReactKonva[shapeName] = createComponent(shapeName, RenderableMixin, ShapeMixin);
});

module.exports = ReactKonva;
