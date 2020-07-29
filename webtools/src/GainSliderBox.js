import React from "react";

import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/core/Slider';
import VolumeDown from '@material-ui/icons/VolumeDown';
import VolumeUp from '@material-ui/icons/VolumeUp';

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
    style={{ color: "#006675" }}
    step={SLIDER_MAX_VALUE / 10}
    min={0}
    max={SLIDER_MAX_VALUE}
    value={this.state.value}
    onChange={
      (event, newValue) => {
        this.setState({ value: newValue }); this.props.onChange(newValue);
      }
    }
    aria-labelledby="continuous-slider"
      />
    );
  }
}

export default class GainSliderBox extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      audioContext: null,
      videoPlayer: null,
    };
  }

  componentDidMount() {
    this.setupAudio(this.props.numChannels);
  }

  componentWillUnmount() {
    this.state.audioContext.close();
    this.state.mediaElemSource.disconnect();
  }

  render() {
    const sliders =  [];
    for (let i = 0; i < this.props.numChannels; i++) {
      let v = i;
      sliders.push(
        (
          <Grid key={i}
            container
            style={{ background: '#D3D3D3', color: 'black' }}
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
              <VolumeUp style={{ fontSize: "1.7rem" }}  />
            </Grid>
          </Grid>
        )
      );
    }
    return sliders;
  }

  setupAudio(numChannels) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;

    // Possible bug in Opera thats require resume context
    if (AudioContext.hasOwnProperty('resume')) {
      AudioContext.resume();
    }

    const videoPlayer = this.props.videoPlayer;

    let audioContext, mediaElemSource;
    if (this.state.audioContext) {
      audioContext = this.state.audioContext;
      mediaElemSource = this.state.mediaElemSource;
    } else {
      audioContext = new AudioContext();
      mediaElemSource = audioContext.createMediaElementSource(videoPlayer);
      this.setState({ audioContext, mediaElemSource });
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
      gainNodes,
      sliderValues: this.getDefaultSliderValues(numChannels),
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
    let videoPlayer = this.props.videoPlayer;
    if (videoPlayer.muted) {
      videoPlayer.muted = false;
    }
    if (this.state.gainNodes) {
      let gainNode = this.state.gainNodes[channel];
      gainNode.gain.value = sliderValue / SLIDER_MAX_VALUE;
    }
  }

  resetGainNodes() {
    const gainNodes = this.state.gainNodes.map((gainNode) => { gainNode.gain.value = 0; return gainNode; });
    this.setState({ gainNodes, sliderValues: [] });
  }

}
