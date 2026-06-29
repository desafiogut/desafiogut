// MC39.17.2 — P1-3: scrub de SVG no servidor (defesa em profundidade).
// node --test _tests/mc3917-svg-sanitize.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { scrubSvg } from "../_lib/svg-sanitize.mjs";

test("remove <script> inline", () => {
  const out = scrubSvg('<svg><script>alert(1)</script><rect/></svg>');
  assert.ok(!/script/i.test(out));
  assert.ok(out.includes("<rect/>"));
});

test("remove handlers on*=", () => {
  const out = scrubSvg('<svg onload="alert(1)"><circle onclick=\'x()\' r="2"/></svg>');
  assert.ok(!/onload/i.test(out));
  assert.ok(!/onclick/i.test(out));
  assert.ok(out.includes("<circle"));
});

test("remove href javascript: e data:text/html", () => {
  const out = scrubSvg('<svg><a href="javascript:alert(1)"><text>x</text></a><image xlink:href="data:text/html,<script>1</script>"/></svg>');
  assert.ok(!/javascript:/i.test(out));
  assert.ok(!/data:text\/html/i.test(out));
});

test("remove <foreignObject> e <iframe>", () => {
  const out = scrubSvg('<svg><foreignObject><body><img src=x onerror=alert(1)></body></foreignObject><iframe src="x"></iframe><rect/></svg>');
  assert.ok(!/foreignObject/i.test(out));
  assert.ok(!/iframe/i.test(out));
  assert.ok(out.includes("<rect/>"));
});

test("preserva SVG benigno (gradiente/rect/text)", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><linearGradient id="g"><stop offset="0" stop-color="#fff"/></linearGradient></defs><rect width="10" height="10" fill="url(#g)"/><text x="1" y="5">ok</text></svg>';
  const out = scrubSvg(svg);
  assert.equal(out, svg);
});

test("entrada não-string vira string vazia", () => {
  assert.equal(scrubSvg(null), "");
  assert.equal(scrubSvg(undefined), "");
});
