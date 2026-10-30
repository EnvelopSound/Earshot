// sax (loaded by dash.js through imsc) requires Node's string_decoder only
// inside its write() when a Buffer global exists, which browsers do not have.
// Aliasing it here keeps the build free of Node built-ins.
export class StringDecoder {
  constructor() {
    throw new Error("string_decoder is not available in the browser");
  }
}

export default { StringDecoder };
