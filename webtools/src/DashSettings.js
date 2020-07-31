import React from "react";

import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import TextareaAutosize from "@material-ui/core/TextareaAutosize";

export default class DashSettings extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      settings: JSON.stringify(props.clientSettings, null, 2),
    };
  }

  onUpdate() {
    try {
      const settingsObj = JSON.parse(this.state.settings);
      this.props.onChange(settingsObj);
      this.setState({ error: null });
    } catch (error) {
      this.setState({ error: error.message });
    }
  }

  render() {
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
          value={this.state.settings}
        ></TextareaAutosize>
        <Button
          onClick={() => {
            this.onUpdate();
          }}
        >
          Update
        </Button>
        {this.state.error && (
          <Typography style={{ color: "red" }} variant="body2" gutterBottom>
            {this.state.error}
          </Typography>
        )}
      </div>
    );
  }
}
