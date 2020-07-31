import React from "react";

import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import Slider from "@material-ui/core/Slider";
import VolumeDown from "@material-ui/icons/VolumeDown";
import VolumeUp from "@material-ui/icons/VolumeUp";

import { audioContext, mediaElemSource, videoPlayer } from "./Video.js";

const SLIDER_MAX_VALUE = 200;

class GainSlider extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: 0,
    };
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.streamUrl !== this.props.streamUrl) {
      // reset value
      this.setState({ value: 0 });
    }
  }

  render() {
    return (
      <Slider
        aria-labelledby="continuous-slider"
        max={SLIDER_MAX_VALUE}
        min={0}
        step={SLIDER_MAX_VALUE / 10}
        style={{ color: "#006675" }}
        onChange={(event, newValue) => {
          this.setState({ value: newValue });
          this.props.onChange(newValue);
        }}
        value={this.state.value}
      />
    );
  }
}

export default class GainSliderBox extends React.Component {
  componentDidMount() {
    this.setupAudio(this.props.numChannels);
  }

  componentWillUnmount() {
    mediaElemSource.disconnect();
    for (let i = 0; i < this.state.gainNodes.length; i++) {
      this.state.gainNodes[i].disconnect();
    }
    this.state.merger.disconnect();
  }

  render() {
    const sliders = [];
    for (let i = 0; i < this.props.numChannels; i++) {
      let v = i;
      sliders.push(
        <Grid
          key={i}
          container
          style={{ background: "#D3D3D3", color: "black" }}
        >
          <Grid item xs={4}>
            <Typography variant="subtitle1" gutterBottom>
              Channel {i}
            </Typography>
          </Grid>
          <Grid item xs={1}>
            <VolumeDown style={{ fontSize: "1.7rem" }} />
          </Grid>
          <Grid item xs={5} style={{ margin: "0px 4px 0px 4px" }}>
            <GainSlider
              onChange={(newValue) => this.setGain(v, newValue)}
              streamUrl={this.props.streamUrl}
            />
          </Grid>
          <Grid item>
            <VolumeUp style={{ fontSize: "1.7rem" }} />
          </Grid>
        </Grid>
      );
    }
    return sliders;
  }

  setupAudio(numChannels) {
    // Possible bug in Opera thats require resume context
    if (audioContext.hasOwnProperty("resume")) {
      audioContext.resume();
    }

    // Create and connect ChannelSplitterNode
    const splitter = audioContext.createChannelSplitter(numChannels);
    mediaElemSource.connect(splitter);

    // Create ChannelMergerNode
    const merger = audioContext.createChannelMerger(numChannels);

    // GAIN CONNECT
    const gainNodes = [];

    for (let i = 0; i < numChannels; i++) {
      // Create Gain
      const gain = audioContext.createGain();
      gainNodes.push(gain);
      splitter.connect(gain, i, 0);
      gain.connect(merger, 0, 0);
      gain.connect(merger, 0, 1);
      gain.gain.value = 0;
    }

    merger.connect(audioContext.destination);

    this.setState({
      merger,
      gainNodes,
      sliderValues: this.getDefaultSliderValues(numChannels),
      splitter,
    });
  }

  getDefaultSliderValues(numChannels) {
    // setup slidervalues
    let sliderValues = [];
    for (let i = 0; i < numChannels; i++) {
      sliderValues[i] = 0;
    }

    return sliderValues;
  }

  setGain(channel, sliderValue) {
    if (videoPlayer.muted) {
      videoPlayer.muted = false;
    }
    if (this.state.gainNodes) {
      let gainNode = this.state.gainNodes[channel];
      gainNode.gain.value = sliderValue / SLIDER_MAX_VALUE;
    }
  }

  resetGainNodes() {
    const gainNodes = this.state.gainNodes.map((gainNode) => {
      gainNode.gain.value = 0;
      return gainNode;
    });
    this.setState({ gainNodes, sliderValues: [] });
  }
}
