// Tests for parseFirecrawlResults — guards against the various Firecrawl v2
// response shapes so a future API change can't crash the coach edge function.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseFirecrawlResults } from "./index.ts";

const sample = (i: number) => ({
  title: `Title ${i}`,
  url: `https://example.com/${i}`,
  description: `Snippet ${i}`,
});

Deno.test("parseFirecrawlResults — legacy { data: [...] }", () => {
  const fc = { data: [sample(1), sample(2)] };
  const out = parseFirecrawlResults(fc);
  assertEquals(out.length, 2);
  assertEquals(out[0].url, "https://example.com/1");
});

Deno.test("parseFirecrawlResults — v2 { web: [...] }", () => {
  const fc = { web: [sample(1), sample(2), sample(3)] };
  assertEquals(parseFirecrawlResults(fc).length, 3);
});

Deno.test("parseFirecrawlResults — v2 { web: { results: [...] } }", () => {
  const fc = { web: { results: [sample(1)] } };
  assertEquals(parseFirecrawlResults(fc).length, 1);
});

Deno.test("parseFirecrawlResults — v2 { data: { web: [...] } }", () => {
  const fc = { data: { web: [sample(1), sample(2)] } };
  assertEquals(parseFirecrawlResults(fc).length, 2);
});

Deno.test("parseFirecrawlResults — v2 { data: { web: { results: [...] } } }", () => {
  const fc = { data: { web: { results: [sample(1), sample(2), sample(3)] } } };
  assertEquals(parseFirecrawlResults(fc).length, 3);
});

Deno.test("parseFirecrawlResults — drops entries with no url", () => {
  const fc = {
    web: [
      { title: "no url", description: "skip me" },
      sample(1),
    ],
  };
  const out = parseFirecrawlResults(fc);
  assertEquals(out.length, 1);
  assertEquals(out[0].url, "https://example.com/1");
});

Deno.test("parseFirecrawlResults — never throws on garbage", () => {
  assertEquals(parseFirecrawlResults(null).length, 0);
  assertEquals(parseFirecrawlResults(undefined).length, 0);
  assertEquals(parseFirecrawlResults("oops").length, 0);
  assertEquals(parseFirecrawlResults({}).length, 0);
  assertEquals(parseFirecrawlResults({ data: "nope" }).length, 0);
  assertEquals(parseFirecrawlResults({ web: 42 }).length, 0);
  assertEquals(parseFirecrawlResults({ web: { results: "nope" } }).length, 0);
});

Deno.test("parseFirecrawlResults — coerces missing string fields to ''", () => {
  const fc = { web: [{ url: "https://x.com" }] };
  const out = parseFirecrawlResults(fc);
  assertEquals(out[0], { title: "", url: "https://x.com", description: "" });
});
