var React = require('react');
const { expect } = require('chai');
var { shallow, mount, render } = require('enzyme');
var {Stage, Layer}  = require('../src/react-konva');
import Konva from 'konva';

class App extends React.Component {
    render() {
        return (
            <Stage ref="stage" width="300" height="300">
                <Layer ref="layer">
                </Layer>
            </Stage>
        );
    }
}

describe("Test references", function() {
    it("can get stage instance", function() {
        const wrapper = mount(<App/>);
        const instance = wrapper.instance();
        const stageRef = instance.refs.stage;
        expect(stageRef.getStage() instanceof Konva.Stage).to.equal(true);
    });
    it("can get layer instance", function() {
        const wrapper = mount(<App/>);
        const instance = wrapper.instance();
        expect(instance.refs.layer instanceof Konva.Layer).to.equal(true);
    });
});
