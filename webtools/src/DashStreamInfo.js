import React from "react";
import PropTypes from "prop-types";
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

function DashStreamInfo(props) {
  const {
    audioBitRate,
    audioBufferLevel,
    availabilityStartTime,
    dashProfiles,
    liveLatency,
    minUpdatePeriod,
    numChannels,
    streamName,
    streamUrl,
    suggestedPresentationDelay,
  } = props;

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
            <StreamInfoCell>{streamName}</StreamInfoCell>
          </TableRow>
          <TableRow>
            <StreamInfoCell>Stream URL</StreamInfoCell>
            <StreamInfoCell>
              {new URL(streamUrl, document.baseURI).href}
            </StreamInfoCell>
          </TableRow>
          <TableRow>
            <StreamInfoCell>Live Latency</StreamInfoCell>
            <StreamInfoCell>
              {liveLatency ? `${liveLatency} secs` : "Calculating..."}
            </StreamInfoCell>
          </TableRow>
          <TableRow>
            <StreamInfoCell>Buffer Level</StreamInfoCell>
            <StreamInfoCell>{`${audioBufferLevel} secs`}</StreamInfoCell>
          </TableRow>
          <TableRow>
            <StreamInfoCell>Audio Bitrate</StreamInfoCell>
            <StreamInfoCell>{`${audioBitRate} Kbps`}</StreamInfoCell>
          </TableRow>
          <TableRow>
            <StreamInfoCell>Stream Started On</StreamInfoCell>
            <StreamInfoCell>{availabilityStartTime.toString()}</StreamInfoCell>
          </TableRow>
          <TableRow>
            <StreamInfoCell>Minimum Update Period</StreamInfoCell>
            <StreamInfoCell>{minUpdatePeriod} Seconds</StreamInfoCell>
          </TableRow>
          <TableRow>
            <StreamInfoCell>Num Audio Channels</StreamInfoCell>
            <StreamInfoCell>{numChannels}</StreamInfoCell>
          </TableRow>
          <TableRow>
            <StreamInfoCell>DASH Profiles</StreamInfoCell>
            <StreamInfoCell>{dashProfiles}</StreamInfoCell>
          </TableRow>
          <TableRow>
            <StreamInfoCell>Suggested Presentation Delay</StreamInfoCell>
            <StreamInfoCell>
              {suggestedPresentationDelay} Seconds
            </StreamInfoCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

DashStreamInfo.propTypes = {
  audioBitRate: PropTypes.number.isRequired,
  audioBufferLevel: PropTypes.number.isRequired,
  availabilityStartTime: PropTypes.instanceOf(Date).isRequired,
  dashProfiles: PropTypes.string.isRequired,
  liveLatency: PropTypes.number.isRequired,
  minUpdatePeriod: PropTypes.number.isRequired,
  numChannels: PropTypes.number.isRequired,
  streamName: PropTypes.string.isRequired,
  streamUrl: PropTypes.string.isRequired,
  suggestedPresentationDelay: PropTypes.number.isRequired,
};

export default DashStreamInfo;
