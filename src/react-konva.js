// Adapted from ReactART:
// https://github.com/reactjs/react-art

var Konva = require('konva');
var React = require('react');
window.React = React;


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
        if (childNode.index !== toIndex) {
            childNode.setZIndex(toIndex);
	        var layer = childNode.getLayer();
		    layer && layer.batchDraw();
        }
    },

    createChild: function(child, childNode) {
        child._mountImage = childNode;
        childNode.moveTo(this.node);
        if (child._mountIndex !== childNode.index) {
            childNode.setZIndex(child._mountIndex);
        }
        this._mostRecentlyPlacedChild = childNode;
    	var layer = childNode.getLayer();
    	layer && layer.batchDraw();
    },

    removeChild: function(child) {
	       var layer = child._mountImage.getLayer();
           child._mountImage.destroy();
	       layer && layer.batchDraw();
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
                // runtime check for moveTo method
                // it is possible that child component with be not Konva.Node instance
                // for instance <noscript> for null element
                if (mountedImages[i].moveTo) {
                  mountedImages[i].moveTo(this.node);
                } else {
                  var message =
                    "Looks like one of child element is not Konva.Node." +
                    "react-konva do not support in for now."
                    "if you have empty(null) child, replace it with <Group/>"
                  console.error(message, this);

                }
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
    this.applyNodeProps(emptyObject, props);
    this.mountAndInjectChildren(props.children, transaction, context);
    return this.node;
  },

  receiveComponent: function(nextComponent, transaction, context) {
    var props = nextComponent.props;
    var oldProps = this._currentElement.props;
    this.applyNodeProps(oldProps, props);
    this.updateChildren(props.children, transaction, context);
    this._currentElement = nextComponent;
  },

  unmountComponent: function() {
    this.destroyEventListeners();
    this.unmountChildren();
  }
}


var NodeMixin = {

  construct: function(element) {
    this._currentElement = element;
  },

  receiveComponent: function(nextComponent, transaction, context) {
    var props = nextComponent.props;
    var oldProps = this._currentElement.props;
    this.applyNodeProps(oldProps, props);
    this.updateChildren(props.children, transaction, context);
    this._currentElement = nextComponent;
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
      var updatedProps = {};
  	  var hasUpdates = false;
      for (var key in oldProps) {
          var isEvent = key.slice(0, 2) === 'on';
  	      var toRemove = oldProps[key] !== props[key];
  	      if (isEvent && toRemove) {
              this.node.off(key.slice(2, key.length).toLowerCase(), oldProps[key]);
  	      }
      }
  	  for (var key in props) {
          if (key === 'children') {
  			continue;
  		  }
  	      var isEvent = key.slice(0, 2) === 'on';
  	      var toAdd = oldProps[key] !== props[key];
  	      if (isEvent && toAdd) {
  	           this.node.on(key.slice(2, key.length).toLowerCase(), props[key]);
  	      }
  		  if (props[key] !==  this.node.getAttr(key) && !isEvent) {
  			   hasUpdates = true;
  			   updatedProps[key] = props[key];
  		  }
  	   }

       if (hasUpdates) {
  			this.node.setAttrs(updatedProps);
  			var layer = this.node.getLayer();
  			layer && layer.batchDraw();
  		}
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
    this.applyNodeProps(emptyObject, props);
    return this.node;
  },

  receiveComponent: function(nextComponent, transaction, context) {
    var props = nextComponent.props;
    var oldProps = this._currentElement.props;
    this.applyNodeProps(oldProps, props);
    this._currentElement = nextComponent;
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
