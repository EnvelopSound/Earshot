// dash.js parses TTML subtitles with imsc, which loads sax, and sax subclasses
// Node's stream.Stream when its module is evaluated. Browsers have no "stream"
// module; webpack 4 used to supply one, Vite does not. sax only uses the class
// for its streaming API, which nothing here calls, so an empty constructor is
// enough.
export function Stream() {}

export default { Stream };
