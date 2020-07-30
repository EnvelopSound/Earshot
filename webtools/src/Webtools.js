import axios from "axios";
import React from "react";
import xml2js from "xml2js";
import moment from "moment";
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';

import DashPlayer from "./DashPlayer.js";

const STAT_URL = "/stat";
const NGINX_INFO_URL = "/nginxInfo";
const SERVER_INFO_FIELDS = {
  bw_in: "Bandwidth In",
  bytes_in: "Total Bytes In",
  bw_out: "Bandwidth Out",
  bytes_out: "Total Bytes Out",
  uptime: "Server Uptime",
  nclients: "Num Clients",
};
const DEFAULT_STAT_REFRESH_PERIOD = 4; // seconds

export default class Webtools extends React.Component {

  BW_TRANSFORM_FN = (bw_in) => parseFloat((bw_in / (1024 * 1024)).toPrecision(4)) + "Mb/s";
  BYTES_TRANSFORM_FN = (bytes_in) => {
    if (bytes_in > 1024 * 1024 * 1024) {
      return parseFloat((bytes_in / (1024 * 1024 * 1024)).toPrecision(4)) + "GB";
    } else {
      return parseFloat((bytes_in / (1024 * 1024)).toPrecision(4)) + "MB";
    }
  }
  SERVER_INFO_TRANSFORM = {
    uptime: (uptime) => moment.duration(uptime, "seconds").humanize(),
    bw_in: this.BW_TRANSFORM_FN,
    bw_out: this.BW_TRANSFORM_FN,
    bytes_in: this.BYTES_TRANSFORM_FN,
    bytes_out: this.BYTES_TRANSFORM_FN
  };

  state = {
    ffmpegFlags: null,
    streamNames: null,
    selectedStream: null,
    serverInfo: null,
    statRetryTimer: 1
  };

  componentDidMount() {
    this.loadStat(this);
    this.loadEarshotInfo();
  }

  loadStat(self) {
    axios.get(
      STAT_URL,
      {
        "Content-Type": "application/xml; charset=utf-8"
      }
    ).then((response) => {
      xml2js.parseString(response.data, function (err, result) {
        const serverInfo = self.extractServerInfo(result);
        const liveInfo = result.rtmp.server[0].application[0].live[0];
        serverInfo["nclients"] = liveInfo.nclients;
        let stateUpdate = {
          serverInfo,
          statRetryTimer: self.state.statRetryTimer * 2,
        };
        if (liveInfo.stream) {
          let streamNames = liveInfo.stream.map((stream) => stream.name[0]);
          stateUpdate["streamNames"] = streamNames;
          if (self.state.selectedStream === null) {
            stateUpdate["selectedStream"] = streamNames[0];
          }
          stateUpdate["statRetryTimer"] = DEFAULT_STAT_REFRESH_PERIOD;
        }
        self.setState(stateUpdate);
        setTimeout(() => { self.loadStat(self); }, stateUpdate.statRetryTimer * 1000);
      });
    }).catch((error) => {
      setTimeout(() => { self.loadStat(self); }, self.state.statRetryTimer * 1000);
    });
  }

  loadEarshotInfo() {
    axios.get(NGINX_INFO_URL).then((response) => {
      this.setState({ ffmpegFlags: response.data.ffmpegFlags });
    });
  }

  render() {
    return (
      <div className="WebtoolsContainer">
        <div className="StreamSelectionSidebar">
          <img alt="Earshot Logo" src="/webtools/logo.png" style={{width: "100%"}} />
          {this.state.streamNames && this.renderStreamNames()}
          <div className="ServerInfo">
            <Table>
              <TableBody>
                {this.state.serverInfo && this.renderServerInfo()}
                {this.renderNginxInfo()}
              </TableBody>
            </Table>
          </div>
        </div>
        {!this.state.streamNames && this.renderSearchingForStreams()}
        {this.state.selectedStream && (
          <div className="DashPlayerContainer">
            <DashPlayer
              streamName={this.state.selectedStream}
              streamUrl={"/" + this.state.selectedStream + ".mpd"}
            />
          </div>
        )}
      </div>
    );
  }

  renderStreamNames() {
    let self = this;
    return this.state.streamNames.map((streamName) => {
      let classNames = "StreamName";
      if (self.state.selectedStream === streamName) {
        classNames += " Selected";
      }
      return (
        <div
        className={classNames}
          key={streamName}
          onClick={() => { self.selectStream(streamName) }}
        >
          {streamName}
        </div>
      );
    });
  }

  renderSearchingForStreams() {
    return (
      <div className="SearchingOrLoadingStreamsContainer">
        <div className="SearchingOrLoadingStreamsText">
          Searching for streams...
          <br />
          (Retrying after {this.state.statRetryTimer} Seconds)
        </div>
      </div>
    );
  }

  selectStream(streamName) {
    this.setState({
      selectedStream: streamName
    });
  }

  renderServerInfo() {
    const rows = Object.keys(this.state.serverInfo).map((key) => {
      const serverInfoValue = this.SERVER_INFO_TRANSFORM[key] ?
        this.SERVER_INFO_TRANSFORM[key](this.state.serverInfo[key]) :
        this.state.serverInfo[key];

      return (
          <TableRow key={key}>
            <TableCell style={{ padding: "2px 15px 2px 0px" }}>
              {SERVER_INFO_FIELDS[key]}
            </TableCell>
            <TableCell>
              {serverInfoValue}
            </TableCell>
          </TableRow>
      );
    });

    return (
      <>
        {rows}
      </>
    );
  }

  renderNginxInfo() {
    return (
          <TableRow>
            <TableCell style={{ padding: "2px 15px 2px 0px" }}>
              FFmpeg Flags
            </TableCell>
            <TableCell style={{ fontSize: "10px"}} >
              {this.state.ffmpegFlags ? this.state.ffmpegFlags : "Loading..."}
            </TableCell>
          </TableRow>
    );
  }

  extractServerInfo(statResponse) {
    let serverInfo = {};
    Object.keys(SERVER_INFO_FIELDS).forEach((key) => {
      if (statResponse.rtmp[key]) {
        serverInfo[key] = statResponse.rtmp[key][0];
      }
    });
    return serverInfo;
  }
}
