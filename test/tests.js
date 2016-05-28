import React from 'react';
import { expect } from 'chai';
import { shallow, mount, render } from 'enzyme';
import {Stage, Layer, Rect} from '../src/react-konva';
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

describe.only('Test props setting', function() {
    it('test', () => {
        const wrapper = shallow(<Rect fill="black"/>);
        console.log(wrapper);
        // const instance = wrapper.instance();
        // expect(instance.node instanceof Konva.Rect).to.equal(true);
    });
});
