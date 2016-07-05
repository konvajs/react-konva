import React from 'react';
import { expect } from 'chai';
import { shallow, mount, render } from 'enzyme';
import {Stage, Layer, Rect} from '../src/react-konva';
import './mocking';
import Konva from 'konva';
import sinon from 'sinon';


describe("Test references", function() {
  let instance;
  class App extends React.Component {
    render() {
      return (
        <Stage ref="stage" width={300} height={300}>
          <Layer ref="layer">
          </Layer>
        </Stage>
      );
    }
  }

  beforeEach(() => {
    const wrapper = mount(<App/>);
    instance = wrapper.instance();
  });

  it("can get stage instance", function() {
    const stageRef = instance.refs.stage;
    expect(stageRef.getStage() instanceof Konva.Stage).to.equal(true);
  });

  it("check initial props set", function() {
    const stage = instance.refs.stage.getStage();
    expect(stage.width()).to.equal(300);
    expect(stage.height()).to.equal(300);
  });

  it("can get layer instance", function() {
    expect(instance.refs.layer instanceof Konva.Layer).to.equal(true);
  });
});

describe("Test stage component", function() {
  it('can attach stage events', function() {
    let eventCount = 0;
    const handleEvent = () => {
      eventCount += 1;
    };

    class App extends React.Component {
      render() {
        return (
          <Stage ref="stage" width="300" height="300" onMouseDown={handleEvent}>
            <Layer ref="layer">
              <Rect ref="rect" width={100} height={100}/>
            </Layer>
          </Stage>
        );
      }
    }

    const wrapper = mount(<App/>);
    const instance = wrapper.instance();
    const stage = instance.refs.stage.getStage();
    stage.simulateMouseDown({x: 50, y: 50});
    expect(eventCount).to.equal(1);
  });
});

describe('Test props setting', function() {
  let instance, wrapper, rectProps = {
    width: 100, height: 100, onClick: () => {}
  };
  class App extends React.Component {
    render() {
      return (
        <Stage ref="stage" width={300} height={300}>
          <Layer ref="layer">
            <Rect ref="rect" {...this.props.rectProps}/>
          </Layer>
        </Stage>
      );
    }
  }

  beforeEach(() => {
    wrapper = mount(<App/>);
    instance = wrapper.instance();
  });

  it('can update component props', () => {
    const rect = instance.refs.rect;
    // set new props
    const props1 = {
      width: 100, height: 100
    };
    wrapper.setProps({rectProps: props1});
    expect(rect.width()).to.equal(100);

    const props2 = {
      width: 200, height: 100
    };
    wrapper.setProps({rectProps: props2});
    expect(rect.width()).to.equal(200);
  });
  it('can update component events', () => {
    const rect = instance.refs.rect;
    // set new props
    const props1 = {
      onClick: () => {}
    };
    wrapper.setProps({rectProps: props1});
    expect(rect.eventListeners.click.length).to.equal(1);
    expect(rect.eventListeners.click[0].handler).to.equal(props1.onClick);

    const props2 = {
      onClick: () => {}
    };
    wrapper.setProps({rectProps: props2});
    expect(rect.eventListeners.click.length).to.equal(1);
    expect(rect.eventListeners.click[0].handler).to.equal(props2.onClick);
  });

  it('updating props should call layer redraw', () => {
    const layer = instance.refs.layer;
    sinon.spy(layer, 'batchDraw');
    wrapper.setProps({rectProps: {
      fill: 'green'
    }});
    wrapper.setProps({rectProps: {
      fill: 'red'
    }});
    expect(layer.batchDraw.callCount).to.equal(2);
  });

  it('unset props', () => {
    const rect = instance.refs.rect;
    wrapper.setProps({rectProps: {
    fill: 'red',
    x: 10
    }});
    expect(rect.fill()).to.equal('red');

    wrapper.setProps({rectProps: {}});
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
      this.props.componentDidUpdate();
    }
    render() {
      return <Rect/>;
    }
  }
  class App extends React.Component {
    render() {
      return (
        <Stage ref="stage" width={300} height={300}>
          <Layer ref="layer">
            { this.props.skipsub ? null : <SubComponent {...this.props}/>}
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
    wrapper = mount(<App {...props}/>);

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
    wrapper = mount(<App {...props}/>);
    wrapper.update();

    expect(props.componentWillReceiveProps.called).to.equal(true);
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
    wrapper = mount(<App {...props}/>);
    const stage = wrapper.instance().refs.stage.getStage();
    expect(stage.findOne('Rect')).to.not.equal(undefined);

    props.skipsub = props;
    wrapper.setProps(props);
    expect(stage.findOne('Rect')).to.equal(undefined);
    // This line don't work... why????
    // expect(props.componentWillUnmount.called).to.equal(true);
  });
});
