import dashjs from "dashjs";
import React from "react";

import DashStreamInfo from "./DashStreamInfo.js";
import VideoInfo from "./VideoInfo.js";
import Divider from '@material-ui/core/Divider';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/core/Slider';
import VolumeDown from '@material-ui/icons/VolumeDown';
import VolumeUp from '@material-ui/icons/VolumeUp';

const SLIDER_MAX_VALUE = 200;
const POLLING_INTERVAL = 1000;
const STABLE_BUFFER_TIME = 120;
const BUFFER_TIME_AT_TOP_QUALITY = 120;

const CLIENT_SETTINGS = {
  streaming: {
    useSuggestedPresentationDelay: false,
    lowLatencyEnabled: false,
    stableBufferTime: STABLE_BUFFER_TIME,
    bufferTimeAtTopQualityLongForm: BUFFER_TIME_AT_TOP_QUALITY,
    retryIntervals: {
      MPD: 5000,
    },
    retryAttempts: {
      MPD: 5,
    }
  }
};

const DEFAULT_STATE = {
  isLoading: true,
  audioBufferLevel: null,
  audioBitRate: null,
  availabilityStartTime: null,
  dashProfiles: null,
  liveLatency: null,
  minUpdatePeriod: null,
  numChannels: null,
  suggestedPresentationDelay: null,
  urlLoaded: false,
  videoAdaptationSets: null,
};

export default class DashPlayer extends React.Component {
  state = DEFAULT_STATE;

  componentDidMount() {
    this.load(this.props.streamUrl);
  }

  componentDidUpdate(prevProps) {
    if (this.props.streamUrl !== prevProps.streamUrl) {
      this.setState(DEFAULT_STATE);
      this.resetGainNodes();
      this.load(this.props.streamUrl);
    }
  }

  load(url) {
    if (this.state.dashPlayer) {
      // if stream is being updated, just update the URL
      this.state.dashPlayer.attachSource(url);
      return;
    }

    const dashPlayer = dashjs.MediaPlayer().create();
    dashPlayer.updateSettings(CLIENT_SETTINGS);

    dashPlayer.initialize(document.querySelector("#videoPlayer"), url, true);
    dashPlayer.on(dashjs.MediaPlayer.events.MANIFEST_LOADED, (event) => {
      const data = event.data;
      const audioAdaptationSet = data.Period.AdaptationSet_asArray.find(elem => elem.contentType === "audio");
      const videoAdaptationSets = data.Period.AdaptationSet_asArray.filter(elem => elem.contentType === "video");
      const numChannels = audioAdaptationSet.Representation.AudioChannelConfiguration.value;
      if (this.state.isLoading) {
        this.setupAudio({ numChannels });
        this.setupStreamInfo();
      }
      this.setState({
        audioAdapationSet: audioAdaptationSet,
        availabilityStartTime: data.availabilityStartTime,
        dashProfiles: data.profiles,
        isLoading: false,
        liveLatency: dashPlayer.getCurrentLiveLatency(),
        minUpdatePeriod: data.minimumUpdatePeriod,
        numChannels,
        suggestedPresentationDelay: data.suggestedPresentationDelay,
        videoAdaptationSets: videoAdaptationSets,
      });
    });
    dashPlayer.on(dashjs.MediaPlayer.events.ERROR, (error) => {
      if (error.error.code === dashjs.MediaPlayer.errors.DATA_UPDATE_FAILED_ERROR_CODE) {
        // these errors may happen in the first few seconds of stream loading, ignore
        return;
      } else if (error.error.code === dashjs.MediaPlayer.errors.DOWNLOAD_ERROR_ID_CONTENT_CODE) {
        // these errors may happen in the first few seconds of stream loading, ignore
        return;
      } else if (error.error.code === dashjs.MediaPlayer.errors.DOWNLOAD_ERROR_ID_MANIFEST_CODE) {
        // these errors may happen in the first few seconds of stream loading, ignore
        return;
      }
      this.setState({
        isLoading: false,
        error: error.error.message,
      });
    });
    this.setState({
      dashPlayer,
    });
  }

  render() {
    let body;
    if (this.state.isLoading) {
      body = (
        <div>
          Loading...
        </div>
      );
    } else if (this.state.error) {
      body = (
        <div className="ErrorBox">
          {this.state.error}
        </div>
      );
    } else {
      body = (
        <>
          <div className="SliderBox InfoBox">
            <Typography
              variant="h6"
              gutterBottom
            >
              Audio Preview
            </Typography>
            <Divider />
            {this.renderGainSliders()}
          </div>
          <div className="StreamInfoBox">
            <DashStreamInfo
              audioBitRate={this.state.audioBitRate}
              audioBufferLevel={this.state.audioBufferLevel}
              availabilityStartTime={this.state.availabilityStartTime}
              clientSettings={CLIENT_SETTINGS}
              dashProfiles={this.state.dashProfiles}
              liveLatency={this.state.liveLatency}
              minUpdatePeriod={this.state.minUpdatePeriod}
              numChannels={this.state.numChannels}
              streamName={this.props.streamName}
              streamUrl={this.props.streamUrl}
              suggestedPresentationDelay={this.state.suggestedPresentationDelay}
            />
          </div>
        </>
      );
    }

    return (
      <div className="StreamInfoContainer">
        {this.renderVideoBox()}
        {body}
      </div>
    );
  }

  renderVideoBox() {
    const isAudioOnly = !this.state.isLoading && !this.state.videoAdaptationSets;
    let video = (
      <div>
        {isAudioOnly && (
          <div className="AudioOnlyBox">
            Audio-only Stream
          </div>
        )}
        <video
          className="VideoPlayer"
          id="videoPlayer"
          hidden={isAudioOnly}
          muted
        />
      </div>
    );

    const videoPlayer = document.querySelector("#videoPlayer");
    return (
      <div className="VideoBox InfoBox">
        {video}
        {!this.state.isLoading && !this.state.error && (
          <div className="ButtonBox">
            <Button
              className="VideoControlButton"
              disabled={this.state.isLoading || !videoPlayer.paused}
              onClick={() => { videoPlayer.play(); }}
            >
              Play
            </Button>
            <Button
              disabled={this.state.isLoading || videoPlayer.paused}
              className="VideoControlButton"
              onClick={() => { videoPlayer.pause(); }}
            >
              Pause
            </Button>
          </div>
        )}
        {this.state.videoAdaptationSets && (
          <VideoInfo
            videoAdaptationSets={this.state.videoAdaptationSets}
          />
        )}
      </div>
    );
  }

  renderGainSliders() {
    const sliders =  [];
    for (let i = 0; i < this.state.numChannels; i++) {
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
              <Slider
                style={{ color: "#006675" }}
                min={0}
                max={SLIDER_MAX_VALUE}
                defaultValue={0}
                id={"gain" + i}
                onChange={(event, newValue) => this.setGain(v, newValue / SLIDER_MAX_VALUE)}
                aria-labelledby="continuous-slider"
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

  setupAudio({ numChannels }) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;

    // Possible bug in Opera thats require resume context
    if (AudioContext.hasOwnProperty('resume')) {
      AudioContext.resume();
    }

    const audioContext = new AudioContext();

    this.setState({ audioContext });
    const audioElement2 = document.querySelector("#videoPlayer");
    const source = audioContext.createMediaElementSource(audioElement2);

    // Create and connect ChannelSplitterNode
    const splitter = audioContext.createChannelSplitter(numChannels);
    source.connect(splitter);

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

    this.setState({ gainNodes });

    merger.connect(audioContext.destination);
  }

  setGain(channel, value) {
    let videoPlayer = document.querySelector("#videoPlayer");
    if (videoPlayer.muted) {
      videoPlayer.muted = false;
    }
    if (this.state.gainNodes && value) {
      let gainNode = this.state.gainNodes[channel];
      gainNode.gain.value = value;
    }
  }

  resetGainNodes() {
    this.state.gainNodes.forEach((gainNode) => { gainNode.gain.value = 0; });
  }

  setupStreamInfo() {
    const player = this.state.dashPlayer;
    setInterval(() => {
      const activeStream = player.getActiveStream();
      if  (!activeStream) {
        return;
      }
      const streamInfo = activeStream.getStreamInfo();
      const dashMetrics = player.getDashMetrics();
      const dashAdapter = player.getDashAdapter();

      if (dashMetrics && streamInfo) {
        const periodIdx = streamInfo.index;
        const repSwitch = dashMetrics.getCurrentRepresentationSwitch('audio', true);
        const audioBufferLevel = dashMetrics.getCurrentBufferLevel('audio', true);
        const audioBitRate = repSwitch ? Math.round(dashAdapter.getBandwidthForRepresentation(repSwitch.to, periodIdx) / 1000) : NaN;
        this.setState({
          audioBitRate,
          audioBufferLevel,
        });
      }
    }, POLLING_INTERVAL);

  }

}
