import React from "react";
import { withRouter } from "react-router-dom";
import PropTypes from "prop-types";
import QueryString from "query-string";

import dashjs from "dashjs";

import Divider from "@material-ui/core/Divider";
import Typography from "@material-ui/core/Typography";
import history from "./history";

import DashSettings from "./DashSettings";
import DashStreamInfo from "./DashStreamInfo";
import GainSliderBox from "./GainSliderBox";
import { Video, videoPlayer } from "./Video";
import VideoInfo from "./VideoInfo";

const POLLING_INTERVAL = 1000;
const STABLE_BUFFER_TIME = 20;
const BUFFER_TIME_AT_TOP_QUALITY = 20;

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
      MPD: MANIFEST_LOAD_RETRY_INTERVAL,
    },
    retryAttempts: {
      MPD: 3,
    },
  },
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
    const { streamUrl } = this.props;
    this.load(streamUrl);
  }

  componentDidUpdate(prevProps) {
    const { streamUrl } = this.props;
    if (streamUrl !== prevProps.streamUrl) {
      videoPlayer.muted = true;
      this.resetStateAndLoadUrl(streamUrl);
    }
  }

  getCurrentSettings() {
    const { location } = this.props;
    const params = QueryString.parse(location.search);
    const settings = params.settings
      ? JSON.parse(params.settings)
      : DEFAULT_CLIENT_SETTINGS;
    return settings;
  }

  setupStreamInfo() {
    const { dashPlayer } = this.state;

    setInterval(() => {
      const activeStream = dashPlayer.getActiveStream();
      if (!activeStream) {
        return;
      }
      const streamInfo = activeStream.getStreamInfo();
      const dashMetrics = dashPlayer.getDashMetrics();
      const dashAdapter = dashPlayer.getDashAdapter();

      if (dashMetrics && streamInfo) {
        const periodIdx = streamInfo.index;
        const repSwitch = dashMetrics.getCurrentRepresentationSwitch(
          "audio",
          true
        );
        const audioBufferLevel = dashMetrics.getCurrentBufferLevel(
          "audio",
          true
        );
        const audioBitRate = repSwitch
          ? Math.round(
              dashAdapter.getBandwidthForRepresentation(
                repSwitch.to,
                periodIdx
              ) / 1000
            )
          : NaN;
        this.setState({
          audioBitRate,
          audioBufferLevel,
        });
      }
    }, POLLING_INTERVAL);
  }

  resetStateAndLoadUrl(streamUrl) {
    this.setState(DEFAULT_STATE, () => {
      this.load(streamUrl);
    });
  }

  load(url) {
    let { dashPlayer } = this.state;
    const { isLoading } = this.state;
    if (dashPlayer) {
      // if stream is being updated, just update the URL
      dashPlayer.attachSource(url);
      return;
    }

    dashPlayer = dashjs.MediaPlayer().create();
    dashPlayer.setTextDefaultEnabled(true);
    const settings = this.getCurrentSettings();
    dashPlayer.updateSettings(settings);
    dashPlayer.initialize(videoPlayer, url, true);

    dashPlayer.on(dashjs.MediaPlayer.events.MANIFEST_LOADED, (event) => {
      const { data } = event;
      const audioAdaptationSet = data.Period.AdaptationSet_asArray.find(
        (elem) => elem.contentType === "audio"
      );
      const videoAdaptationSets = data.Period.AdaptationSet_asArray.filter(
        (elem) => elem.contentType === "video"
      );
      const numChannels = Number(
        audioAdaptationSet.Representation_asArray[0].AudioChannelConfiguration
          .value
      );
      if (isLoading) {
        this.setupStreamInfo();
      }
      this.setState({
        availabilityStartTime: data.availabilityStartTime,
        dashProfiles: data.profiles,
        isLoading: false,
        liveLatency: dashPlayer.getCurrentLiveLatency(),
        minUpdatePeriod: data.minimumUpdatePeriod,
        numChannels,
        suggestedPresentationDelay: data.suggestedPresentationDelay,
        videoAdaptationSets,
      });
    });

    dashPlayer.on(dashjs.MediaPlayer.events.ERROR, (error) => {
      let errorMessage = error.error.message;
      if (
        error.error.code ===
        dashjs.MediaPlayer.errors.DATA_UPDATE_FAILED_ERROR_CODE
      ) {
        // these errors may happen in the first few seconds of stream loading
        // could be a bug
        errorMessage += "...try refreshing in 30 seconds.";
      }
      this.setState({
        isLoading: false,
        error: errorMessage,
      });
    });

    this.setState({
      dashPlayer,
    });
  }

  static renderHiddenVideoElementDiv() {
    return (
      <div style={{ display: "none" }}>
        <Video />
      </div>
    );
  }

  renderVideoBox() {
    const { isLoading, videoAdaptationSets } = this.state;
    const isAudioOnly = !isLoading && !videoAdaptationSets.length;

    if (isLoading) {
      return DashPlayer.renderHiddenVideoElementDiv();
    }
    if (isAudioOnly) {
      return (
        <div className="VideoBox InfoBox">
          <div className="AudioOnlyBox">Audio-only Stream</div>
          {DashPlayer.renderHiddenVideoElementDiv()}
          {this.renderDashSettings()}
        </div>
      );
    }
    return (
      <div className="VideoBox InfoBox">
        <Video />
        {videoAdaptationSets && (
          <VideoInfo videoAdaptationSets={videoAdaptationSets} />
        )}
        {this.renderDashSettings()}
      </div>
    );
  }

  renderDashSettings() {
    const { dashPlayer } = this.state;
    return (
      <DashSettings
        clientSettings={this.getCurrentSettings()}
        onChange={(settings) => {
          dashPlayer.updateSettings(settings);
          history.push(`/webtools/?settings=${JSON.stringify(settings)}`);
        }}
      />
    );
  }

  render() {
    const { error, isLoading } = this.state;
    const { streamName, streamUrl } = this.props;

    let body;
    if (isLoading) {
      body = (
        <div className="SearchingOrLoadingStreamsContainer">
          <div className="SearchingOrLoadingStreamsText">
            Loading {streamName}...
            <br />
            (it may take up to a minute for the stream to warm up...)
          </div>
        </div>
      );
    } else if (error) {
      body = <div className="ErrorBox">{error}</div>;
    } else {
      const {
        audioBitRate,
        audioBufferLevel,
        availabilityStartTime,
        dashProfiles,
        liveLatency,
        minUpdatePeriod,
        numChannels,
        suggestedPresentationDelay,
      } = this.state;

      body = (
        <>
          <div className="SliderBox InfoBox">
            <Typography variant="h6" gutterBottom>
              Audio Preview
            </Typography>
            <Divider />
            <GainSliderBox numChannels={numChannels} streamUrl={streamUrl} />
          </div>
          <div className="StreamInfoBox">
            <DashStreamInfo
              audioBitRate={audioBitRate}
              audioBufferLevel={audioBufferLevel}
              availabilityStartTime={availabilityStartTime}
              dashProfiles={dashProfiles}
              liveLatency={liveLatency}
              minUpdatePeriod={minUpdatePeriod}
              numChannels={numChannels}
              streamName={streamName}
              streamUrl={streamUrl}
              suggestedPresentationDelay={suggestedPresentationDelay}
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
}

DashPlayer.propTypes = {
  location: PropTypes.shape({
    search: PropTypes.string.isRequired,
  }).isRequired,
  streamName: PropTypes.string.isRequired,
  streamUrl: PropTypes.string.isRequired,
};

export default withRouter(DashPlayer);
