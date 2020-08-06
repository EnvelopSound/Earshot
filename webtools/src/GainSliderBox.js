import React from "react";
import PropTypes from "prop-types";

import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import VolumeDown from "@material-ui/icons/VolumeDown";
import VolumeUp from "@material-ui/icons/VolumeUp";

import GainSlider from "./GainSlider";

import { audioContext, mediaElemSource, videoPlayer } from "./Video";

const SLIDER_MAX_VALUE = 200;

class GainSliderBox extends React.Component {
  componentDidMount() {
    const { numChannels } = this.props;
    this.setupAudio(numChannels);
  }

  componentWillUnmount() {
    const { gainNodes, merger, splitter } = this.state;
    mediaElemSource.disconnect();
    for (let i = 0; i < gainNodes.length; i += 1) {
      gainNodes[i].disconnect();
    }
    merger.disconnect();
    splitter.disconnect();
  }

  setupAudio(numChannels) {
    // Create and connect ChannelSplitterNode
    const splitter = audioContext.createChannelSplitter(numChannels);
    mediaElemSource.connect(splitter);

    // Create ChannelMergerNode
    const merger = audioContext.createChannelMerger(numChannels);

    // GAIN CONNECT
    const gainNodes = [];

    for (let i = 0; i < numChannels; i += 1) {
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
      splitter,
    });
  }

  setGain(channel, sliderValue) {
    const { gainNodes } = this.state;
    if (videoPlayer.muted) {
      videoPlayer.muted = false;
    }
    if (gainNodes) {
      const gainNode = gainNodes[channel];
      gainNode.gain.value = sliderValue / SLIDER_MAX_VALUE;
    }
  }

  resetGainNodes() {
    let { gainNodes } = this.state;
    gainNodes = gainNodes.map((gainNode) => {
      const node = gainNode;
      node.gain.value = 0;
      return node;
    });
    this.setState({ gainNodes });
  }

  render() {
    const { numChannels, streamUrl } = this.props;
    const sliders = [];
    for (let i = 0; i < numChannels; i += 1) {
      const v = i;
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
              maxValue={SLIDER_MAX_VALUE}
              onChange={(newValue) => this.setGain(v, newValue)}
              streamUrl={streamUrl}
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
}

GainSliderBox.propTypes = {
  numChannels: PropTypes.number.isRequired,
  streamUrl: PropTypes.string.isRequired,
};

export default GainSliderBox;
