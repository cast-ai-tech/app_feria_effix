import { describe, expect, it } from "vitest";
import {
  parseYoutubeId,
  youtubeEmbedUrl,
  youtubeThumbnail,
} from "@/lib/youtube";

describe("parseYoutubeId", () => {
  it("acepta watch?v=", () => {
    expect(
      parseYoutubeId("https://www.youtube.com/watch?v=sbmsmj64Yek"),
    ).toBe("sbmsmj64Yek");
  });

  it("acepta youtu.be, shorts, embed y m.youtube", () => {
    expect(parseYoutubeId("https://youtu.be/SnW6MnlRwSI")).toBe("SnW6MnlRwSI");
    expect(
      parseYoutubeId("https://www.youtube.com/shorts/0HeztL3sCQo"),
    ).toBe("0HeztL3sCQo");
    expect(
      parseYoutubeId("https://www.youtube-nocookie.com/embed/01JB8wP6GJw"),
    ).toBe("01JB8wP6GJw");
    expect(
      parseYoutubeId("https://m.youtube.com/watch?v=WAvuCD02YcA&t=5s"),
    ).toBe("WAvuCD02YcA");
  });

  it("acepta IDs con guion inicial y el ID pelado", () => {
    expect(
      parseYoutubeId("https://www.youtube.com/watch?v=-ygbbqrkgYc"),
    ).toBe("-ygbbqrkgYc");
    expect(parseYoutubeId("0ZKvlNoJXFQ")).toBe("0ZKvlNoJXFQ");
  });

  it("rechaza URLs que no son de YouTube o sin ID válido", () => {
    expect(parseYoutubeId("https://vimeo.com/12345")).toBeNull();
    expect(parseYoutubeId("https://www.youtube.com/@feriaeffix")).toBeNull();
    expect(parseYoutubeId("")).toBeNull();
    expect(parseYoutubeId(null)).toBeNull();
    expect(parseYoutubeId("no es url")).toBeNull();
  });
});

describe("youtubeEmbedUrl / youtubeThumbnail", () => {
  it("arma el embed sin cookies con autoplay", () => {
    expect(youtubeEmbedUrl("sbmsmj64Yek")).toBe(
      "https://www.youtube-nocookie.com/embed/sbmsmj64Yek?rel=0&modestbranding=1&autoplay=1",
    );
  });
  it("miniatura oficial hq", () => {
    expect(youtubeThumbnail("sbmsmj64Yek")).toBe(
      "https://i.ytimg.com/vi/sbmsmj64Yek/hqdefault.jpg",
    );
  });
});
