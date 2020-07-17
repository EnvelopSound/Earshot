import axios from "axios";
import React from "react";
import xml2js from "xml2js";

import DashPlayer from "./DashPlayer.js";

const STAT_URL = "/stat";

export default class Webtools extends React.Component {
  state = {
    numClients: 0,
    streamNames: null,
    selectedStream: null
  };

  componentDidMount() {
    this.loadStat();
  }

  loadStat() {
    var self = this;
    axios.get(
      STAT_URL,
      {
        "Content-Type": "application/xml; charset=utf-8"
      }
    ).then((response) => {
      xml2js.parseString(response.data, function (err, result) {
        const liveInfo = result.rtmp.server[0].application[0].live[0];
        const numClients = liveInfo.nclients[0];
        const streams = liveInfo.stream;
        let streamNames = streams.map((stream) => stream.name[0]);
        self.setState({
          numClients,
          streamNames,
          selectedStream: streamNames[0]
        });
      });
    })
    .catch((error) => {
      console.error(error);
    });
  }

  render() {
    if (!this.state.streamNames) {
      return (
        <div>
          Searching for streams...
        </div>
      );
    }

    return (
      <div className="WebtoolsContainer">
        <div className="StreamSelectionSidebar">
        {this.renderStreamNames()}
        </div>
        <div className="DashPlayerContainer">
          <DashPlayer
            streamName={this.state.selectedStream}
            streamUrl={"/" + this.state.selectedStream + ".mpd"}
          />
        </div>
        <div className="ServerInfo">
          {this.state.numClients} Active Clients
        </div>
      </div>
    );
  }

  renderStreamNames() {
    let self = this;
    return this.state.streamNames.map((streamName) => {
      return (
        <div key={streamName} className="StreamName" onClick={() => { self.selectStream(streamName) }} >
          {streamName}
        </div>
      );
    });
  }

  selectStream(streamName) {
    this.setState({
      selectedStream: streamName
    });
  }
}
