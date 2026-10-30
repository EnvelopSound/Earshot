# Earshot Webtools

The debugging page Earshot serves at `/webtools`. It lists the streams on the server, plays the DASH output of the selected stream and shows its manifest, buffer and audio details. It is a React app built with [Vite](https://vite.dev). The Docker image runs `yarn build` itself and nginx serves the result, so none of the commands below are needed to run Earshot.

Development needs Node.js 22.22 or later (22.x from 22.22.2, 24.x from 24.15.0, or 26 and later) and Yarn 1. Run `yarn install` first.

## Scripts

### `yarn start`

Starts a development server at http://localhost:3000/webtools/ (with the trailing slash) that reloads the page on every edit. The page reads `/stat`, `/nginxInfo` and `/dash` from an Earshot server, and the development server forwards those requests to http://localhost, where `docker-compose up` publishes Earshot. To use another server, set `EARSHOT_URL`, for example `EARSHOT_URL=http://192.0.2.10 yarn start`.

### `yarn build`

Builds the page into `build/`, which the Dockerfile copies into the image.

### `yarn test`

Runs the unit tests with [Vitest](https://vitest.dev).

### `yarn smoke`

Builds the page and loads it in headless Chromium against a mocked Earshot, failing if the page throws or does not draw one gain slider per audio channel. Run `npx playwright install chromium` once beforehand.

### `yarn lint`

Checks the code with ESLint and Prettier.
