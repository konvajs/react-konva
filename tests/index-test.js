import React from 'react';
import { expect } from 'chai';
import { mount, configure } from 'enzyme';
import {
  Stage,
  Layer,
  Rect,
  Group,
  Image,
  useStrictMode,
  Text,
  __matchRectVersion,
} from '../src/ReactKonva';
import useImage from 'use-image';
import './mocking';
import Konva from 'konva';
import sinon from 'sinon/pkg/sinon';

import Adapter from '@wojtekmaj/enzyme-adapter-react-17';

configure({ adapter: new Adapter() });

describe('Test version matching', function () {
  it('should match react version', function () {
    expect(__matchRectVersion).to.equal(true);
  });
});

describe('Test references', function () {
  let instance;
  class App extends React.Component {
    render() {
      return (
        <Stage width={300} height={300} ref={(node) => (this.stage = node)}>
          <Layer ref={(node) => (this.layer = node)} />
        </Stage>
      );
    }
  }

  beforeEach(() => {
    const wrapper = mount(<App />);
    instance = wrapper.instance();
  });

  it('can get stage instance', function () {
    const stageRef = instance.stage;
    expect(stageRef.getStage() instanceof Konva.Stage).to.equal(true);
  });

  it('check initial props set', function () {
    const stage = instance.stage.getStage();
    expect(stage.width()).to.equal(300);
    expect(stage.height()).to.equal(300);
  });

  it('can get layer instance', function () {
    expect(instance.layer instanceof Konva.Layer).to.equal(true);
  });

  // how can we make this work?
  it('stage ref should go to the stage', function () {
    const stageRef = instance.stage;
    expect(stageRef instanceof Konva.Stage).to.equal(true);
  });

  it('works ok with no ref', function () {
    class App extends React.Component {
      render() {
        return (
          <Stage width={300} height={300}>
            <Layer ref={(node) => (this.layer = node)} />
          </Stage>
        );
      }
    }
    const wrapper = mount(<App />);
    instance = wrapper.instance();
  });

  it('works ok with react ref', function () {
    class App extends React.Component {
      stage = React.createRef();
      render() {
        return (
          <Stage width={300} height={300} ref={this.stage}>
            <Layer ref={(node) => (this.layer = node)} />
          </Stage>
        );
      }
    }
    const wrapper = mount(<App />);
    instance = wrapper.instance();
    const stage = instance.stage.current;
    expect(stage instanceof Konva.Stage).to.equal(true);
  });

  it('forward ref', function () {
    const MyRect = React.forwardRef((props, ref) => <Rect ref={ref} />);

    class App extends React.Component {
      stage = React.createRef();
      render() {
        return (
          <Stage width={300} height={300} ref={this.stage}>
            <Layer ref={(node) => (this.layer = node)}>
              <MyRect ref={(node) => (this.rect = node)} />
            </Layer>
          </Stage>
        );
      }
    }
    const wrapper = mount(<App />);
    instance = wrapper.instance();
    const rect = instance.rect;
    expect(rect instanceof Konva.Rect).to.equal(true);
  });
});

describe('Test stage component', function () {
  it('can attach stage events', function () {
    let eventCount = 0;
    const handleEvent = () => {
      eventCount += 1;
    };

    class App extends React.Component {
      render() {
        return (
          <Stage
            ref={(node) => (this.stage = node)}
            width={300}
            height={300}
            onMouseDown={handleEvent}
          >
            <Layer ref={(node) => (this.layer = node)}>
              <Rect
                ref={(node) => (this.rect = node)}
                width={100}
                height={100}
              />
            </Layer>
          </Stage>
        );
      }
    }

    const wrapper = mount(<App />);
    const instance = wrapper.instance();
    const stage = instance.stage.getStage();
    stage.simulateMouseDown({ x: 50, y: 50 });
    expect(eventCount).to.equal(1);
  });

  it('can attach stage content events', function () {
    let eventCount = 0;
    const handleEvent = () => {
      eventCount += 1;
    };

    class App extends React.Component {
      render() {
        return (
          <Stage
            ref={(node) => (this.stage = node)}
            width={300}
            height={300}
            onContentMouseDown={handleEvent}
          >
            <Layer ref={(node) => (this.layer = node)}>
              <Rect
                ref={(node) => (this.rect = node)}
                width={100}
                height={100}
              />
            </Layer>
          </Stage>
        );
      }
    }

    const wrapper = mount(<App />);
    const instance = wrapper.instance();
    const stage = instance.stage.getStage();
    stage.simulateMouseDown({ x: 50, y: 50 });
    expect(eventCount).to.equal(1);
  });

  it('unmount stage should destroy it from Konva', () => {
    class App extends React.Component {
      render() {
        if (this.props.skipStage) {
          return <div />;
        }
        return (
          <Stage ref={(node) => (this.stage = node)} width={300} height={300}>
            <Layer ref={(node) => (this.layer = node)} />
          </Stage>
        );
      }
    }

    const wrapper = mount(<App />);
    const instance = wrapper.instance();
    const stagesNumber = Konva.stages.length;
    wrapper.setProps({ skipStage: true });
    expect(Konva.stages.length).to.equal(stagesNumber - 1);
  });

  it('test null event', function () {
    class App extends React.Component {
      render() {
        return (
          <Stage
            ref={(node) => (this.stage = node)}
            width={300}
            height={300}
            onMouseDown={null}
          >
            <Layer ref={(node) => (this.layer = node)}>
              <Rect
                ref={(node) => (this.rect = node)}
                width={100}
                height={100}
              />
            </Layer>
          </Stage>
        );
      }
    }

    const wrapper = mount(<App />);
    const instance = wrapper.instance();
    const stage = instance.stage.getStage();
    stage.simulateMouseDown({ x: 50, y: 50 });
  });
});

describe('Test props setting', function () {
  let instance, wrapper;
  class App extends React.Component {
    render() {
      return (
        <Stage ref={(node) => (this.stage = node)} width={300} height={300}>
          <Layer ref={(node) => (this.layer = node)}>
            <Rect
              ref={(node) => (this.rect = node)}
              {...this.props.rectProps}
            />
          </Layer>
        </Stage>
      );
    }
  }

  beforeEach(() => {
    wrapper = mount(<App />);
    instance = wrapper.instance();
  });

  it('can update component props', () => {
    const rect = instance.rect;
    // set new props
    const props1 = {
      width: 100,
      height: 100,
    };

    wrapper.setProps({ rectProps: props1 });

    expect(rect.width()).to.equal(100);

    const props2 = {
      width: 200,
      height: 100,
    };
    wrapper.setProps({ rectProps: props2 });
    expect(rect.width()).to.equal(200);
  });
  it('can update component events', () => {
    const rect = instance.rect;
    // set new props
    const props1 = {
      onClick: () => {},
    };
    wrapper.setProps({ rectProps: props1 });
    expect(rect.eventListeners.click.length).to.equal(1);
    expect(rect.eventListeners.click[0].handler).to.equal(props1.onClick);

    const props2 = {
      onClick: () => {},
    };
    wrapper.setProps({ rectProps: props2 });
    expect(rect.eventListeners.click.length).to.equal(1);
    expect(rect.eventListeners.click[0].handler).to.equal(props2.onClick);
  });

  it('updating props should call layer redraw', () => {
    const layer = instance.layer;
    sinon.spy(layer, 'batchDraw');
    wrapper.setProps({
      rectProps: {
        fill: 'green',
      },
    });
    wrapper.setProps({
      rectProps: {
        fill: 'red',
      },
    });
    expect(layer.batchDraw.callCount).to.equal(2);
  });

  it('unset props', () => {
    const rect = instance.rect;
    wrapper.setProps({
      rectProps: {
        fill: 'red',
        x: 10,
      },
    });
    expect(rect.fill()).to.equal('red');

    wrapper.setProps({ rectProps: {} });
    expect(!!rect.fill()).to.equal(false);
    expect(rect.x()).to.equal(0);
  });

  it('do not overwrite properties if that changed manually', () => {
    const rect = instance.rect;
    wrapper.setProps({
      rectProps: {
        fill: 'red',
        x: 10,
      },
    });
    expect(rect.x()).to.equal(10);

    // change position manually
    rect.x(20);

    wrapper.setProps({
      rectProps: {
        fill: 'red',
        x: 10,
      },
    });
    expect(rect.x()).to.equal(20);
  });

  it('overwrite properties if that changed manually in strict-mode', () => {
    useStrictMode(true);
    const rect = instance.rect;
    wrapper.setProps({
      rectProps: {
        fill: 'red',
        x: 10,
      },
    });
    expect(rect.x()).to.equal(10);

    // change position manually
    rect.x(20);

    wrapper.setProps({
      rectProps: {
        fill: 'red',
        x: 10,
      },
    });
    expect(rect.x()).to.equal(10);
    useStrictMode(false);
  });

  it('overwrite properties if that passed _useStrictMode', () => {
    const rect = instance.rect;
    wrapper.setProps({
      rectProps: {
        fill: 'red',
        x: 10,
      },
    });
    expect(rect.x()).to.equal(10);

    // change position manually
    rect.x(20);

    wrapper.setProps({
      rectProps: {
        fill: 'red',
        x: 10,
        _useStrictMode: true,
      },
    });
    expect(rect.x()).to.equal(10);
  });
});

describe('test lifecycle methods', () => {
  let instance, wrapper;

  class SubComponent extends React.Component {
    // comment, as it will be removed
    // componentWillMount() {
    //   this.props.componentWillMount();
    // }
    componentDidMount() {
      this.props.componentDidMount();
    }
    // componentWillReceiveProps(newProps) {
    //   this.props.componentWillReceiveProps(newProps);
    // }
    shouldComponentUpdate() {
      this.props.shouldComponentUpdate(...arguments);
      return true;
    }
    // componentWillUpdate() {
    //   this.props.componentWillUpdate();
    // }
    componentDidUpdate() {
      this.props.componentDidUpdate();
    }
    componentWillUnmount() {
      this.props.componentWillUnmount();
    }
    render() {
      return <Rect />;
    }
  }
  class App extends React.Component {
    render() {
      return (
        <Stage ref={(node) => (this.stage = node)} width={300} height={300}>
          <Layer ref={(node) => (this.layer = node)}>
            {this.props.dontDrawChildren ? null : (
              <SubComponent {...this.props} />
            )}
          </Layer>
        </Stage>
      );
    }
  }

  it('test mount', () => {
    const props = {
      // componentWillMount: sinon.spy(),
      componentDidMount: sinon.spy(),
    };
    wrapper = mount(<App {...props} />);

    // expect(props.componentWillMount.called).to.equal(true);
    expect(props.componentDidMount.called).to.equal(true);
  });

  it('test update', () => {
    const props = {
      // componentWillMount: sinon.spy(),
      componentDidMount: sinon.spy(),
      // componentWillReceiveProps: sinon.spy(),
      shouldComponentUpdate: sinon.spy(),
      // componentWillUpdate: sinon.spy(),
      componentDidUpdate: sinon.spy(),
      componentWillUnmount: sinon.spy(),
    };
    wrapper = mount(<App {...props} />);
    wrapper.setProps(props);

    // expect(props.componentWillMount.called).to.equal(true);
    expect(props.shouldComponentUpdate.called).to.equal(true);
    // expect(props.componentWillUpdate.called).to.equal(true);
    expect(props.componentDidUpdate.called).to.equal(true);
  });

  it('test remove', () => {
    const props = {
      // componentWillMount: sinon.spy(),
      componentDidMount: sinon.spy(),
      // componentWillReceiveProps: sinon.spy(),
      shouldComponentUpdate: sinon.spy(),
      // componentWillUpdate: sinon.spy(),
      componentDidUpdate: sinon.spy(),
      componentWillUnmount: sinon.spy(),
    };
    wrapper = mount(<App {...props} />);
    const stage = wrapper.instance().stage.getStage();
    expect(stage.findOne('Rect')).to.not.equal(undefined);

    props.dontDrawChildren = props;
    wrapper.setProps(props);
    expect(stage.findOne('Rect')).to.equal(undefined);
    // This line don't work... why????
    expect(props.componentWillUnmount.called).to.equal(true);
  });
});

describe('Test Events', function () {
  let instance;
  class App extends React.Component {
    render() {
      return (
        <Stage width={300} height={300} ref={(node) => (this.stage = node)}>
          {this.props.shouldDrawLayer && (
            <Layer
              ref={(node) => (this.layer = node)}
              onClick={this.props.onClick}
            />
          )}
        </Stage>
      );
    }
  }
  it('should remove events on unmount', function () {
    const onClickRect = sinon.spy();
    const onClickExternal = sinon.spy();

    const wrapper = mount(<App onClick={onClickRect} shouldDrawLayer />);
    instance = wrapper.instance();

    const stageRef = instance.stage;
    const layer = stageRef.getStage().findOne('Layer');
    layer.on('click', onClickExternal);

    expect(onClickRect.callCount).to.equal(0);
    expect(onClickExternal.callCount).to.equal(0);

    layer._fire('click', {});
    expect(onClickRect.callCount).to.equal(1);
    expect(onClickExternal.callCount).to.equal(1);

    // remove layer
    wrapper.setProps({ shouldDrawLayer: false });

    expect(layer.getParent()).to.equal(null);

    layer._fire('click', {});

    expect(onClickRect.callCount).to.equal(1);
    expect(onClickExternal.callCount).to.equal(2);
  });
});

// will fail
describe.skip('Bad structure', () => {
  it('No dom inside Konva', function () {
    class App extends React.Component {
      render() {
        return (
          <Stage ref={(node) => (this.stage = node)} width={300} height={300}>
            <Layer>
              <div />
            </Layer>
          </Stage>
        );
      }
    }

    const wrapper = mount(<App />);
    const instance = wrapper.instance();
    const stage = instance.stage.getStage();
  });
});

// TODO: how to fix it?
// react is creating new nodes before removing old one
// that creates mess in id references
// see: https://github.com/konvajs/react-konva/issues/119

describe('Check id saving', () => {
  it('Konva can loose ids?', function () {
    class App extends React.Component {
      render() {
        const kids = [
          <Rect key="1" id="rect1" fill="red" />,
          <Rect key="2" id="rect2" fill="green" />,
        ];
        return (
          <Stage ref={(node) => (this.stage = node)} width={300} height={300}>
            <Layer>
              {this.props.drawAsGroup ? <Group>{kids}</Group> : kids}
            </Layer>
          </Stage>
        );
      }
    }

    const wrapper = mount(<App />);
    const instance = wrapper.instance();
    const stage = instance.stage.getStage();
    expect(stage.findOne('#rect1').fill()).to.equal('red');
    expect(stage.findOne('#rect2').fill()).to.equal('green');

    wrapper.setProps({ drawAsGroup: true });

    expect(stage.findOne('#rect1').fill()).to.equal('red');
    expect(stage.findOne('#rect2').fill()).to.equal('green');
  });
});

describe('Test drawing calls', () => {
  it('Draw layer on mount', function () {
    class App extends React.Component {
      render() {
        return (
          <Stage ref={(node) => (this.stage = node)} width={300} height={300}>
            <Layer>
              <Rect fill="red" />
            </Layer>
          </Stage>
        );
      }
    }

    expect(Konva.Layer.prototype.batchDraw.callCount).to.equal(undefined);
    sinon.spy(Konva.Layer.prototype, 'batchDraw');
    const wrapper = mount(<App />);

    expect(Konva.Layer.prototype.batchDraw.called).to.equal(true);
    Konva.Layer.prototype.batchDraw.restore();
  });

  it('Draw layer on node add', function () {
    class App extends React.Component {
      render() {
        return (
          <Stage ref={(node) => (this.stage = node)} width={300} height={300}>
            <Layer>{this.props.showRect && <Rect fill="red" />}</Layer>
          </Stage>
        );
      }
    }

    const wrapper = mount(<App />);
    sinon.spy(Konva.Layer.prototype, 'batchDraw');
    wrapper.setProps({ showRect: true });

    expect(Konva.Layer.prototype.batchDraw.callCount).to.equal(1);
    Konva.Layer.prototype.batchDraw.restore();
  });

  it('Draw layer on node remove', function () {
    class App extends React.Component {
      render() {
        return (
          <Stage ref={(node) => (this.stage = node)} width={300} height={300}>
            <Layer>{!this.props.hideRect && <Rect fill="red" />}</Layer>
          </Stage>
        );
      }
    }

    const wrapper = mount(<App />);
    sinon.spy(Konva.Layer.prototype, 'batchDraw');
    expect(Konva.Layer.prototype.batchDraw.callCount).to.equal(0);
    wrapper.setProps({ hideRect: true });

    expect(Konva.Layer.prototype.batchDraw.callCount).to.equal(1);
    Konva.Layer.prototype.batchDraw.restore();
  });
});

describe('test reconciler', () => {
  it('add before', function () {
    class App extends React.Component {
      render() {
        const kids = this.props.drawMany
          ? [<Rect key="1" name="rect1" />, <Rect key="2" name="rect2" />]
          : [<Rect key="2" name="rect2" />];
        return (
          <Stage ref={(node) => (this.stage = node)} width={300} height={300}>
            <Layer ref={(node) => (this.layer = node)}>{kids}</Layer>
          </Stage>
        );
      }
    }

    const wrapper = mount(<App />);
    sinon.spy(Konva.Layer.prototype, 'batchDraw');
    wrapper.setProps({ drawMany: true });

    const layer = wrapper.instance().layer;
    expect(layer.children[0].name()).to.equal('rect1');
    expect(layer.children[1].name()).to.equal('rect2');
    expect(Konva.Layer.prototype.batchDraw.callCount).to.equal(1);
    Konva.Layer.prototype.batchDraw.restore();
  });

  it('add before (mane)', function () {
    class App extends React.Component {
      render() {
        const kids = this.props.drawMany
          ? [
              <Rect key="1" name="rect1" />,
              <Rect key="2" name="rect2" />,
              <Rect key="3" name="rect3" />,
            ]
          : [<Rect key="1" name="rect1" />, <Rect key="3" name="rect3" />];
        return (
          <Stage ref={(node) => (this.stage = node)} width={300} height={300}>
            <Layer ref={(node) => (this.layer = node)}>{kids}</Layer>
          </Stage>
        );
      }
    }

    const wrapper = mount(<App />);
    wrapper.setProps({ drawMany: true });

    const layer = wrapper.instance().layer;
    expect(layer.children[0].name()).to.equal('rect1');
    expect(layer.children[1].name()).to.equal('rect2');
    expect(layer.children[2].name()).to.equal('rect3');
  });

  it('add after', function () {
    class App extends React.Component {
      render() {
        const kids = this.props.drawMany
          ? [<Rect key="1" name="rect1" />, <Rect key="2" name="rect2" />]
          : [<Rect key="1" name="rect1" />];
        return (
          <Stage ref={(node) => (this.stage = node)} width={300} height={300}>
            <Layer ref={(node) => (this.layer = node)}>{kids}</Layer>
          </Stage>
        );
      }
    }

    const wrapper = mount(<App />);
    sinon.spy(Konva.Layer.prototype, 'batchDraw');
    wrapper.setProps({ drawMany: true });

    const layer = wrapper.instance().layer;
    expect(layer.children[0].name()).to.equal('rect1');
    expect(layer.children[1].name()).to.equal('rect2');
    expect(Konva.Layer.prototype.batchDraw.callCount).to.equal(1);
    Konva.Layer.prototype.batchDraw.restore();
  });

  it('change order', function () {
    class App extends React.Component {
      render() {
        return (
          <Stage ref={(node) => (this.stage = node)} width={300} height={300}>
            <Layer ref={(node) => (this.layer = node)}>{this.props.kids}</Layer>
          </Stage>
        );
      }
    }

    let kids = [
      <Rect key="1" name="rect1" />,
      <Rect key="2" name="rect2" />,
      <Rect key="3" name="rect3" />,
    ];
    const wrapper = mount(<App kids={kids} />);
    const layer = wrapper.instance().layer;

    expect(layer.children[0].name()).to.equal('rect1');
    expect(layer.children[1].name()).to.equal('rect2');
    expect(layer.children[2].name()).to.equal('rect3');

    // last to first
    kids = [
      <Rect key="3" name="rect3" />,
      <Rect key="1" name="rect1" />,
      <Rect key="2" name="rect2" />,
    ];
    wrapper.setProps({ kids });
    expect(layer.children[0].name()).to.equal('rect3');
    expect(layer.children[1].name()).to.equal('rect1');
    expect(layer.children[2].name()).to.equal('rect2');

    // second to first
    kids = [
      <Rect key="1" name="rect1" />,
      <Rect key="3" name="rect3" />,
      <Rect key="2" name="rect2" />,
    ];

    wrapper.setProps({ kids });

    expect(layer.children[0].name()).to.equal('rect1');
    expect(layer.children[1].name()).to.equal('rect3');
    expect(layer.children[2].name()).to.equal('rect2');

    kids = [
      <Rect key="2" name="rect2" />,
      <Rect key="1" name="rect1" />,
      <Rect key="3" name="rect3" />,
    ];
    wrapper.setProps({ kids });

    expect(layer.children[0].name()).to.equal('rect2');
    expect(layer.children[1].name()).to.equal('rect1');
    expect(layer.children[2].name()).to.equal('rect3');

    kids = [
      <Rect key="4" name="rect4" />,
      <Rect key="2" name="rect2" />,
      <Rect key="1" name="rect1" />,
      <Rect key="3" name="rect3" />,
    ];
    wrapper.setProps({ kids });

    expect(layer.children[0].name()).to.equal('rect4');
    expect(layer.children[1].name()).to.equal('rect2');
    expect(layer.children[2].name()).to.equal('rect1');
    expect(layer.children[3].name()).to.equal('rect3');
  });

  it('changing order should not stop dragging', function () {
    class App extends React.Component {
      render() {
        return (
          <Stage ref={(node) => (this.stage = node)} width={300} height={300}>
            <Layer ref={(node) => (this.layer = node)}>{this.props.kids}</Layer>
          </Stage>
        );
      }
    }

    let kids = [
      <Rect key="1" name="rect1" />,
      <Rect key="2" name="rect2" />,
      <Rect key="3" name="rect3" />,
    ];
    const wrapper = mount(<App kids={kids} />);
    const layer = wrapper.instance().layer;

    const rect1 = layer.findOne('.rect1');

    layer.getStage().simulateMouseDown({ x: 5, y: 5 });
    rect1.startDrag();
    // move mouse
    layer.getStage().simulateMouseMove({ x: 10, y: 10 });

    expect(rect1.isDragging()).to.equal(true);

    kids = [
      <Rect key="3" name="rect3" />,
      <Rect key="1" name="rect1" />,
      <Rect key="2" name="rect2" />,
    ];
    wrapper.setProps({ kids });

    expect(rect1.isDragging()).to.equal(true);
    rect1.stopDrag();
  });

  it('check events subscribe', function () {
    const App = () => {
      const [fill, setColor] = React.useState('black');

      return (
        <Stage width={300} height={300}>
          <Layer>
            <Rect
              fill={fill}
              width={100}
              height={100}
              draggable
              onMouseDown={() => {
                setColor('red');
              }}
            />
          </Layer>
        </Stage>
      );
    };
    const wrapper = mount(<App />);
    const instance = wrapper.instance();

    const stage = Konva.stages[Konva.stages.length - 1];

    expect(stage.findOne('Rect').fill()).to.equal('black');
    stage.simulateMouseDown({ x: 50, y: 50 });
    stage.simulateMouseMove({ x: 55, y: 55 });
    expect(stage.findOne('Rect').isDragging()).to.equal(true);
    expect(stage.findOne('Rect').fill()).to.equal('red');
  });
});

describe('Test context API', function () {
  let instance;

  const { Consumer, Provider } = React.createContext({
    width: 100,
    height: 100,
  });
  class App extends React.Component {
    render() {
      return (
        <Provider value={{ width: 200, height: 100 }}>
          <Consumer>
            {({ width, height }) => (
              <Stage
                width={width}
                height={height}
                ref={(node) => (this.stage = node)}
              >
                <Layer ref={(node) => (this.layer = node)} />
              </Stage>
            )}
          </Consumer>
        </Provider>
      );
    }
  }

  beforeEach(() => {
    const wrapper = mount(<App />);
    instance = wrapper.instance();
  });

  it('test correct set', function () {
    const stageRef = instance.stage;
    const stage = stageRef.getStage();
    expect(stage.width()).to.equal(200);
    expect(stage.height()).to.equal(100);
  });
});

// wait for react team response
describe('Test nested context API', function () {
  const Context = React.createContext({
    color: 'red',
  });

  class Tools extends React.Component {
    static contextType = Context;
    render() {
      return (
        <Layer>
          <Rect width={50} height={50} fill={this.context.color} />
        </Layer>
      );
    }
  }

  class Canvas extends React.Component {
    static contextType = Context;
    render() {
      return (
        <Stage width={300} height={200} ref={(node) => (this.stage = node)}>
          <Tools />
        </Stage>
      );
    }
  }

  class App extends React.Component {
    render() {
      return (
        <Context.Provider value={{ color: 'black' }}>
          <Canvas />
        </Context.Provider>
      );
    }
  }

  beforeEach(() => {
    mount(<App />);
  });

  it.skip('test correct set', function () {
    const stage = Konva.stages[Konva.stages.length - 1];
    expect(stage.findOne('Rect').fill()).to.equal('black');
  });
});

// wait for react team response
describe('try lazy and suspense', function () {
  const LazyRect = React.lazy(() => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          default: () => <Rect />,
        });
      }, 5);
    });
  });

  class App extends React.Component {
    render() {
      return (
        <Stage ref={(node) => (this.stage = node)} width={300} height={300}>
          <Layer ref={(node) => (this.layer = node)}>
            <React.Suspense fallback={<Text text="fallback" />}>
              <LazyRect />
            </React.Suspense>
          </Layer>
        </Stage>
      );
    }
  }

  let instance;
  beforeEach(() => {
    const wrapper = mount(<App />);
    instance = wrapper.instance();
  });

  it('can use lazy and suspense', function (done) {
    const stageRef = instance.stage;
    const stage = stageRef.getStage();
    expect(stage.find('Text').length).to.equal(1);
    expect(stage.find('Shape').length).to.equal(1);

    setTimeout(() => {
      expect(stage.find('Text').length).to.equal(0);
      expect(stage.find('Rect').length).to.equal(1);
      expect(stage.find('Shape').length).to.equal(1);
      done();
    }, 50);
  });
});

describe('Fragments', function () {
  const Fragmented = () => (
    <React.Fragment>
      <Rect />
      <Rect />
    </React.Fragment>
  );

  class App extends React.Component {
    render() {
      return (
        <Stage ref={(node) => (this.stage = node)} width={300} height={300}>
          <Layer ref={(node) => (this.layer = node)}>
            <Fragmented />
          </Layer>
        </Stage>
      );
    }
  }

  let instance;
  beforeEach(() => {
    const wrapper = mount(<App />);
    instance = wrapper.instance();
  });

  it('can use lazy and suspense', function () {
    const stage = instance.stage;
    expect(stage.find('Rect').length).to.equal(2);
  });
});

describe('warnings', function () {
  class App extends React.Component {
    render() {
      return (
        <Stage ref={(node) => (this.stage = node)} width={300} height={300}>
          <Layer ref={(node) => (this.layer = node)}>
            <Rect draggable x={0} y={0} />
          </Layer>
        </Stage>
      );
    }
  }

  it('check draggable warning', function () {
    const wrapper = mount(<App />);
    // sinon.spy(console, 'warning');
    // expect(console.warning.callCount).to.equal(1);
  });
});

describe('Hooks', function () {
  it('check setState hook', function () {
    const App = () => {
      const [fill, setColor] = React.useState('black');

      return (
        <Stage width={300} height={300}>
          <Layer>
            <Rect
              fill={fill}
              width={100}
              height={100}
              onMouseDown={() => {
                setColor('red');
              }}
            />
          </Layer>
        </Stage>
      );
    };
    const wrapper = mount(<App />);
    const instance = wrapper.instance();

    const stage = Konva.stages[Konva.stages.length - 1];

    expect(stage.findOne('Rect').fill()).to.equal('black');
    stage.simulateMouseDown({ x: 50, y: 50 });
    expect(stage.findOne('Rect').fill()).to.equal('red');
  });

  it('check useEffect hook', function (done) {
    let callCount = 0;
    const App = () => {
      React.useEffect(() => {
        callCount += 1;
      });

      return (
        <Stage width={300} height={300}>
          <Layer />
        </Stage>
      );
    };
    const wrapper = mount(<App />);

    // not sure why timeouts are required
    // are hooks async?
    setTimeout(() => {
      expect(callCount).to.equal(1);

      wrapper.setProps({ randomProp: 1 });

      setTimeout(() => {
        expect(callCount).to.equal(2);
        done();
      }, 50);
    }, 50);
  });

  it('check useEffect hook 2', function (done) {
    let callCount = 0;
    const MyRect = ({ name }) => {
      React.useEffect(() => {
        callCount += 1;
      });
      return <Rect name={name} />;
    };
    const App = () => {
      const [name, setName] = React.useState('');

      React.useEffect(() => {
        setName('rect name');
      }, []);

      return (
        <Stage width={300} height={300}>
          <Layer>
            <MyRect name={name} />
          </Layer>
        </Stage>
      );
    };
    const wrapper = mount(<App />);

    // not sure why timeouts are required
    // are hooks async?
    setTimeout(() => {
      const stage = Konva.stages[Konva.stages.length - 1];

      const rect = stage.findOne('Rect');

      expect(rect.name()).to.equal('rect name');
      expect(callCount).to.equal(2);
      done();
    }, 50);
  });

  it('check useImage hook', function (done) {
    const url = 'https://konvajs.org/favicon-32x32.png';

    const App = () => {
      const [image, status] = useImage(url);

      return (
        <Stage width={300} height={300}>
          <Layer>
            <Image image={image} />
            <Text text={status} />
          </Layer>
        </Stage>
      );
    };
    const wrapper = mount(<App />);

    const stage = Konva.stages[Konva.stages.length - 1];

    // not image while loading
    expect(stage.findOne('Image').image()).to.equal(undefined);
    expect(stage.findOne('Text').text()).to.equal('loading');

    const img = new window.Image();
    img.onload = () => {
      // here should hook trigger
      setTimeout(() => {
        expect(stage.findOne('Image').image()).not.to.equal(undefined);
        expect(stage.findOne('Text').text()).to.equal('loaded');
        done();
      }, 50);
    };
    img.src = url;
  });

  it('unsubscribe on unmount', function (done) {
    const url = 'https://konvajs.org/favicon-32x32.png';

    const App = () => {
      const [image, status] = useImage(url);

      return (
        <Stage width={300} height={300}>
          <Layer>
            <Image image={image} />
            <Text text={status} />
          </Layer>
        </Stage>
      );
    };
    const wrapper = mount(<App />);
    const stage = Konva.stages[Konva.stages.length - 1];

    // not image while loading
    expect(stage.findOne('Image').image()).to.equal(undefined);
    expect(stage.findOne('Text').text()).to.equal('loading');

    wrapper.unmount();
    const img = new window.Image();
    img.onload = () => {
      setTimeout(() => {
        // image is loaded here
        // if hook is unsubcribed we should have no errors
        // so just
        done();
      }, 50);
    };
    img.src = url;
  });
});

describe('external', () => {
  it('make sure node has _applyProps for react-spring integration', function () {
    class App extends React.Component {
      render() {
        return (
          <Stage ref={(node) => (this.stage = node)} width={300} height={300}>
            <Layer>
              <Rect fill="red" />
            </Layer>
          </Stage>
        );
      }
    }

    const wrapper = mount(<App />);
    const instance = wrapper.instance();
    const stage = instance.stage;
    expect(typeof stage.findOne('Rect')._applyProps).to.equal('function');
  });
});
