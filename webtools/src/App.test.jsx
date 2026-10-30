import React from "react";
import ReactDOM from "react-dom";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";
import axios from "axios";

import App from "./App";

vi.mock("axios");
// The real player needs MediaSource and Web Audio, which jsdom lacks.
vi.mock("./DashPlayer", () => ({
  default: ({ streamName }) => <div>Player for {streamName}</div>,
}));

const STAT_XML = `<?xml version="1.0" encoding="utf-8" ?>
<rtmp><uptime>12</uptime><server><application><name>live</name><live>
<stream><name>first</name><nclients>1</nclients><publishing/></stream>
<stream><name>second</name><nclients>1</nclients><publishing/></stream>
<nclients>2</nclients>
</live></application></server></rtmp>`;

const container = document.createElement("div");
document.body.appendChild(container);

afterEach(() => {
  ReactDOM.unmountComponentAtNode(container);
});

async function waitForText(text) {
  for (let i = 0; i < 50; i += 1) {
    if (container.textContent.includes(text)) {
      return;
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
  }
  throw new Error(`"${text}" never appeared in: ${container.textContent}`);
}

test("lists the streams from /stat and opens the first one", async () => {
  axios.get.mockImplementation((url) =>
    Promise.resolve(
      url === "/stat"
        ? { data: STAT_XML }
        : { data: { ffmpegFlags: "-c:v copy", dashName: "test" } }
    )
  );
  ReactDOM.render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
    container
  );
  await waitForText("Player for first");
  expect(container.textContent).toContain("second");
});
