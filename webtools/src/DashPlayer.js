import React from "react";
import dashjs from "dashjs";

const SLIDER_MAX_VALUE = 200;
const POLLING_INTERVAL = 1000;

// TODO: make dynamic
const STREAM_URL = "/stream1.mpd";

export default class DashPlayer extends React.Component {
  state = {
    isLoading: true,
    audioBufferLevel: null,
    audioBitRate: null,
    availabilityStartTime: null,
    minBufferTime: null,
    minimumUpdatePeriod: null,
    numChannels: null,
    profiles: null,
    suggestedPresentationDelay: null,
    urlLoaded: false,
  };

  componentDidMount() {
    this.load();
  }

  load() {
    const dashPlayer = dashjs.MediaPlayer().create();
    dashPlayer.initialize(document.querySelector("#videoPlayer"), STREAM_URL, true);
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
      });
    });
    dashPlayer.on(dashjs.MediaPlayer.events.ERROR, (error) => {
      console.log("DASDAS");
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
        <div>
          {this.state.error}
        </div>
      );
    } else {
      body = (
        <div className="StreamInfo">
          {this.renderGainSliders()}
          {this.renderStreamInfo()}
        </div>
      );
    }

    return (
      <>
        <video
          id="videoPlayer"
          autoPlay={true}
        />
        {body}
      </>
    );
  }

  renderGainSliders() {
    const sliders =  [];
    for (let i = 0; i < this.state.numChannels; i++) {
      let v = i;
      sliders.push(
        (
          <div key={i} className="slidecontainer">
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

  renderStreamInfo() {
    return (
      <table>
        <tbody>
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
      gain.connect(merger, 0, i < numChannels / 2 ? 0 : 1);
      gain.gain.value = 0;
    }

    this.setState({ gainNodes });

    merger.connect(audioContext.destination);
  }

  setGain(channel, value) {
    if (this.state.gainNodes && value) {
      let gainNode = this.state.gainNodes[channel];
      gainNode.gain.value = value;
    }
  }

  setupStreamInfo() {
    const player = this.state.dashPlayer;
    setInterval(() => {
      const streamInfo = player.getActiveStream().getStreamInfo();
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
