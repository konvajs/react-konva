# React Konva

[![Build Status](https://travis-ci.org/lavrton/react-konva.svg?branch=master)](https://travis-ci.org/lavrton/react-konva)

![ReactKonva Logo](https://cloud.githubusercontent.com/assets/1443320/12193428/3bda2fcc-b623-11e5-8319-b1ccfc95eaec.png)

React Konva is a JavaScript library for drawing complex canvas graphics using
[React](http://facebook.github.io/react/).

It provides declarative and reactive bindings to the
[Konva Framework](http://konvajs.github.io/).

# [OPEN DEMO](https://codesandbox.io/s/5m3nwp787x)

An attempt to make [React](http://facebook.github.io/react/) work with the HTML5
canvas library. The goal is to have similar declarative markup as normal React
and to have similar data-flow model.

Currently you can use all `Konva` components as React components and all `Konva`
events are supported on them in same way as normal browser events are supported.

You can even inspect the components in React dev tools.

## Installation

```bash
npm install react-konva konva --save
```

For React `v15` use:

```bash
npm install react@15.X react-dom@15.X react-konva@1.1.6 konva
```

## Example

```javascript
import React, { Component } from 'react';
import { render } from 'react-dom';
import { Stage, Layer, Rect, Text } from 'react-konva';

class ColoredRect extends React.Component {
  state = {
    color: 'green'
  };
  handleClick = () => {
    this.setState({
      color: Konva.Util.getRandomColor()
    });
  };
  render() {
    return (
      <Rect
        x={20}
        y={20}
        width={50}
        height={50}
        fill={this.state.color}
        shadowBlur={5}
        onClick={this.handleClick}
      />
    );
  }
}

class App extends Component {
  render() {
    return (
      <Stage width={window.innerWidth} height={window.innerHeight}>
        <Layer>
          <Text text="Try click on rect" />
          <ColoredRect />
        </Layer>
      </Stage>
    );
  }
}

render(<App />, document.getElementById('root'));
```

All `react-konva` components correspond to `Konva` components of the same name.
All the parameters available for `Konva` objects are valid props for
corresponding `react-konva` components, unless otherwise noted.

Core shapes are: Rect, Circle, Ellipse, Line, Image, Text, TextPath, Star,
Label, SVG Path, RegularPolygon. Also you can create custom shape.

To get more info about `Konva` you can read
[Konva Overview](http://konvajs.github.io/docs/overview.html).

## Comparisons

### react-konva vs react-canvas

[react-canvas](https://github.com/Flipboard/react-canvas) is a completely
different react plugin. It allows you to draw DOM-like objects (images, texts)
on canvas element in very performant way. It is NOT about drawing graphics, but
react-konva is exactly for drawing complex graphics on `<canvas>` element from
React.

### react-konva vs react-art

[react-art](https://github.com/reactjs/react-art) allows you to draw graphics on
a page. It also supports SVG for output. But it has no support of events of
shapes.

### react-konva vs vanilla canvas

Performance is one of the main buzz word in react hype.

I made this plugin not for performance reasons. Using vanilla <canvas> should be
more performant because while using react-konva you have Konva framework on top
of <canvas> and React on top of Konva. But I made this plugin to fight with
application complexity. Konva helps here a lot (especially when you need events
for objects on canvas, like “click” on shape, it is really hard to do with
vanilla canvas). But React helps here much more as it provides very good
structure for your codebase and data flow.

## Documentation and Examples

**Note: you can find a lot of demos and examples of using Konva there:
[http://konvajs.github.io/](http://konvajs.github.io/)**

### Getting reference to Konva objects

To get reference of `Konva` instance of a node you can use `ref` property.

```javascript
class MyShape extends React.Component {
  componentDidMount() {
    // log Konva.Circle instance
    console.log(this.refs.circle);
  }
  render() {
    return <Circle ref="circle" radius={50} fill="black" />;
  }
}
```

That will work for all nodes except `Stage`. To get `Stage` instance you have to
use:

```javascript
class App extends React.Component {
  componentDidMount() {
    // log stage react wrapper
    console.log(this.refs.stage);
    // log Konva.Stage instance
    console.log(this.refs.stage.getStage());
  }
  render() {
    return <Stage ref="stage" width="300" height="300" />;
  }
}
```

### Animations

For complex animation I recommend to use React methods. Somethings like:

* [https://github.com/chenglou/react-motion](https://github.com/chenglou/react-motion)
* [https://github.com/chenglou/react-tween-state](https://github.com/chenglou/react-tween-state)

But for simple cases you can use `Konva` methods:

[http://jsbin.com/puroji/2/edit?js,output](http://jsbin.com/puroji/2/edit?js,output)

```javascript
class MyRect extends React.Component {
  changeSize() {
    const rect = this.refs.rect;

    // to() is a method of `Konva.Node` instances
    rect.to({
      scaleX: Math.random() + 0.8,
      scaleY: Math.random() + 0.8,
      duration: 0.2
    });
  }
  render() {
    return (
      <Group>
        <Rect
          ref="rect"
          width="50"
          height="50"
          fill="green"
          draggable="true"
          onDragEnd={this.changeSize.bind(this)}
          onDragStart={this.changeSize.bind(this)}
        />
      </Group>
    );
  }
}
```

### Using images

For images you need manually create native window.Image instance or `<canvas>`
element and use it as `image` attribute of `ReactKonva.Image` component.

Demo: https://codesandbox.io/s/kw51nzpnx3

```JavaScript
import React, { Component } from "react";
import { render } from "react-dom";
import { Stage, Layer, Image } from "react-konva";

// VERY IMPORTANT NOTES
// at first we will set image state to null
// and then we will set it to native image instanse
// only when image is loaded
class YodaImage extends React.Component {
  state = {
    image: null
  };
  componentDidMount() {
    const image = new window.Image();
    image.src = "http://konvajs.github.io/assets/yoda.jpg";
    image.onload = () => {
      // setState will redraw layer
      // because "image" property is changed
      this.setState({
        image: image
      });
    };
  }

  render() {
    return <Image image={this.state.image} />;
  }
}

// here is another way to update the image
class VaderImage extends React.Component {
  state = {
    image: new window.Image()
  };
  componentDidMount() {
    this.state.image.src = "http://konvajs.github.io/assets/darth-vader.jpg";
    this.state.image.onload = () => {
      // calling set state here will do nothing
      // because properties of Konva.Image are not changed
      // so we need to update layer manually
      this.imageNode.getLayer().batchDraw();
    };
  }

  render() {
    return (
      <Image
        image={this.state.image}
        y={250}
        ref={node => {
          this.imageNode = node;
        }}
      />
    );
  }
}

class App extends Component {
  render() {
    return (
      <Stage width={window.innerWidth} height={window.innerHeight}>
        <Layer>
          <YodaImage />
          <VaderImage />
        </Layer>
      </Stage>
    );
  }
}

render(<App />, document.getElementById("root"));
```

### Using filters

To apply filters you need to cache `Konva.Node` (`ref` of all `react-konva`
components).

DEMO: http://jsbin.com/ceyegucibe/1/edit?html,js,output

```javascript
class MyRect extends React.Component {
  constructor(...args) {
    super(...args);
    this.state = {
      color: 'green'
    };
    this.handleClick = this.handleClick.bind(this);
  }
  componentDidMount() {
    this.rect.cache();
  }
  handleClick() {
    this.setState(
      {
        color: Konva.Util.getRandomColor()
      },
      () => {
        // IMPORTANT
        // recache on update
        this.rect.cache();
      }
    );
  }
  render() {
    return (
      <Rect
        filters={[Konva.Filters.Noise]}
        noise={1}
        x={10}
        y={10}
        width={50}
        height={50}
        fill={this.state.color}
        shadowBlur={10}
        ref={node => {
          this.rect = node;
        }}
        onClick={this.handleClick}
      />
    );
  }
}
```
