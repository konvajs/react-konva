# React Konva

[![Build Status](https://travis-ci.org/konvajs/react-konva.svg?branch=master)](https://travis-ci.org/konvajs/react-konva) [![Greenkeeper badge](https://badges.greenkeeper.io/konvajs/react-konva.svg)](https://greenkeeper.io/)

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

## Installation

```bash
npm install react-konva konva --save
```

## [Tutorials and Documentation](https://konvajs.github.io/docs/react/)

## Example

```javascript
import React, { Component } from 'react';
import { render } from 'react-dom';
import { Stage, Layer, Rect, Text } from 'react-konva';
import Konva from 'konva';

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

To get more info about `Konva` you can read
[Konva Overview](http://konvajs.github.io/docs/overview.html).

**Actually you don't need to learn `react-konva`. Just learn `Konva` framework, you will understand how to use `react-konva`**

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

Vanilla canvas is faster because when you use `react-konva` you have two layers of abstractions. Konva framework is on top of canvas and React is on top of Konva.
Depending on the use case this approach can be slow.
The purpose of `react-konva` is to reduce the complexity of the application and use well-known declarative way for drawing on canvas.

## [CHANGELOG](https://github.com/konvajs/react-konva/releases)


**Note: you can find a lot of demos and examples of using Konva there:
[http://konvajs.github.io/](http://konvajs.github.io/). Really, just go there and take a look what Konva can do for you. You will be able to do the same with `react-konva` too.**

### Getting reference to Konva objects

To get reference of `Konva` instance of a node you can use `ref` property.

```javascript
class MyShape extends React.Component {
  componentDidMount() {
    // log Konva.Circle instance
    console.log(this.circle);
  }
  render() {
    return <Circle ref={ref => (this.circle = ref)} radius={50} fill="black" />;
  }
}
```
