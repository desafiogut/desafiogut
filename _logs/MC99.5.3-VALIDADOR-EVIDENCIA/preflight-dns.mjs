// PREFLIGHT do wildcard (skill ssrf-guard-testing §3e): medir o que o RESOLVEDOR entrega.
import { lookup } from "node:dns/promises";
const NOMES = [
  "192-0-2-1.sslip.io",
  "192-31-196-1.sslip.io",
  "192-52-193-1.sslip.io",
  "192-175-48-1.sslip.io",
  "1-1-1-1.192-0-2-1.sslip.io",
  "1-1-1-1.192-31-196-1.sslip.io",
  "1-1-1-1.192-175-48-1.sslip.io",
  "1-1-1-1.198-18-0-1.sslip.io",
  "1-1-1-1.203-0-113-1.sslip.io",
  "2001-2--1.sslip.io",
  "3fff--1.sslip.io",
  "2001-10--1.sslip.io",
  "2001-20--1.sslip.io",
  "2001-3--1.sslip.io",
  "2001-4-112--1.sslip.io",
  "2620-4f-8000--1.sslip.io",
  "2001-1--1.sslip.io",
  "2001-1--2.sslip.io",
  "1-1-1-1.2001-2--1.sslip.io",
  "1-1-1-1.3fff--1.sslip.io",
  "1-1-1-1.2001-10--1.sslip.io",
  "1-1-1-1.2001-20--1.sslip.io",
  "1-1-1-1.2620-4f-8000--1.sslip.io",
  "1-1-1-1.2002-a9fe-a9fe--1.sslip.io",
  "1-1-1-1.2601--5efe-a9fe-a9fe.sslip.io",
  "1-1-1-1.--1.sslip.io",
  "1-1-1-1.fd00-ec2--254.sslip.io",
  "2602-a9fe-a9fe--1.sslip.io",
  "1-1-1-1.2602-a9fe-a9fe--1.sslip.io",
  "2a00-64--a9fe-a9fe.sslip.io",
  "1-1-1-1.2a00-64--a9fe-a9fe.sslip.io",
];
for (const n of NOMES) {
  try {
    const r = await lookup(n, { all: true });
    console.log(String(n).padEnd(40) + " -> " + r.map((x) => x.address + "/" + x.family).join(" "));
  } catch (e) {
    console.log(String(n).padEnd(40) + " -> ERRO " + (e.code || e.message));
  }
}
