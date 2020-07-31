import React from "react";
import Divider from "@material-ui/core/Divider";
import Typography from "@material-ui/core/Typography";

import RepresentationsInfo from "./RepresentationsInfo";

export default class VideoInfo extends React.Component {
  render() {
    const adaptationSets = this.props.videoAdaptationSets.map((set) =>
      this.renderAdaptationSet(set)
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

  renderAdaptationSet(set) {
    return (
      <div key={set.id} style={{ width: "90%" }}>
        <RepresentationsInfo representations={set.Representation_asArray} />
      </div>
    );
  }
}
