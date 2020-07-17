import axios from "axios";
import dashjs from "dashjs";
import React from "react";

const SLIDER_MAX_VALUE = 200;
const POLLING_INTERVAL = 1000;

const NGINX_INFO_URL = "/nginxInfo";

export default class DashPlayer extends React.Component {
  state = {
    isLoading: true,
    audioBufferLevel: null,
    audioBitRate: null,
    availabilityStartTime: null,
    ffmpegFlags: null,
    liveLatency: null,
    minBufferTime: null,
    minimumUpdatePeriod: null,
    numChannels: null,
    profiles: null,
    suggestedPresentationDelay: null,
    urlLoaded: false,
  };

  componentDidMount() {
    this.load(this.props.streamUrl);
    this.loadEarshotInfo();
  }

  componentDidUpdate(prevProps) {
    if (this.props.streamUrl !== prevProps.streamUrl) {
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
    dashPlayer.initialize(document.querySelector("#videoPlayer"), url, true);
    dashPlayer.updateSettings({
      streaming: {
        stableBufferTime: 20,
        bufferTimeAtTopQuality: 40
      }
    });

    dashPlayer.on(dashjs.MediaPlayer.events.MANIFEST_LOADED, (event) => {
      const data = event.data;
      const audioAdaptionSet = data.Period.AdaptationSet_asArray.find(elem => elem.contentType === "audio");
      const numChannels = audioAdaptionSet.Representation.AudioChannelConfiguration.value;
      if (this.state.isLoading) {
        this.setupAudio({ numChannels });
        this.setupStreamInfo();
      }
      this.setState({
        availabilityStartTime: data.availabilityStartTime,
        isLoading: false,
        minBufferTime: data.minBufferTime,
        minimumUpdatePeriod: data.minimumUpdatePeriod,
        numChannels,
        profiles: data.profiles,
        suggestedPresentationDelay: data.suggestedPresentationDelay,
        liveLatency: dashPlayer.getCurrentLiveLatency()
      });
    });
    dashPlayer.on(dashjs.MediaPlayer.events.ERROR, (error) => {
      console.error(error);
      this.setState({
        isLoading: false,
        error: error.error.message,
      });
    });
    this.setState({
      dashPlayer,
    });
  }

  loadEarshotInfo() {
    axios.get(NGINX_INFO_URL).then((response) => {
      this.setState({ ffmpegFlags: response.data.ffmpegFlags });
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
          <div className="SliderBox">
            {this.renderGainSliders()}
          </div>
          <div className="StreamInfoBox">
            {this.renderDashInfo()}
            {this.renderNginxInfo()}
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
    let video = (
      <video
        className="VideoPlayer"
        id="videoPlayer"
        muted
      />
    );

    return (
      <div className="VideoBox">
        {video}
        <div className="ButtonBox">
          <button className="VideoControlButton" onClick={() => { document.querySelector("#videoPlayer").play(); }}>Play</button>
          <button className="VideoControlButton" onClick={() => { document.querySelector("#videoPlayer").pause(); }}>Pause</button>
        </div>
      </div>
    );
  }

  renderGainSliders() {
    const sliders =  [];
    for (let i = 0; i < this.state.numChannels; i++) {
      let v = i;
      sliders.push(
        (
          <div key={i} className="SliderContainer">
            Channel {i}
            <input
              type="range"
              min="0"
              max={SLIDER_MAX_VALUE}
              className="slider"
              defaultValue="0"
              id={"gain" + i}
              onChange={(event) => this.setGain(v, event.target.value / SLIDER_MAX_VALUE)}
            />
          </div>
        )
      );
    }
    return sliders;
  }

  renderDashInfo() {
    return (
      <table>
        <tbody>
          <tr>
            <td>
              Stream Name
            </td>
            <td>
              {this.props.streamName}
            </td>
          </tr>
          <tr>
            <td>
              Stream URL
            </td>
            <td>
              {new URL(this.props.streamUrl, document.baseURI).href}
            </td>
          </tr>
          <tr>
            <td>
              Live Latency
            </td>
            <td>
              {this.state.liveLatency ? this.state.liveLatency + " secs" : "Calculating..."}
            </td>
          </tr>
          <tr>
            <td>
              Buffer Level
            </td>
            <td>
              {this.state.audioBufferLevel + " secs"}
            </td>
          </tr>
          <tr>
            <td>
              Audio Bitrate
            </td>
            <td>
              {this.state.audioBitRate + " Kbps"}
            </td>
          </tr>
          <tr>
            <td>
              Stream Started On
            </td>
            <td>
              {this.state.availabilityStartTime.toString()}
            </td>
          </tr>
          <tr>
            <td>
              Minimum Buffer Time
            </td>
            <td>
              {this.state.minBufferTime} Seconds
            </td>
          </tr>
          <tr>
            <td>
              Minimum Update Period
            </td>
            <td>
              {this.state.minimumUpdatePeriod} Seconds
            </td>
          </tr>
          <tr>
            <td>
              Num Audio Channels
            </td>
            <td>
              {this.state.numChannels}
            </td>
          </tr>
          <tr>
            <td>
              Profiles
            </td>
            <td>
              {this.state.profiles}
            </td>
          </tr>
          <tr>
            <td>
              Suggested Presentation Delay
            </td>
            <td>
              {this.state.suggestedPresentationDelay} Seconds
            </td>
          </tr>
       </tbody>
      </table>
    );
  }

  renderNginxInfo() {
    return (
      <table>
        <tbody>
          <tr>
            <td>
              FFmpeg Flags
            </td>
            <td>
              {this.state.ffmpegFlags ? this.state.ffmpegFlags : "Calculating..."}
            </td>
          </tr>
        </tbody>
      </table>
    );
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
