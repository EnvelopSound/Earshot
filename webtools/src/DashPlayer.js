import dashjs from "dashjs";
import React from "react";

import Divider from '@material-ui/core/Divider';
import Typography from '@material-ui/core/Typography';

import DashStreamInfo from "./DashStreamInfo.js";
import GainSliderBox from "./GainSliderBox.js";
import VideoInfo from "./VideoInfo.js";

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

    return (
      <div className="VideoBox InfoBox">
        {video}
        {this.state.videoAdaptationSets && (
          <VideoInfo
            videoAdaptationSets={this.state.videoAdaptationSets}
          />
        )}
      </div>
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
