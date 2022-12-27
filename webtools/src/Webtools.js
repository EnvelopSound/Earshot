import axios from "axios";
import React from "react";
import xml2js from "xml2js";
import moment from "moment";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableRow from "@material-ui/core/TableRow";

import DashPlayer from "./DashPlayer";
import { audioContext } from "./Video";

const STAT_URL = "/stat";
const NGINX_INFO_URL = "/nginxInfo";

const SERVER_INFO_FIELDS = {
  bandwidthIn: "bw_in",
  bytesIn: "bytes_in",
  bwOut: "bw_out",
  totalBytesOut: "bytes_out",
  uptime: "uptime",
  nclients: "nclients",
};

const SERVER_INFO_FIELD_NAMES = {
  bandwidthIn: "Bandwidth In",
  bytesIn: "Total Bytes In",
  bwOut: "Bandwidth Out",
  bytesOut: "Total Bytes Out",
  uptime: "Server Uptime",
  nclients: "Num Clients",
};

const DEFAULT_STAT_REFRESH_PERIOD = 4; // seconds

export default class Webtools extends React.Component {
  static loadStat(self) {
    axios
      .get(STAT_URL, {
        "Content-Type": "application/xml; charset=utf-8",
      })
      .then((response) => {
        xml2js.parseString(response.data, (err, result) => {
          const serverInfo = Webtools.extractServerInfo(result);
          const liveInfo = result.rtmp.server[0].application[0].live[0];
          serverInfo.nclients = liveInfo.nclients;
          const stateUpdate = {
            serverInfo,
            statRetryTimer: self.state.statRetryTimer * 2,
          };
          if (liveInfo.stream) {
            const streamNames = liveInfo.stream.map((stream) => stream.name[0]);
            stateUpdate.streamNames = streamNames;
            if (self.state.selectedStream === null) {
              [stateUpdate.selectedStream] = streamNames;
            }
            stateUpdate.statRetryTimer = DEFAULT_STAT_REFRESH_PERIOD;
          }
          self.setState(stateUpdate);
          setTimeout(() => {
            Webtools.loadStat(self);
          }, stateUpdate.statRetryTimer * 1000);
        });
      })
      .catch(() => {
        setTimeout(() => {
          Webtools.loadStat(self);
        }, self.state.statRetryTimer * 1000);
      });
  }

  static extractServerInfo(statResponse) {
    const serverInfo = {};
    Object.keys(SERVER_INFO_FIELDS).forEach((key) => {
      const responseKey = SERVER_INFO_FIELDS[key];
      if (statResponse.rtmp[key]) {
        [serverInfo[key]] = statResponse.rtmp[responseKey];
      }
    });
    return serverInfo;
  }

  SERVER_INFO_TRANSFORM = {
    uptime: (uptime) => moment.duration(uptime, "seconds").humanize(),
    bwIn: this.BW_TRANSFORM_FN,
    bwOut: this.BW_TRANSFORM_FN,
    bytesIn: this.BYTES_TRANSFORM_FN,
    bytesOut: this.BYTES_TRANSFORM_FN,
  };

  constructor(props) {
    super(props);
    this.state = {
      ffmpegFlags: null,
      streamNames: null,
      selectedStream: null,
      serverInfo: null,
      statRetryTimer: 1,
      windowClicked: false,
    };
  }

  componentDidMount() {
    Webtools.loadStat(this);
    this.loadEarshotInfo();
  }

  BW_TRANSFORM_FN = (bwIn) =>
    `${parseFloat((bwIn / (1024 * 1024)).toPrecision(4))}Mb/s`;

  BYTES_TRANSFORM_FN = (bytesIn) => {
    if (bytesIn > 1024 * 1024 * 1024) {
      return `${parseFloat((bytesIn / (1024 * 1024 * 1024)).toPrecision(4))}GB`;
    }
    return `${parseFloat((bytesIn / (1024 * 1024)).toPrecision(4))}MB`;
  };

  loadEarshotInfo() {
    axios.get(NGINX_INFO_URL).then((response) => {
      this.setState({ ffmpegFlags: response.data.ffmpegFlags });
    });
  }

  selectStream(streamName) {
    this.setState({
      selectedStream: streamName,
    });
  }

  renderNginxInfo() {
    const { ffmpegFlags } = this.state;
    return (
      <TableRow>
        <TableCell style={{ padding: "2px 15px 2px 0px" }}>
          FFmpeg Flags
        </TableCell>
        <TableCell style={{ fontSize: "10px" }}>
          {ffmpegFlags !== null ? ffmpegFlags : "Loading..."}
        </TableCell>
      </TableRow>
    );
  }

  renderServerInfo() {
    const { serverInfo } = this.state;
    const rows = Object.keys(serverInfo).map((key) => {
      const serverInfoValue = this.SERVER_INFO_TRANSFORM[key]
        ? this.SERVER_INFO_TRANSFORM[key](serverInfo[key])
        : serverInfo[key];

      return (
        <TableRow key={key}>
          <TableCell style={{ padding: "2px 15px 2px 0px" }}>
            {SERVER_INFO_FIELD_NAMES[key]}
          </TableCell>
          <TableCell>{serverInfoValue}</TableCell>
        </TableRow>
      );
    });

    return <>{rows}</>;
  }

  renderSearchingForStreams() {
    const { statRetryTimer } = this.state;
    return (
      <div className="SearchingOrLoadingStreamsContainer">
        <div className="SearchingOrLoadingStreamsText">
          Searching for streams...
          <br />
          (Retrying after {statRetryTimer} Seconds)
        </div>
      </div>
    );
  }

  renderStreamNames() {
    const { streamNames } = this.state;
    const self = this;
    let i = -1;
    return streamNames.map((streamName) => {
      i += 1;
      let classNames = "StreamName";
      if (self.state.selectedStream === streamName) {
        classNames += " Selected";
      }
      return (
        <div
          className={classNames}
          key={streamName}
          onClick={() => {
            self.selectStream(streamName);
          }}
          onKeyDown={() => {
            self.selectStream(streamName);
          }}
          role="button"
          tabIndex={i}
        >
          {streamName}
        </div>
      );
    });
  }

  render() {
    const { selectedStream, serverInfo, streamNames } = this.state;
    return (
      <div className="WebtoolsContainer"> 
      
      {
        // to resume audiocontext if the browser stops it
        window.addEventListener('click', () => {
        if(!this.state.windowClicked){
        audioContext.resume();
        console.log('clicked');
        this.setState({windowClicked: true})
        }})
        }
        <div className="StreamSelectionSidebar">
          <img
            alt="Earshot Logo"
            src="/webtools/logo.png"
            style={{ width: "100%" }}
          />
          {streamNames && this.renderStreamNames()}
          <div className="ServerInfo">
            <Table>
              <TableBody>
                {serverInfo && this.renderServerInfo()}
                {this.renderNginxInfo()}
              </TableBody>
            </Table>
          </div>
        </div>
        {!streamNames && this.renderSearchingForStreams()}
        {selectedStream && (
          <div className="DashPlayerContainer">
            <DashPlayer
              streamName={selectedStream}
              streamUrl={`/dash/${selectedStream}.mpd`}
            />
          </div>
        )}
      </div>
    );
  }
}
