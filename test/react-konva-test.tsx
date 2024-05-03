import React from 'react';
import { createRoot } from 'react-dom/client';
import sinon from 'sinon';
import { expect } from 'chai';
import Konva from 'konva';
import useImage from 'use-image';

import './mocking';
import {
  Stage,
  Rect,
  Layer,
  useStrictMode,
  Group,
  Text,
  Image,
} from '../src/ReactKonva';

global.IS_REACT_ACT_ENVIRONMENT = true;

const render = async (component) => {
  const node = document.createElement('div');
  document.body.appendChild(node);
  const root = createRoot(node);

  await React.act(() => {
    root.render(component);
  });

  return {
    stage: Konva.stages[Konva.stages.length - 1],
    rerender: async (component) => {
      await React.act(() => {
        root.render(component);
      });
    },
  };
};

describe('initial mounting and refs', () => {
  it('trigger effect hooks', async () => {
    const func = sinon.fake();
    const App = () => {
      React.useEffect(() => {
        func();
      });
      const ref = React.useRef<Konva.Stage>(null);
      return <Stage ref={ref} />;
    };
    await render(React.createElement(App));
    expect(func.calledOnce).equals(true);
  });

  it('can set reference to stage', async () => {
    const App = () => {
      React.useEffect(() => {
        expect(ref.current instanceof Konva.Stage).to.be.true;
      });
      const ref = React.useRef<Konva.Stage>(null);
      return <Stage ref={ref} />;
    };
    await render(React.createElement(App));
  });

  it('check all refs', async () => {
    let stageRef;
    let layerRef;
    let rectRef;

    const App = () => {
      stageRef = React.useRef<Konva.Stage>(null);
      layerRef = React.useRef<Konva.Layer>(null);
      rectRef = React.useRef<Konva.Rect>(null);

      return (
        <Stage ref={stageRef}>
          <Layer ref={layerRef}>
            <Rect ref={rectRef} />
          </Layer>
        </Stage>
      );
    };
    await render(React.createElement(App));
    expect(stageRef.current instanceof Konva.Stage).to.be.true;
    expect(layerRef.current instanceof Konva.Layer).to.be.true;
    expect(rectRef.current instanceof Konva.Rect).to.be.true;
  });

  it('no fail on no ref', async () => {
    await render(<Stage />);
  });

  it('works with functional reference', async () => {
    const App = () => {
      return (
        <Stage
          ref={(node) => {
            if (node) {
              expect(node instanceof Konva.Stage).to.be.true;
            }
          }}
        />
      );
    };
    await render(React.createElement(App));
  });

  it('check initial props', async () => {
    const App = ({ width, height }) => {
      React.useEffect(() => {
        expect(ref.current.width()).equals(100);
      });
      const ref = React.useRef<Konva.Stage>(null);
      return <Stage ref={ref} width={width} heigh={height} />;
    };
    await render(<App width={100} height={100} />);
  });

  // this test doesn't work...
  // for unknow reason ref setting is triggered AFTER effect of App component
  // looks like it is because of cross-reconcilier case
  it.skip('forward ref on Konva components', async () => {
    const MyRect = React.forwardRef((props, ref) => <Rect ref={ref} />);

    const App = () => {
      const ref = React.useRef();
      const stageRef = React.useRef();
      React.useEffect(() => {
        expect((ref.current as any) instanceof Konva.Rect).to.be.true;
      });
      return (
        <Stage ref={stageRef} name='hello'>
          <Layer>
            <MyRect ref={ref} />
          </Layer>
        </Stage>
      );
    };
    await render(<App />);
  });
  it('forward ref deep in Konva tree', async () => {
    const MyRect = React.forwardRef((props, ref) => <Rect ref={ref} />);

    const MyLayer = () => {
      const ref = React.useRef();
      React.useEffect(() => {
        expect((ref.current as any) instanceof Konva.Rect).to.be.true;
      });
      return (
        <Layer>
          <MyRect ref={ref} />
        </Layer>
      );
    };

    const App = () => {
      return (
        <Stage>
          <MyLayer />
        </Stage>
      );
    };
    await render(<App />);
  });
});

describe('Test stage component', async function () {
  it('can attach stage events', async function () {
    let eventCount = 0;
    const handleEvent = () => {
      eventCount += 1;
    };

    class App extends React.Component {
      render() {
        return (
          <Stage width={300} height={300} onMouseDown={handleEvent}>
            <Layer>
              <Rect width={100} height={100} />
            </Layer>
          </Stage>
        );
      }
    }

    const { stage } = await render(<App />);
    await React.act(() => {
      stage.simulateMouseDown({ x: 50, y: 50 });
    });
    expect(eventCount).to.equal(1);
  });

  it('unmount stage should destroy it from Konva', async () => {
    class App extends React.Component {
      render() {
        if (this.props.skipStage) {
          return <div />;
        }
        return (
          <Stage width={300} height={300}>
            <Layer />
          </Stage>
        );
      }
    }

    const { stage, rerender } = await render(<App />);
    const stagesNumber = Konva.stages.length;
    await rerender(<App skipStage />);
    expect(Konva.stages.length).to.equal(stagesNumber - 1);
  });

  it('test null event', async function () {
    class App extends React.Component {
      render() {
        return (
          <Stage width={300} height={300} onMouseDown={null}>
            <Layer>
              <Rect width={100} height={100} />
            </Layer>
          </Stage>
        );
      }
    }

    const { stage } = await render(<App />);
    await React.act(() => {
      stage.simulateMouseDown({ x: 50, y: 50 });
    });
  });

  it('check div props', async function () {
    class App extends React.Component {
      render() {
        return (
          <Stage width={300} height={300} id="hello">
            <Layer>
              <Rect width={100} height={100} />
            </Layer>
          </Stage>
        );
      }
    }

    const { stage } = await render(<App />);
    expect(stage.id()).to.equal('hello');
    expect(stage.container().id).to.equal('hello');
  });
});

describe('Test props setting', async function () {
  let stage, rerender;
  class App extends React.Component {
    render() {
      return (
        <Stage width={300} height={300}>
          <Layer>
            <Rect {...this.props.rectProps} />
          </Layer>
        </Stage>
      );
    }
  }

  const setProps = async (props) => {
    await rerender(<App {...props} />);
  };

  beforeEach(async () => {
    const res = await render(<App />);
    stage = res.stage;
    rerender = res.rerender;
  });

  it('can update component props', async () => {
    const rect = stage.findOne('Rect');
    // set new props
    const props1 = {
      width: 100,
      height: 100,
    };

    await setProps({ rectProps: props1 });
    expect(rect.width()).to.equal(100);

    const props2 = {
      width: 200,
      height: 100,
    };
    await setProps({ rectProps: props2 });
    expect(rect.width()).to.equal(200);
  });
  it('can update component events', async () => {
    const rect = stage.findOne('Rect');
    // set new props
    const props1 = {
      onClick: () => {},
    };
    await setProps({ rectProps: props1 });
    expect(rect.eventListeners.click.length).to.equal(1);
    expect(rect.eventListeners.click[0].handler).to.equal(props1.onClick);

    const props2 = {
      onClick: () => {},
    };
    await setProps({ rectProps: props2 });
    expect(rect.eventListeners.click.length).to.equal(1);
    expect(rect.eventListeners.click[0].handler).to.equal(props2.onClick);
  });

  it('updating props should call layer redraw', async () => {
    const layer = stage.findOne('Layer');
    sinon.spy(layer, 'batchDraw');
    await setProps({
      rectProps: {
        fill: 'green',
      },
    });
    await setProps({
      rectProps: {
        fill: 'red',
      },
    });
    expect(layer.batchDraw.callCount).to.equal(2);
  });

  it('unset props', async () => {
    const rect = stage.findOne('Rect');
    await setProps({
      rectProps: {
        fill: 'red',
        x: 10,
      },
    });
    expect(rect.fill()).to.equal('red');

    await setProps({ rectProps: {} });
    expect(!!rect.fill()).to.equal(false);
    expect(rect.x()).to.equal(0);
  });

  it('do not overwrite properties if that changed manually', async () => {
    const rect = stage.findOne('Rect');
    await setProps({
      rectProps: {
        fill: 'red',
        x: 10,
      },
    });
    expect(rect.x()).to.equal(10);

    // change position manually
    rect.x(20);

    await setProps({
      rectProps: {
        fill: 'red',
        x: 10,
      },
    });
    expect(rect.x()).to.equal(20);
  });

  it('overwrite properties if that changed manually in strict-mode', async () => {
    useStrictMode(true);
    const rect = stage.findOne('Rect');
    await setProps({
      rectProps: {
        fill: 'red',
        x: 10,
      },
    });
    expect(rect.x()).to.equal(10);

    // change position manually
    rect.x(20);

    await setProps({
      rectProps: {
        fill: 'red',
        x: 10,
      },
    });
    expect(rect.x()).to.equal(10);
    useStrictMode(false);
  });

  it('overwrite properties if that passed _useStrictMode', async () => {
    const rect = stage.findOne('Rect');
    await setProps({
      rectProps: {
        fill: 'red',
        x: 10,
      },
    });
    expect(rect.x()).to.equal(10);

    // change position manually
    rect.x(20);

    await setProps({
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
  class SubComponent extends React.Component<any> {
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
        <Stage width={300} height={300}>
          <Layer>
            {this.props.dontDrawChildren ? null : (
              <SubComponent {...this.props} />
            )}
          </Layer>
        </Stage>
      );
    }
  }

  const setProps = async (rerender, props) => {
    await rerender(<App {...props} />);
  };

  // beforeEach(async () => {
  //   const res = await render(<App />);
  //   stage = res.stage;
  //   rerender = res.rerender;
  // });

  it('test mount', async () => {
    const props = {
      // componentWillMount: sinon.spy(),
      componentDidMount: sinon.spy(),
    };
    await render(<App {...props} />);

    // expect(props.componentWillMount.called).to.equal(true);
    expect(props.componentDidMount.called).to.equal(true);
  });

  it('test update', async () => {
    const props = {
      // componentWillMount: sinon.spy(),
      componentDidMount: sinon.spy(),
      // componentWillReceiveProps: sinon.spy(),
      shouldComponentUpdate: sinon.spy(),
      // componentWillUpdate: sinon.spy(),
      componentDidUpdate: sinon.spy(),
      componentWillUnmount: sinon.spy(),
    };
    const { rerender } = await render(<App {...props} />);
    await setProps(rerender, props);

    // expect(props.componentWillMount.called).to.equal(true);
    expect(props.shouldComponentUpdate.called).to.equal(true);
    // expect(props.componentWillUpdate.called).to.equal(true);
    expect(props.componentDidUpdate.called).to.equal(true);
  });

  it('test remove', async () => {
    const props = {
      // componentWillMount: sinon.spy(),
      componentDidMount: sinon.spy(),
      // componentWillReceiveProps: sinon.spy(),
      shouldComponentUpdate: sinon.spy(),
      // componentWillUpdate: sinon.spy(),
      componentDidUpdate: sinon.spy(),
      componentWillUnmount: sinon.spy(),
    };
    const { rerender, stage } = await render(<App {...props} />);
    expect(stage.findOne('Rect')).to.not.equal(undefined);

    props.dontDrawChildren = props;
    await setProps(rerender, props);
    expect(stage.findOne('Rect')).to.equal(undefined);
    // This line don't work... why????
    expect(props.componentWillUnmount.called).to.equal(true);
  });
});

describe('Test Events', async function () {
  class App extends React.Component {
    render() {
      return (
        <Stage width={300} height={300}>
          {this.props.shouldDrawLayer && <Layer onClick={this.props.onClick} />}
        </Stage>
      );
    }
  }

  it('should remove events on unmount', async function () {
    const onClickRect = sinon.spy();
    const onClickExternal = sinon.spy();

    const { stage, rerender } = await render(
      <App onClick={onClickRect} shouldDrawLayer />
    );

    const setProps = async (props) => {
      await rerender(<App {...props} />);
    };

    const layer = stage.findOne('Layer');
    layer.on('click', onClickExternal);

    expect(onClickRect.callCount).to.equal(0);
    expect(onClickExternal.callCount).to.equal(0);

    layer._fire('click', {});
    expect(onClickRect.callCount).to.equal(1);
    expect(onClickExternal.callCount).to.equal(1);

    // remove layer
    await setProps({ shouldDrawLayer: false });

    expect(layer.getParent()).to.equal(null);

    layer._fire('click', {});

    expect(onClickRect.callCount).to.equal(1);
    expect(onClickExternal.callCount).to.equal(2);
  });
});

describe('Bad structure', () => {
  it('No dom inside Konva', async function () {
    class App extends React.Component {
      render() {
        return (
          <Stage width={300} height={300}>
            <Layer>
              <div />
            </Layer>
          </Stage>
        );
      }
    }

    const { stage } = await render(<App />);
    // check check that this test is not failed
  });
});

describe('Check id saving', () => {
  it('Konva can loose ids?', async function () {
    class App extends React.Component {
      render() {
        const kids = [
          <Rect key="1" id="rect1" fill="red" />,
          <Rect key="2" id="rect2" fill="green" />,
        ];
        return (
          <Stage width={300} height={300}>
            <Layer>
              {this.props.drawAsGroup ? <Group>{kids}</Group> : kids}
            </Layer>
          </Stage>
        );
      }
    }

    const { stage, rerender } = await render(<App />);
    expect(stage.findOne('#rect1').fill()).to.equal('red');
    expect(stage.findOne('#rect2').fill()).to.equal('green');

    await rerender(<App drawAsGroup />);

    expect(stage.findOne('#rect1').fill()).to.equal('red');
    expect(stage.findOne('#rect2').fill()).to.equal('green');
  });
});

describe('Test drawing calls', () => {
  afterEach(() => {
    Konva.Layer.prototype.batchDraw.restore &&
      Konva.Layer.prototype.batchDraw.restore();
  });

  it('Draw layer on mount', async function () {
    class App extends React.Component {
      render() {
        return (
          <Stage width={300} height={300}>
            <Layer>
              <Rect fill="red" />
            </Layer>
          </Stage>
        );
      }
    }

    expect(Konva.Layer.prototype.batchDraw.callCount).to.equal(undefined);
    sinon.spy(Konva.Layer.prototype, 'batchDraw');
    const { stage } = await render(<App />);

    expect(Konva.Layer.prototype.batchDraw.called).to.equal(true);
    Konva.Layer.prototype.batchDraw.restore();
  });

  it('Draw layer on node add', async function () {
    class App extends React.Component {
      render() {
        return (
          <Stage width={300} height={300}>
            <Layer>{this.props.showRect && <Rect fill="red" />}</Layer>
          </Stage>
        );
      }
    }

    const { stage, rerender } = await render(<App />);
    sinon.spy(Konva.Layer.prototype, 'batchDraw');
    expect(Konva.Layer.prototype.batchDraw.callCount).to.equal(0);
    await rerender(<App showRect />);

    expect(Konva.Layer.prototype.batchDraw.callCount).to.equal(1);
    Konva.Layer.prototype.batchDraw.restore();
  });

  it('Draw layer on node remove', async function () {
    class App extends React.Component {
      render() {
        return (
          <Stage width={300} height={300}>
            <Layer>{!this.props.hideRect && <Rect fill="red" />}</Layer>
          </Stage>
        );
      }
    }

    const { stage, rerender } = await render(<App />);
    sinon.spy(Konva.Layer.prototype, 'batchDraw');
    expect(Konva.Layer.prototype.batchDraw.callCount).to.equal(0);
    await rerender(<App hideRect />);

    expect(Konva.Layer.prototype.batchDraw.callCount).to.equal(1);
    Konva.Layer.prototype.batchDraw.restore();
  });
});

describe('test reconciler', () => {
  afterEach(() => {
    Konva.Layer.prototype.batchDraw.restore &&
      Konva.Layer.prototype.batchDraw.restore();
  });

  it('add before', async function () {
    class App extends React.Component {
      render() {
        const kids = this.props.drawMany
          ? [<Rect key="1" name="rect1" />, <Rect key="2" name="rect2" />]
          : [<Rect key="2" name="rect2" />];
        return (
          <Stage width={300} height={300}>
            <Layer>{kids}</Layer>
          </Stage>
        );
      }
    }

    const { stage, rerender } = await render(<App />);
    sinon.spy(Konva.Layer.prototype, 'batchDraw');
    await rerender(<App drawMany />);

    const layer = stage.children[0];
    expect(layer.children[0].name()).to.equal('rect1');
    expect(layer.children[1].name()).to.equal('rect2');
    expect(Konva.Layer.prototype.batchDraw.callCount >= 1).to.equal(true);
    Konva.Layer.prototype.batchDraw.restore();
  });

  it('add before (mane)', async function () {
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
          <Stage width={300} height={300}>
            <Layer>{kids}</Layer>
          </Stage>
        );
      }
    }

    const { stage, rerender } = await render(<App />);
    await rerender(<App drawMany />);

    const layer = stage.children[0];
    expect(layer.children[0].name()).to.equal('rect1');
    expect(layer.children[1].name()).to.equal('rect2');
    expect(layer.children[2].name()).to.equal('rect3');
  });

  it('add after', async function () {
    class App extends React.Component {
      render() {
        const kids = this.props.drawMany
          ? [<Rect key="1" name="rect1" />, <Rect key="2" name="rect2" />]
          : [<Rect key="1" name="rect1" />];
        return (
          <Stage width={300} height={300}>
            <Layer>{kids}</Layer>
          </Stage>
        );
      }
    }

    const { stage, rerender } = await render(<App />);
    sinon.spy(Konva.Layer.prototype, 'batchDraw');
    await rerender(<App drawMany />);

    const layer = stage.children[0];
    expect(layer.children[0].name()).to.equal('rect1');
    expect(layer.children[1].name()).to.equal('rect2');
    expect(Konva.Layer.prototype.batchDraw.callCount).to.equal(1);
    Konva.Layer.prototype.batchDraw.restore();
  });

  it('change order', async function () {
    class App extends React.Component {
      render() {
        return (
          <Stage width={300} height={300}>
            <Layer>{this.props.kids}</Layer>
          </Stage>
        );
      }
    }

    let kids = [
      <Rect key="1" name="rect1" />,
      <Rect key="2" name="rect2" />,
      <Rect key="3" name="rect3" />,
    ];
    const { stage, rerender } = await render(<App kids={kids} />);
    const layer = stage.children[0];

    expect(layer.children[0].name()).to.equal('rect1');
    expect(layer.children[1].name()).to.equal('rect2');
    expect(layer.children[2].name()).to.equal('rect3');

    // last to first
    kids = [
      <Rect key="3" name="rect3" />,
      <Rect key="1" name="rect1" />,
      <Rect key="2" name="rect2" />,
    ];
    await rerender(<App kids={kids} />);
    expect(layer.children[0].name()).to.equal('rect3');
    expect(layer.children[1].name()).to.equal('rect1');
    expect(layer.children[2].name()).to.equal('rect2');

    // second to first
    kids = [
      <Rect key="1" name="rect1" />,
      <Rect key="3" name="rect3" />,
      <Rect key="2" name="rect2" />,
    ];

    await rerender(<App kids={kids} />);

    expect(layer.children[0].name()).to.equal('rect1');
    expect(layer.children[1].name()).to.equal('rect3');
    expect(layer.children[2].name()).to.equal('rect2');

    kids = [
      <Rect key="2" name="rect2" />,
      <Rect key="1" name="rect1" />,
      <Rect key="3" name="rect3" />,
    ];
    await rerender(<App kids={kids} />);

    expect(layer.children[0].name()).to.equal('rect2');
    expect(layer.children[1].name()).to.equal('rect1');
    expect(layer.children[2].name()).to.equal('rect3');

    kids = [
      <Rect key="4" name="rect4" />,
      <Rect key="2" name="rect2" />,
      <Rect key="1" name="rect1" />,
      <Rect key="3" name="rect3" />,
    ];
    await rerender(<App kids={kids} />);

    expect(layer.children[0].name()).to.equal('rect4');
    expect(layer.children[1].name()).to.equal('rect2');
    expect(layer.children[2].name()).to.equal('rect1');
    expect(layer.children[3].name()).to.equal('rect3');
  });

  it('changing order should not stop dragging', async function () {
    class App extends React.Component {
      render() {
        return (
          <Stage width={300} height={300}>
            <Layer>{this.props.kids}</Layer>
          </Stage>
        );
      }
    }

    let kids = [
      <Rect key="1" name="rect1" />,
      <Rect key="2" name="rect2" />,
      <Rect key="3" name="rect3" />,
    ];
    const { stage, rerender } = await render(<App kids={kids} />);
    const layer = stage.children[0];

    const rect1 = layer.findOne('.rect1');

    await React.act(() => {
      layer.getStage().simulateMouseDown({ x: 5, y: 5 });
    });
    await React.act(() => {
      rect1.startDrag();
    });
    await React.act(() => {
      // move mouse
      layer.getStage().simulateMouseMove({ x: 10, y: 10 });
    });

    expect(rect1.isDragging()).to.equal(true);

    kids = [
      <Rect key="3" name="rect3" />,
      <Rect key="1" name="rect1" />,
      <Rect key="2" name="rect2" />,
    ];
    await rerender(<App kids={kids} />);

    expect(rect1.isDragging()).to.equal(true);
    rect1.stopDrag();
  });

  it('check events subscribe', async function () {
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
    const { stage } = await render(<App />);

    expect(stage.findOne('Rect').fill()).to.equal('black');

    await React.act(() => {
      stage.simulateMouseDown({ x: 50, y: 50 });
    });
    await React.act(() => {
      stage.simulateMouseMove({ x: 55, y: 55 });
    });
    window.stage = stage;
    expect(stage.findOne('Rect').isDragging()).to.equal(true);
    expect(stage.findOne('Rect').fill()).to.equal('red');
  });
});

describe('Test context API', async function () {
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
              <Stage width={width} height={height}>
                <Layer />
              </Stage>
            )}
          </Consumer>
        </Provider>
      );
    }
  }

  it('test correct set', async function () {
    const { stage } = await render(<App />);
    expect(stage.width()).to.equal(200);
    expect(stage.height()).to.equal(100);
  });
});

// wait for react team response
describe('Test nested context API', async function () {
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
        <Stage width={300} height={200}>
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

  it('test correct set', async function () {
    const { stage } = await render(<App />);
    expect(stage.findOne('Rect').fill()).to.equal('black');
  });
});

// wait for react team response
describe('try lazy and suspense', async function () {
  it('can use lazy and suspense', async function () {
    let resolvePromise;
    const LazyRect = React.lazy(() => {
      return new Promise((resolve) => {
        resolvePromise = resolve;
      });
    });

    class App extends React.Component {
      render() {
        return (
          <Stage width={300} height={300}>
            <Layer>
              <React.Suspense fallback={<Text text="fallback" />}>
                <LazyRect />
              </React.Suspense>
            </Layer>
          </Stage>
        );
      }
    }
    const { stage } = await render(<App />);
    expect(stage.find('Text').length).to.equal(1);
    expect(stage.find('Shape').length).to.equal(1);

    await React.act(() => {
      resolvePromise({
        default: () => <Rect />,
      });
    });
    expect(stage.find('Text').length).to.equal(0);
    expect(stage.find('Rect').length).to.equal(1);
    expect(stage.find('Shape').length).to.equal(1);
  });

  it('suspends whole stage', async () => {
    let promiseResolve;
    const LazyDiv = React.lazy(() => {
      return new Promise((resolve) => {
        promiseResolve = resolve;
      });
    });

    const Canvas = () => {
      return (
        <Stage width={300} height={300} draggable>
          <Layer>
            <Rect width={100} height={100} fill="red" />
          </Layer>
        </Stage>
      );
    };
    class App extends React.Component {
      render() {
        return (
          <div>
            <React.Suspense fallback={<div />}>
              {this.props.showLazy && <LazyDiv />}
              <Canvas />
            </React.Suspense>
          </div>
        );
      }
    }

    // render without lazy first
    const { stage, rerender } = await render(<App showLazy={false} />);
    expect(stage.draggable()).to.equal(true);
    // then show lazy
    await rerender(<App showLazy={true} />);
    // wait till lazy component is loaded
    await React.act(() => {
      promiseResolve({ default: () => <div /> });
    });
    let lastStage = Konva.stages[Konva.stages.length - 1];
    // make sure all properties are set correctly
    expect(lastStage).to.not.equal(stage);
    expect(lastStage.draggable()).to.equal(true);
  });
});

describe('Fragments', async function () {
  const Fragmented = () => (
    <React.Fragment>
      <Rect />
      <Rect />
    </React.Fragment>
  );

  class App extends React.Component {
    render() {
      return (
        <Stage width={300} height={300}>
          <Layer>
            <Fragmented />
          </Layer>
        </Stage>
      );
    }
  }

  it('can use lazy and suspense', async function () {
    const { stage } = await render(<App />);
    expect(stage.find('Rect').length).to.equal(2);
  });
});

describe('warnings', async function () {
  class App extends React.Component {
    render() {
      return (
        <Stage width={300} height={300}>
          <Layer>
            <Rect draggable x={0} y={0} />
          </Layer>
        </Stage>
      );
    }
  }

  it('check draggable warning', async function () {
    const { stage } = await render(<App />);
  });
});

describe('Hooks', async function () {
  it('check setState hook', async function () {
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
    const { stage } = await render(<App />);

    expect(stage.findOne('Rect').fill()).to.equal('black');
    await React.act(() => {
      stage.simulateMouseDown({ x: 50, y: 50 });
    });
    expect(stage.findOne('Rect').fill()).to.equal('red');
  });

  it('check useEffect hook', async function () {
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
    const { stage, rerender } = await render(<App />);

    expect(callCount).to.equal(1);

    rerender(<App randomProp={1} />);

    expect(callCount).to.equal(2);
  });

  it('check useEffect hook 2', async function () {
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
    const { stage } = await render(<App />);

    const rect = stage.findOne('Rect');

    expect(rect.name()).to.equal('rect name');
    expect(callCount).to.equal(2);
  });

  it('check useImage hook', async function () {
    const url = 'https://konvajs.org/favicon-32x32.png?token' + Math.random();

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
    const { stage } = await render(<App />);

    // not image while loading
    expect(stage.findOne('Image').image()).to.equal(undefined);
    expect(stage.findOne('Text').text()).to.equal('loading');

    const img = new window.Image();
    img.src = url;
    await new Promise((resolve) => {
      img.onload = () => {
        setTimeout(() => resolve(null), 50);
      };
    });
    expect(stage.findOne('Image').image() instanceof window.Image).to.equal(
      true
    );
    expect(stage.findOne('Text').text()).to.equal('loaded');
  });

  it('unsubscribe on unmount', async function () {
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
    const { stage } = await render(<App />);

    // not image while loading
    expect(stage.findOne('Image').image()).to.equal(undefined);
    expect(stage.findOne('Text').text()).to.equal('loading');

    const img = new window.Image();
    img.src = url;
    await new Promise((resolve) => {
      img.onload = () => {
        setTimeout(() => resolve(null), 50);
      };
    });
  });
});

describe('external', () => {
  it('make sure node has _applyProps for react-spring integration', async function () {
    class App extends React.Component {
      render() {
        return (
          <Stage width={300} height={300}>
            <Layer>
              <Rect fill="red" />
            </Layer>
          </Stage>
        );
      }
    }

    const { stage } = await render(<App />);
    expect(typeof stage.findOne('Rect')._applyProps).to.equal('function');
  });
});

// reference for the test: https://github.com/konvajs/react-konva/issues/748
describe('update order', () => {
  const store = {
    listeners: [],
    state: {
      name: 'test',
    },
    getState() {
      return store.state;
    },
    subscribe(cb) {
      this.listeners.push(cb);
    },
    async dispatch() {
      await Promise.resolve();

      this.state = {
        name: 'test2',
      };
      this.listeners.forEach((cb) => cb());
    },
  };

  function useSelector(selector) {
    return React.useSyncExternalStore(
      (callback) => store.subscribe(callback),
      () => store.getState(),
      undefined,
      selector
    );
  }

  const App = () => {
    return (
      <Stage width={window.innerWidth} height={window.innerHeight}>
        <ViewLayer />
      </Stage>
    );
  };

  const renderCallStack = [];
  function ViewLayer() {
    renderCallStack.push('ViewLayer');

    useSelector((state) => state.name);

    return (
      <Layer>
        <ViewText />
      </Layer>
    );
  }

  function ViewText() {
    renderCallStack.push('ViewText');

    const name = useSelector((state) => state.name);

    return <Text text={name} fontSize={15} />;
  }

  it.skip('update order', async function () {
    const { stage } = await render(<App />);
    await store.dispatch();
    expect(renderCallStack).to.deep.equal([
      'ViewLayer',
      'ViewText',
      'ViewLayer',
      'ViewText',
    ]);
  });
});
