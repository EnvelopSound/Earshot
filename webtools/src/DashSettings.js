import React from "react";
import PropTypes from "prop-types";

import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import TextareaAutosize from "@material-ui/core/TextareaAutosize";

class DashSettings extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      settings: JSON.stringify(props.clientSettings, null, 2),
    };
  }

  onUpdate() {
    try {
      const { settings } = this.state;
      const { onChange } = this.props;

      const settingsObj = JSON.parse(settings);
      onChange(settingsObj);
      this.setState({ error: null });
    } catch (error) {
      this.setState({ error: error.message });
    }
  }

  render() {
    const { error, settings } = this.state;
    return (
      <div className="InfoBox DashSettingsBox">
        <Typography variant="h6" gutterBottom>
          Dash.js Client Settings
        </Typography>
        <TextareaAutosize
          onChange={(e) => {
            this.setState({ settings: e.target.value });
          }}
          style={{ width: "100%" }}
          value={settings}
        />
        <Button
          onClick={() => {
            this.onUpdate();
          }}
        >
          Update
        </Button>
        {error && (
          <Typography style={{ color: "red" }} variant="body2" gutterBottom>
            {error}
          </Typography>
        )}
      </div>
    );
  }
}

DashSettings.propTypes = {
  clientSettings: PropTypes.objectOf(PropTypes.object()).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default DashSettings;
