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
    render() {
        return (
            <Group>
                <Rect
                    width="50"
                    height="50"
                    fill="green"
                    draggable="true"
                    onDragEnd={(e) => {
                        console.log('drag end');
                    }}
                />
            </Group>
        );
    }
}

var App = React.createClass({

  render: function() {
    return (
      <Stage width={700} height={700}>
        <Layer>
            <MyRect/>
        </Layer>
      </Stage>
    );
  }
});


ReactDOM.render(<App/>, document.getElementById('container'));
```



All `react-konva` components correspond to `Konva` components of the same
name. All the parameters available for `Konva` objects are valid props for
corresponding `react-konva` components, unless otherwise noted.

To get more info about `Konva` you can read [Konva Overview](http://konvajs.github.io/docs/overview.html).
