import React from "react";
import PropTypes from "prop-types";
import { styled } from "@material-ui/core/styles";
import Box from "@material-ui/core/Box";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Typography from "@material-ui/core/Typography";

import VideoRepresentationShape from "./VideoRepresentationShape";

const VideoRepresentationInfoCell = styled(TableCell)({
  color: "black",
  padding: "5px 30px 10px 0px",
});

function VideoRepresentationsInfo(props) {
  const { representations } = props;
  return (
    <Box>
      {representations.map((rep) => (
        <React.Fragment key={rep.id}>
          <Typography variant="subtitle1" style={{ marginTop: "10px" }}>
            Representation {rep.id}
          </Typography>
          <VideoRepresentation key={rep.id} rep={rep} />
        </React.Fragment>
      ))}
    </Box>
  );
}

function VideoRepresentation(props) {
  const { rep } = props;

  return (
    <Table>
      <TableBody>
        <TableRow>
          <VideoRepresentationInfoCell>
            <Box>
              <Table size="small" aria-label="purchases">
                <TableHead>
                  <TableRow>
                    <VideoRepresentationInfoCell>
                      Height
                    </VideoRepresentationInfoCell>
                    <VideoRepresentationInfoCell>
                      Width
                    </VideoRepresentationInfoCell>
                    <VideoRepresentationInfoCell>
                      Bandwidth
                    </VideoRepresentationInfoCell>
                    <VideoRepresentationInfoCell>
                      Frame Rate
                    </VideoRepresentationInfoCell>
                    <VideoRepresentationInfoCell>
                      Codecs
                    </VideoRepresentationInfoCell>
                    <VideoRepresentationInfoCell>
                      MIME Type
                    </VideoRepresentationInfoCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <VideoRepresentationInfoCell>
                      {rep.height}
                    </VideoRepresentationInfoCell>
                    <VideoRepresentationInfoCell>
                      {rep.width}
                    </VideoRepresentationInfoCell>
                    <VideoRepresentationInfoCell>
                      {rep.bandwidth}
                    </VideoRepresentationInfoCell>
                    <VideoRepresentationInfoCell>
                      {rep.frameRate}
                    </VideoRepresentationInfoCell>
                    <VideoRepresentationInfoCell>
                      {rep.codecs}
                    </VideoRepresentationInfoCell>
                    <VideoRepresentationInfoCell>
                      {rep.mimeType}
                    </VideoRepresentationInfoCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          </VideoRepresentationInfoCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

VideoRepresentation.propTypes = {
  rep: VideoRepresentationShape.isRequired,
};

VideoRepresentationsInfo.propTypes = {
  representations: PropTypes.arrayOf(VideoRepresentationShape).isRequired,
};

export default VideoRepresentationsInfo;
