import React from "react";
import PropTypes from 'prop-types';
import { styled } from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';

const RepresentationInfoCell = styled(TableCell)({
  color: 'black',
  padding: '5px 30px 10px 0px',
});

export default function RepresentationsInfo(props) {
  return (
    <Box>
      {props.representations.map((rep) => (
        <React.Fragment key={rep.id}>
          <Typography variant="subtitle1" style={{ marginTop: "10px" }}>
            Representation {rep.id}
          </Typography>
          <Representation key={rep.id} rep={rep} />
        </React.Fragment>
      ))}
    </Box>
  );
}

function Representation(props) {
    const { rep } = props;

    return (
          <Table>
            <TableBody>
              <TableRow>
                <RepresentationInfoCell>
                    <Box>
                     <Table size="small" aria-label="purchases">
                        <TableHead>
                          <TableRow>
                            <RepresentationInfoCell>Height</RepresentationInfoCell>
                            <RepresentationInfoCell>Width</RepresentationInfoCell>
                            <RepresentationInfoCell>Bandwidth</RepresentationInfoCell>
                            <RepresentationInfoCell>Frame Rate</RepresentationInfoCell>
                            <RepresentationInfoCell>Codecs</RepresentationInfoCell>
                            <RepresentationInfoCell>MIME Type</RepresentationInfoCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                                                    <RepresentationInfoCell>{rep.height}</RepresentationInfoCell>
                                                    <RepresentationInfoCell>{rep.width}</RepresentationInfoCell>
                                                    <RepresentationInfoCell>{rep.bandwidth}</RepresentationInfoCell>
                                                    <RepresentationInfoCell>{rep.frameRate}</RepresentationInfoCell>
                                                    <RepresentationInfoCell>{rep.codecs}</RepresentationInfoCell>
                                                    <RepresentationInfoCell>{rep.mimeType}</RepresentationInfoCell>
                                                  </TableRow>
                      </TableBody>
                      </Table>
                    </Box>
                </RepresentationInfoCell>
              </TableRow>
            </TableBody>
          </Table>
        );
  }

Representation.propTypes = {
    rep: PropTypes.shape({
      bandwidth: PropTypes.number,
      codecs: PropTypes.string.isRequired,
      frameRate: PropTypes.string.isRequired,
      height: PropTypes.number.isRequired,
      id: PropTypes.string.isRequired,
      mimeType: PropTypes.string.isRequired,
      width: PropTypes.number.isRequired,
    }).isRequired,
};
