import React from "react";
import { withRouter } from "react-router-dom";
import history from "./history";
import QueryString from "query-string"

import dashjs from "dashjs";

import Divider from '@material-ui/core/Divider';
import Typography from '@material-ui/core/Typography';

import DashSettings from "./DashSettings.js";
import DashStreamInfo from "./DashStreamInfo.js";
import GainSliderBox from "./GainSliderBox.js";
import VideoInfo from "./VideoInfo.js";

const POLLING_INTERVAL = 1000;
const STABLE_BUFFER_TIME = 120;
const BUFFER_TIME_AT_TOP_QUALITY = 120;

// this is a ridiciulously high number as there is some issue
// with empty segmentTimelines with fresh livestreams.
//
// TODO: fix, but probably is an rtmp-nginx issue
const MANIFEST_LOAD_RETRY_INTERVAL = 50000;

const DEFAULT_CLIENT_SETTINGS = {
  streaming: {
    useSuggestedPresentationDelay: false,
    lowLatencyEnabled: false,
    stableBufferTime: STABLE_BUFFER_TIME,
    bufferTimeAtTopQualityLongForm: BUFFER_TIME_AT_TOP_QUALITY,
    retryIntervals: {
      MPD: MANIFEST_LOAD_RETRY_INTERVAL
    },
    retryAttempts: {
      MPD: 3
    },
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

class DashPlayer extends React.Component {
  constructor(props) {
    super(props);
    this.state = DEFAULT_STATE;
  }

  componentDidMount() {
    this.load(this.props.streamUrl);
  }

  componentDidUpdate(prevProps) {
    if (this.props.streamUrl !== prevProps.streamUrl) {
      this.setState(DEFAULT_STATE);
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
    const settings = this.getCurrentSettings();
    dashPlayer.updateSettings(settings);
    dashPlayer.initialize(document.querySelector("#videoPlayer"), url, true);

    dashPlayer.on(dashjs.MediaPlayer.events.MANIFEST_LOADED, (event) => {
      const data = event.data;
      const audioAdaptationSet = data.Period.AdaptationSet_asArray.find(elem => elem.contentType === "audio");
      const videoAdaptationSets = data.Period.AdaptationSet_asArray.filter(elem => elem.contentType === "video");
      const numChannels = audioAdaptationSet.Representation.AudioChannelConfiguration.value;
      if (this.state.isLoading) {
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
      this.setState({
        isLoading: false,
        error: error.error.message,
      });
    });

    this.setState({
      dashPlayer,
    });
  }

  getCurrentSettings() {
    const params = QueryString.parse(this.props.location.search);
    const settings = params.settings ? JSON.parse(params.settings) : DEFAULT_CLIENT_SETTINGS;
    return settings;
  }

  render() {
    let body;
    if (this.state.isLoading) {
      body = (
        <div className="SearchingOrLoadingStreamsContainer">
          <div className="SearchingOrLoadingStreamsText">
             Loading {this.props.streamName}...
            <br />
            (it may take up to a minute for the stream to warm up...)
          </div>
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
            <GainSliderBox
              numChannels={this.state.numChannels}
              streamUrl={this.props.streamUrl}
              videoPlayer={document.querySelector("#videoPlayer")}
            />
          </div>
          <div className="StreamInfoBox">
            <DashStreamInfo
              audioBitRate={this.state.audioBitRate}
              audioBufferLevel={this.state.audioBufferLevel}
              availabilityStartTime={this.state.availabilityStartTime}
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

  renderVideoElement() {
    return (
      <video
        className="VideoPlayer"
        id="videoPlayer"
        muted
      />
    );
  }

  renderHiddenVideoElementDiv() {
    return (
      <div style={{ display: "none" }}>
        {this.renderVideoElement()}
      </div>
    );
  }

  renderVideoBox() {
    const isAudioOnly = !this.state.isLoading && !this.state.videoAdaptationSets.length;

    if (this.state.isLoading) {
      return this.renderHiddenVideoElementDiv();
    } else if (isAudioOnly) {
      return (
        <div className="VideoBox InfoBox">
          <div className="AudioOnlyBox">
            Audio-only Stream
          </div>
          {this.renderHiddenVideoElementDiv()}
          {this.renderDashSettings()}
        </div>
      );
    } else {
      return (
        <div className="VideoBox InfoBox">
          {this.renderVideoElement()}
          {this.state.videoAdaptationSets && (
            <VideoInfo
              videoAdaptationSets={this.state.videoAdaptationSets}
            />
          )}
          {this.renderDashSettings()}
        </div>
      );
    }
  }

  renderDashSettings() {
    return (
      <DashSettings
        clientSettings={this.getCurrentSettings()}
        onChange={(settings) => {
          this.state.dashPlayer.updateSettings(settings);
          history.push(`/webtools/?settings=${JSON.stringify(settings)}`)
        }}
      />
    );
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

export default withRouter(DashPlayer);
