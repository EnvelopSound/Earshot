import { expect, test } from "vitest";

import parseStat from "./parseStat";

test("matches the xml2js shape Webtools reads", () => {
  const result = parseStat(`<?xml version="1.0" encoding="utf-8" ?>
<?xml-stylesheet type="text/xsl" href="static/stat.xsl" ?>
<rtmp>
<bw_in>1200</bw_in>
<server><application><name>live</name><live>
<stream><name>test</name><meta><audio><channels>16</channels></audio></meta><publishing/></stream>
<nclients>1</nclients>
</live></application></server>
</rtmp>`);
  expect(result).toEqual({
    rtmp: {
      bw_in: ["1200"],
      server: [
        {
          application: [
            {
              name: ["live"],
              live: [
                {
                  stream: [
                    {
                      name: ["test"],
                      meta: [{ audio: [{ channels: ["16"] }] }],
                      publishing: [""],
                    },
                  ],
                  nclients: ["1"],
                },
              ],
            },
          ],
        },
      ],
    },
  });
});

test("throws on malformed XML", () => {
  expect(() => parseStat("<rtmp><server></rtmp>")).toThrow();
});
