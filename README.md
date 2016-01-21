# React Konva

![ReactKonva Logo](https://cloud.githubusercontent.com/assets/1443320/12193428/3bda2fcc-b623-11e5-8319-b1ccfc95eaec.png)

React Konva is a JavaScript library for drawing complex canvas graphics using [React](http://facebook.github.io/react/).

It provides declarative and reactive bindings to the [Konva Framework](http://konvajs.github.io/).

# [DEMO](http://jsbin.com/camene/edit?html,js,output)

```bash
npm instal react konva --save
npm install https://github.com/lavrton/react-konva.git --save # not published in npm yet
```

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

