import React from "react";
import PropTypes from "prop-types";

import Divider from "@material-ui/core/Divider";
import Typography from "@material-ui/core/Typography";

import VideoRepresentationsInfo from "./VideoRepresentationsInfo";
import VideoRepresentationShape from "./VideoRepresentationShape";

class VideoInfo extends React.Component {
  static renderAdaptationSet(set) {
    return (
      <div key={set.id} style={{ width: "90%" }}>
        <VideoRepresentationsInfo
          representations={set.Representation_asArray}
        />
      </div>
    );
  }

  render() {
    const { videoAdaptationSets } = this.props;
    const adaptationSets = videoAdaptationSets.map((set) =>
      VideoInfo.renderAdaptationSet(set)
    );
    return (
      <div className="VideoInfoBox InfoBox">
        <Typography variant="h6" gutterBottom>
          Video Info
        </Typography>
        <Divider />
        {adaptationSets}
      </div>
    );
  }
}

VideoInfo.propTypes = {
  videoAdaptationSets: PropTypes.arrayOf(
    PropTypes.shape({
      Representation_asArray: PropTypes.arrayOf(VideoRepresentationShape)
        .isRequired,
    })
  ).isRequired,
};

export default VideoInfo;
