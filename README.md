# React Konva

React Konva is a JavaScript library for drawing complex canvas graphics using [React](http://facebook.github.io/react/).

It provides declarative and reactive bindings to the [Konva Framework](http://konvajs.github.io/).


```bash
npm instal react konva react-konva --save
```

```javascript
var React = require('react');
var ReactDOM = require('react-dom');
var ReacKonva = require('./react-konva');
var Layer = ReacKonva.Layer;
var Rect = ReacKonva.Rect;
var Stage = ReacKonva.Stage;
var Group = ReacKonva.Group;



class MyRect extends React.Component {
    render() {
        return (
            <Group>
                <Rect
                    ref="bla"
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
      <Stage
        width={700}
        height={700}
      >
        <Layer>
            <MyRect/>
        </Layer>
      </Stage>
    );
  }
});


ReactDOM.render(<App/>, document.getElementById('container'));
```

