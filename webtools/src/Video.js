import React from "react";

// thanks to this post: https://www.madebymike.com.au/writing/getting-the-heck-out-of-react/
// for how to do this work properly

const videoPlayer = document.createElement("video");
videoPlayer.setAttribute("class", "VideoPlayer");
videoPlayer.setAttribute("id", "videoPlayer");
videoPlayer.muted = true;

const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioContext = new AudioContext();
const mediaElemSource = audioContext.createMediaElementSource(videoPlayer);

class Video extends React.Component {
  constructor(props) {
    super(props);
    this.myVideoContainer = React.createRef();
  }

  componentDidMount() {
    this.myVideoContainer.current.appendChild(videoPlayer);

  }

  render() {
    return <div ref={this.myVideoContainer} />;
  }
}

export { audioContext, mediaElemSource, videoPlayer, Video };
