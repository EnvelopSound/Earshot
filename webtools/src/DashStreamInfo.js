import React from "react";
import { styled } from "@material-ui/core/styles";
import Divider from "@material-ui/core/Divider";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableRow from "@material-ui/core/TableRow";
import Typography from "@material-ui/core/Typography";

const StreamInfoCell = styled(TableCell)({
  background: "#D3D3D3",
  borderColor: "#8A8A8A",
  color: "black",
  padding: "5px",
});

export default function DashStreamInfo(props) {
  return (
    <div className="InfoBox">
      <Typography variant="h6" gutterBottom>
        DASH Stream Info
      </Typography>
      <Divider />
      <Table>
        <TableBody>
          <TableRow>
            <StreamInfoCell>Stream Name</StreamInfoCell>
            <StreamInfoCell>{props.streamName}</StreamInfoCell>
          </TableRow>
          <TableRow>
            <StreamInfoCell>Stream URL</StreamInfoCell>
            <StreamInfoCell>
              {new URL(props.streamUrl, document.baseURI).href}
            </StreamInfoCell>
          </TableRow>
          <TableRow>
            <StreamInfoCell>Live Latency</StreamInfoCell>
            <StreamInfoCell>
              {props.liveLatency
                ? `${props.liveLatency} secs`
                : "Calculating..."}
            </StreamInfoCell>
          </TableRow>
          <TableRow>
            <StreamInfoCell>Buffer Level</StreamInfoCell>
            <StreamInfoCell>{`${props.audioBufferLevel} secs`}</StreamInfoCell>
          </TableRow>
          <TableRow>
            <StreamInfoCell>Audio Bitrate</StreamInfoCell>
            <StreamInfoCell>{`${props.audioBitRate} Kbps`}</StreamInfoCell>
          </TableRow>
          <TableRow>
            <StreamInfoCell>Stream Started On</StreamInfoCell>
            <StreamInfoCell>
              {props.availabilityStartTime.toString()}
            </StreamInfoCell>
          </TableRow>
          <TableRow>
            <StreamInfoCell>Minimum Update Period</StreamInfoCell>
            <StreamInfoCell>{props.minUpdatePeriod} Seconds</StreamInfoCell>
          </TableRow>
          <TableRow>
            <StreamInfoCell>Num Audio Channels</StreamInfoCell>
            <StreamInfoCell>{props.numChannels}</StreamInfoCell>
          </TableRow>
          <TableRow>
            <StreamInfoCell>DASH Profiles</StreamInfoCell>
            <StreamInfoCell>{props.dashProfiles}</StreamInfoCell>
          </TableRow>
          <TableRow>
            <StreamInfoCell>Suggested Presentation Delay</StreamInfoCell>
            <StreamInfoCell>
              {props.suggestedPresentationDelay} Seconds
            </StreamInfoCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
