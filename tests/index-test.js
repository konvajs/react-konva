import React from 'react';
import { expect } from 'chai';
import { shallow, mount, render, configure } from 'enzyme';
import { Stage, Layer, Rect, Group } from '../src/index';
import './mocking';
import Konva from 'konva';
import sinon from 'sinon';

import Adapter from 'enzyme-adapter-react-16';

configure({ adapter: new Adapter() });

describe('Test references', function() {
  let instance;
  class App extends React.Component {
    render() {
      return (
        <Stage width={300} height={300} ref={node => (this.stage = node)}>
          <Layer ref={node => (this.layer = node)} />
        </Stage>
      );
    }
  }

  beforeEach(() => {
    const wrapper = mount(<App />);
    instance = wrapper.instance();
  });

  it('can get stage instance', function() {
    const stageRef = instance.stage;
    expect(stageRef.getStage() instanceof Konva.Stage).to.equal(true);
  });

  it('check initial props set', function() {
    const stage = instance.stage.getStage();
    expect(stage.width()).to.equal(300);
    expect(stage.height()).to.equal(300);
  });

  it('can get layer instance', function() {
    expect(instance.layer instanceof Konva.Layer).to.equal(true);
  });
});

describe('Test stage component', function() {
  it('can attach stage events', function() {
    let eventCount = 0;
    const handleEvent = () => {
      eventCount += 1;
    };

    class App extends React.Component {
      render() {
        return (
          <Stage
            ref={node => (this.stage = node)}
            width="300"
            height="300"
            onMouseDown={handleEvent}
          >
            <Layer ref={node => (this.layer = node)}>
              <Rect ref={node => (this.rect = node)} width={100} height={100} />
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

  it('can attach stage content events', function() {
    let eventCount = 0;
    const handleEvent = () => {
      eventCount += 1;
    };

    class App extends React.Component {
      render() {
        return (
          <Stage
            ref={node => (this.stage = node)}
            width="300"
            height="300"
            onContentMouseDown={handleEvent}
          >
            <Layer ref={node => (this.layer = node)}>
              <Rect ref={node => (this.rect = node)} width={100} height={100} />
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
          <Stage ref={node => (this.stage = node)} width="300" height="300">
            <Layer ref={node => (this.layer = node)} />
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

  it('test null event', function() {
    class App extends React.Component {
      render() {
        return (
          <Stage
            ref={node => (this.stage = node)}
            width="300"
            height="300"
            onMouseDown={null}
          >
            <Layer ref={node => (this.layer = node)}>
              <Rect ref={node => (this.rect = node)} width={100} height={100} />
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

describe('Test props setting', function() {
  let instance,
    wrapper,
    rectProps = {
      width: 100,
      height: 100,
      onClick: () => {}
    };
  class App extends React.Component {
    render() {
      return (
        <Stage ref={node => (this.stage = node)} width={300} height={300}>
          <Layer ref={node => (this.layer = node)}>
            <Rect ref={node => (this.rect = node)} {...this.props.rectProps} />
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
      height: 100
    };
    wrapper.setProps({ rectProps: props1 });
    expect(rect.width()).to.equal(100);

    const props2 = {
      width: 200,
      height: 100
    };
    wrapper.setProps({ rectProps: props2 });
    expect(rect.width()).to.equal(200);
  });
  it('can update component events', () => {
    const rect = instance.rect;
    // set new props
    const props1 = {
      onClick: () => {}
    };
    wrapper.setProps({ rectProps: props1 });
    expect(rect.eventListeners.click.length).to.equal(1);
    expect(rect.eventListeners.click[0].handler).to.equal(props1.onClick);

    const props2 = {
      onClick: () => {}
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
        fill: 'green'
      }
    });
    wrapper.setProps({
      rectProps: {
        fill: 'red'
      }
    });
    expect(layer.batchDraw.callCount).to.equal(2);
  });

  it('unset props', () => {
    const rect = instance.rect;
    wrapper.setProps({
      rectProps: {
        fill: 'red',
        x: 10
      }
    });
    expect(rect.fill()).to.equal('red');

    wrapper.setProps({ rectProps: {} });
    expect(!!rect.fill()).to.equal(false);
    expect(rect.x()).to.equal(0);
  });
});

describe('test lifecycle methods', () => {
  let instance, wrapper;

  class SubComponent extends React.Component {
    componentWillMount() {
      this.props.componentWillMount();
    }
    componentDidMount() {
      this.props.componentDidMount();
    }
    componentWillReceiveProps(newProps) {
      this.props.componentWillReceiveProps(newProps);
    }
    shouldComponentUpdate() {
      this.props.shouldComponentUpdate(...arguments);
      return true;
    }
    componentWillUpdate() {
      this.props.componentWillUpdate();
    }
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
        <Stage ref={node => (this.stage = node)} width={300} height={300}>
          <Layer ref={node => (this.layer = node)}>
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
      componentWillMount: sinon.spy(),
      componentDidMount: sinon.spy()
    };
    wrapper = mount(<App {...props} />);

    expect(props.componentWillMount.called).to.equal(true);
    expect(props.componentDidMount.called).to.equal(true);
  });

  it('test update', () => {
    const props = {
      componentWillMount: sinon.spy(),
      componentDidMount: sinon.spy(),
      componentWillReceiveProps: sinon.spy(),
      shouldComponentUpdate: sinon.spy(),
      componentWillUpdate: sinon.spy(),
      componentDidUpdate: sinon.spy(),
      componentWillUnmount: sinon.spy()
    };
    wrapper = mount(<App {...props} />);
    wrapper.setProps(props);

    expect(props.componentWillMount.called).to.equal(true);
    expect(props.shouldComponentUpdate.called).to.equal(true);
    expect(props.componentWillUpdate.called).to.equal(true);
    expect(props.componentDidUpdate.called).to.equal(true);
  });

  it('test remove', () => {
    const props = {
      componentWillMount: sinon.spy(),
      componentDidMount: sinon.spy(),
      componentWillReceiveProps: sinon.spy(),
      shouldComponentUpdate: sinon.spy(),
      componentWillUpdate: sinon.spy(),
      componentDidUpdate: sinon.spy(),
      componentWillUnmount: sinon.spy()
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

// will fail
describe.skip('Bad structure', () => {
  it('No dom inside Konva', function() {
    class App extends React.Component {
      render() {
        return (
          <Stage ref={node => (this.stage = node)} width="300" height="300">
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
// see: https://github.com/lavrton/react-konva/issues/119

describe.skip('Check id saving', () => {
  it('Konva can loose ids?', function() {
    class App extends React.Component {
      render() {
        const kids = [
          <Rect key="1" id="rect1" fill="red" />,
          <Rect key="2" id="rect2" fill="green" />
        ];
        return (
          <Stage ref={node => (this.stage = node)} width={300} height={300}>
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
  it('Draw layer on mount', function() {
    class App extends React.Component {
      render() {
        return (
          <Stage ref={node => (this.stage = node)} width={300} height={300}>
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

  it('Draw layer on node add', function() {
    class App extends React.Component {
      render() {
        return (
          <Stage ref={node => (this.stage = node)} width={300} height={300}>
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

  it('Draw layer on node remove', function() {
    class App extends React.Component {
      render() {
        return (
          <Stage ref={node => (this.stage = node)} width={300} height={300}>
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
  it('add before', function() {
    class App extends React.Component {
      render() {
        const kids = this.props.drawMany
          ? [<Rect key="1" name="rect1" />, <Rect key="2" name="rect2" />]
          : [<Rect key="2" name="rect2" />];
        return (
          <Stage ref={node => (this.stage = node)} width={300} height={300}>
            <Layer ref={node => (this.layer = node)}>{kids}</Layer>
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

  it('add before (mane)', function() {
    class App extends React.Component {
      render() {
        const kids = this.props.drawMany
          ? [
              <Rect key="1" name="rect1" />,
              <Rect key="2" name="rect2" />,
              <Rect key="3" name="rect3" />
            ]
          : [<Rect key="1" name="rect1" />, <Rect key="3" name="rect3" />];
        return (
          <Stage ref={node => (this.stage = node)} width={300} height={300}>
            <Layer ref={node => (this.layer = node)}>{kids}</Layer>
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

  it('add after', function() {
    class App extends React.Component {
      render() {
        const kids = this.props.drawMany
          ? [<Rect key="1" name="rect1" />, <Rect key="2" name="rect2" />]
          : [<Rect key="1" name="rect1" />];
        return (
          <Stage ref={node => (this.stage = node)} width={300} height={300}>
            <Layer ref={node => (this.layer = node)}>{kids}</Layer>
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

  it('change order', function() {
    class App extends React.Component {
      render() {
        return (
          <Stage ref={node => (this.stage = node)} width={300} height={300}>
            <Layer ref={node => (this.layer = node)}>{this.props.kids}</Layer>
          </Stage>
        );
      }
    }

    let kids = [
      <Rect key="1" name="rect1" />,
      <Rect key="2" name="rect2" />,
      <Rect key="3" name="rect3" />
    ];
    const wrapper = mount(<App kids={kids} />);
    const layer = wrapper.instance().layer;

    expect(layer.children[0].name()).to.equal('rect1');
    expect(layer.children[1].name()).to.equal('rect2');
    expect(layer.children[2].name()).to.equal('rect3');

    kids = [
      <Rect key="3" name="rect3" />,
      <Rect key="1" name="rect1" />,
      <Rect key="2" name="rect2" />
    ];
    wrapper.setProps({ kids });
    expect(layer.children[0].name()).to.equal('rect3');
    expect(layer.children[1].name()).to.equal('rect1');
    expect(layer.children[2].name()).to.equal('rect2');

    kids = [
      <Rect key="1" name="rect1" />,
      <Rect key="3" name="rect3" />,
      <Rect key="2" name="rect2" />
    ];
    wrapper.setProps({ kids });

    expect(layer.children[0].name()).to.equal('rect1');
    expect(layer.children[1].name()).to.equal('rect3');
    expect(layer.children[2].name()).to.equal('rect2');
  });
});

it('');
