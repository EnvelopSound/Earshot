// Parses the nginx-rtmp /stat XML into the object shape xml2js.parseString
// produces with its default options, which is what Webtools reads: the root
// becomes { rtmp: ... }, every other element becomes an object mapping each
// child tag name to an array of children, and an element with no child
// elements becomes its text. The stat XML carries no attributes, so they are
// not mapped. Throws on malformed XML.
function toObject(element) {
  const children = Array.from(element.children);
  if (children.length === 0) {
    return element.textContent;
  }
  const result = {};
  children.forEach((child) => {
    if (!Object.prototype.hasOwnProperty.call(result, child.tagName)) {
      result[child.tagName] = [];
    }
    result[child.tagName].push(toObject(child));
  });
  return result;
}

export default function parseStat(xml) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("malformed /stat XML");
  }
  const root = doc.documentElement;
  return { [root.tagName]: toObject(root) };
}
