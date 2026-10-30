// Loads the production build in headless Chromium against a mocked Earshot
// (/stat lists one stream, /dash serves a manifest with 16-channel audio but no
// segments) and fails if the page throws or does not draw one gain slider per
// channel. It exists because the unit tests run under Node, where a missing
// browser shim or a bad CommonJS import goes unnoticed and the page is blank.
import { readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("..", import.meta.url));
const buildDir = join(root, "build");
const fixture = readFileSync(join(root, "smoke", "fixture.mpd"));
const STAT = `<?xml version="1.0" encoding="utf-8" ?><rtmp><server><application><name>live</name><live><stream><name>smoke</name><publishing/></stream><nclients>1</nclients></live></application></server></rtmp>`;
const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
};

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  if (pathname === "/stat")
    return res.writeHead(200, { "Content-Type": "application/xml" }).end(STAT);
  if (pathname === "/nginxInfo")
    return res
      .writeHead(200, { "Content-Type": "application/json" })
      .end('{"ffmpegFlags":"-c:v copy","dashName":"smoke"}');
  if (pathname === "/dash/smoke.mpd")
    return res
      .writeHead(200, { "Content-Type": "application/dash+xml" })
      .end(fixture);
  if (pathname.startsWith("/webtools/")) {
    const rel = normalize(pathname.slice("/webtools/".length) || "index.html");
    const file = join(buildDir, rel);
    try {
      if (file.startsWith(buildDir) && statSync(file).isFile()) {
        return res
          .writeHead(200, {
            "Content-Type": TYPES[extname(file)] || "application/octet-stream",
          })
          .end(readFileSync(file));
      }
    } catch {
      // fall through to 404
    }
  }
  return res.writeHead(404).end();
});
await new Promise((resolve) => {
  server.listen(0, "127.0.0.1", resolve);
});
const url = `http://127.0.0.1:${server.address().port}/webtools/`;

const browser = await chromium.launch({
  args: ["--mute-audio", "--autoplay-policy=no-user-gesture-required"],
});
const errors = [];
let sliders = 0;
try {
  const page = await browser.newPage();
  page.on("pageerror", (err) => errors.push(err.stack || err.message));
  await page.goto(url);
  await page
    .getByText("smoke", { exact: true })
    .first()
    .waitFor({ timeout: 15000 });
  await page
    .waitForFunction(
      () => document.querySelectorAll('[role="slider"]').length >= 16,
      null,
      { timeout: 15000 }
    )
    .catch(() => {});
  sliders = await page.locator('[role="slider"]').count();
} catch (err) {
  errors.push(err.message);
} finally {
  await browser.close();
  server.close();
}

if (errors.length > 0 || sliders !== 16) {
  console.error(`smoke test FAILED: ${sliders} gain sliders (expected 16)`);
  errors.forEach((e) => console.error(`  page error: ${e}`));
  process.exit(1);
}
console.log(
  "smoke test passed: stream listed, 16 gain sliders, no page errors"
);
