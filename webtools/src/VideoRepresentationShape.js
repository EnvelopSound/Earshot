import PropTypes from "prop-types";

const VideoRepresentationShape = PropTypes.shape({
  bandwidth: PropTypes.number,
  codecs: PropTypes.string.isRequired,
  frameRate: PropTypes.string.isRequired,
  height: PropTypes.number.isRequired,
  id: PropTypes.string.isRequired,
  mimeType: PropTypes.string.isRequired,
  width: PropTypes.number.isRequired,
});

export default VideoRepresentationShape;
