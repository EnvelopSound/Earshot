import React from "react";
import PropTypes from "prop-types";

import Slider from "@material-ui/core/Slider";

const NUM_STEPS = 10;

class GainSlider extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: 0,
    };
  }

  componentDidUpdate(prevProps) {
    const { streamUrl } = this.props;
    if (prevProps.streamUrl !== streamUrl) {
      this.resetValue();
    }
  }

  resetValue() {
    this.setState({ value: 0 });
  }

  render() {
    const { maxValue, onChange } = this.props;
    const { value } = this.state;

    return (
      <Slider
        aria-labelledby="continuous-slider"
        max={maxValue}
        min={0}
        step={maxValue / NUM_STEPS}
        style={{ color: "#006675" }}
        onChange={(event, newValue) => {
          this.setState({ value: newValue });
          onChange(newValue);
        }}
        value={value}
      />
    );
  }
}

GainSlider.propTypes = {
  maxValue: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  streamUrl: PropTypes.string.isRequired,
};

export default GainSlider;
