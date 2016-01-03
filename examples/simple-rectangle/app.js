var React = require('react');
var ReactDOM = require('react-dom');
var ReactART = require('./react-konva');
var Layer = ReactART.Layer;
var Rect = ReactART.Rect;
var Stage = ReactART.Stage;
var Group = ReactART.Group;



class MyRect extends React.Component {
    componentDidMount() {
        console.log('mounted', this);
    }
    componentDidUpdate() {
        console.log('updated');
    }
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
                        this.setState({
                            bla: 1
                        });
                        console.log(11);
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
        style={{cursor: 'pointer'}}
      >
        <Layer>
            <MyRect/>
        </Layer>
      </Stage>
    );
  }
});


ReactDOM.render(<App/>, document.getElementById('container'));