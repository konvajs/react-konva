# React Konva

![ReactKonva Logo](https://cloud.githubusercontent.com/assets/1443320/12193428/3bda2fcc-b623-11e5-8319-b1ccfc95eaec.png)

React Konva is a JavaScript library for drawing complex canvas graphics using [React](http://facebook.github.io/react/).

It provides declarative and reactive bindings to the [Konva Framework](http://konvajs.github.io/).

# [DEMO](http://jsbin.com/camene/edit?html,js,output)

An attempt to make [React](http://facebook.github.io/react/) work with the HTML5 canvas library. The goal is to have
similar declarative markup as normal React and to have similar data-flow model.

Currently you can use all `Konva` components as React components and all `Konva`
events are supported on them in same way as normal browser events are supported.

You can even inspect the components in React dev tools.

## Installation

```bash
npm instal react konva react-konva --save
```

## Example

```javascript
import React from 'react';
import ReactDOM from 'react-dom';
import {Layer, Rect, Stage, Group} from 'react-konva';



class MyRect extends React.Component {
    constructor(...args) {
      super(...args);
      this.state = {
        color: 'green'
      };
      this.handleClick = this.handleClick.bind(this);
    }
    handleClick() {
      this.setState({
        color: Konva.Util.getRandomColor()
      });
    }
    render() {
        return (
            <Rect
                x={10} y={10} width={50} height={50}
                fill={this.state.color}
                shadowBlur={10}
                onClick={this.handleClick}
            />
        );
    }
}

function App() {
    return (
      <Stage width={700} height={700}>
        <Layer>
            <MyRect/>
        </Layer>
      </Stage>
    );
}


ReactDOM.render(<App/>, document.getElementById('container'));
```



All `react-konva` components correspond to `Konva` components of the same
name. All the parameters available for `Konva` objects are valid props for
corresponding `react-konva` components, unless otherwise noted.

Core shapes are: Rect, Circle, Ellipse, Line, Image, Text, TextPath, Star, Label, SVG Path, RegularPolygon.
Also you can create custom shape.

To get more info about `Konva` you can read [Konva Overview](http://konvajs.github.io/docs/overview.html).

## Documentation

### Getting reference to "native" object

To get reference of Konva instance of a node you can use `ref` property.

```javascript
class MyShape extends React.Component {
    componentDidMount() {
        // log Konva.Circle instance
        console.log(this.refs.circle);
    }
    render() {
        return (
            <Circle ref="circle" radius={50} fill="black"/>
        );
    }
}
```

That will work for all nodes except `Stage`. To get `Stage` instance you have to use:

```javascript
class App extends React.Component {
    componentDidMount() {
        // log stage react wrapper
        console.log(this.refs.stage);
        // log Konva.Stage instance
        console.log(this.refs.stage.getStage());
    }
    render() {
        return (
            <Stage ref="stage" width="300" height="300"/>
        );
    }
}
```



## Comparisons

### react-konva vs react-canvas

[react-canvas](https://github.com/Flipboard/react-canvas) is a completely different react plugin. It allows you to draw DOM-like objects (images, texts) on canvas element in very performant way. It is NOT about drawing graphics, but react-konva is exactly for drawing complex graphics on `<canvas>` element from React.

### react-konva vs react-art

[react-art](https://github.com/reactjs/react-art) allows you to draw graphics on a page. It also supports SVG for output. But it has no support of events of shapes.

### react-konva vs vanilla canvas

Performance is one of the main buzz word in react hype.

I made this plugin not for performance reasons. Using vanilla <canvas> should be more performant because while using react-konva you have Konva framework on top of <canvas> and React on top of Konva. But I made this plugin to fight with application complexity. Konva helps here a lot (especially when you need events for objects on canvas, like “click” on shape, it is really hard to do with vanilla canvas). But React helps here much more as it provides very good structure for your codebase and data flow.
