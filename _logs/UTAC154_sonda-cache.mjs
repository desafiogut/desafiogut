const BASE = process.argv[2];
const URL_ = BASE + "/.netlify/functions/produtos?categoria=bronze";
for (const o of ["https://localhost", "https://localhost", "capacitor://localhost", "capacitor://localhost", "https://localhost"]) {
  const r = await fetch(URL_, { headers: { Origin: o } });
  console.log(`${o.padEnd(22)} ${r.status} ACAO=${r.headers.get("access-control-allow-origin")} cache=${r.headers.get("cache-control")} age=${r.headers.get("age")} cache-status=${r.headers.get("cache-status") || "-"}`);
}
