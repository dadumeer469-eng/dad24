// Neural MALE Urdu TTS for the Dadu Food voice agent — Microsoft Edge
// Read-Aloud voice ur-PK-AsadNeural (Munchi is a man, so the voice must
// be male — the user said "female na lagao, man ki lagao").
//
// Free, no API key. The old Edge host (speech.platform.bing.com) is
// 401/403 since Microsoft moved the voices in Oct 2026; the live host is
// api.msedgeservices.com, reached over a raw-TLS WebSocket with a
// Sec-MS-GEC token (SHA-256 of the 5-minute Windows-tick window +
// TrustedClientToken, uppercase hex) and Sec-MS-GEC-Version. Node's
// built-in WebSocket cannot send the required Origin/User-Agent headers,
// so this module speaks the WebSocket protocol directly on a TLS socket
// (node:tls + node:crypto only, zero dependencies).
//
// If Edge ever refuses the request, callers MUST fall back to the phone
// voice — never leave the call silent, and never fall back to a female
// voice (the Google TTS Urdu voice is female and is NOT used).
//
// This module is deliberately self-contained (no imports from server/):
// Vercel compiles api/*.ts to ESM, and Node ESM cannot resolve
// extension-less relative imports (the bug fixed in 1b752cb/9beeab1).

import tls from "node:tls";
import net from "node:net";
import crypto from "node:crypto";

const EDGE_HOST = "api.msedgeservices.com";
const EDGE_TOKEN = "6A5AA1D4EAFF4E9FB9E31F416D619CBE4B1C7FBBED2B3D3E0E0B8B4C0C6F8B";
// Pinned Chromium build the service expects in Sec-MS-GEC-Version.
// If Edge starts 401-ing, this is the first constant to refresh.
const EDGE_CHROMIUM = "143.0.3650.75";
const VOICE = "ur-PK-AsadNeural";
const MAX_CHUNK = 180;
const MAX_TEXT = 1000;
const TURN_TIMEOUT_MS = 15000;
const RATE_LIMIT_PER_MIN = 20;
const CACHE_MAX = 32;

// Per-IP rate limit (own map — separate budget from the Groq endpoints).
const hitsByIp = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - 60_000;
  const hits = (hitsByIp.get(ip) || []).filter((t) => t > windowStart);
  hits.push(now);
  hitsByIp.set(ip, hits);
  return hits.length > RATE_LIMIT_PER_MIN;
}

// Small in-memory cache: the greeting and the common short lines repeat
// on every call, so a warm serverless instance skips the re-fetch.
const audioCache = new Map<string, Buffer>();
function cachePut(text: string, audio: Buffer) {
  if (audioCache.size >= CACHE_MAX) {
    const first = audioCache.keys().next().value;
    if (first !== undefined) audioCache.delete(first);
  }
  audioCache.set(text, audio);
}

// Split text into chunks of at most MAX_CHUNK chars, preferably at
// sentence boundaries (Urdu ۔, ؟, !, ., ,) so no word is cut mid-way.
export function splitChunks(text: string): string[] {
  const sentences = text.match(/[^۔؟!.,،]+[۔؟!.,،]?/g) || [text];
  const chunks: string[] = [];
  let current = "";
  const pushCurrent = () => {
    const t = current.trim();
    if (t) chunks.push(t);
    current = "";
  };
  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;
    if ((current + " " + s).trim().length <= MAX_CHUNK) {
      current = (current + " " + s).trim();
      continue;
    }
    pushCurrent();
    if (s.length <= MAX_CHUNK) {
      current = s;
      continue;
    }
    // One very long sentence: split it on spaces.
    for (const word of s.split(/\s+/)) {
      if ((current + " " + word).trim().length > MAX_CHUNK) pushCurrent();
      current = (current + " " + word).trim();
    }
  }
  pushCurrent();
  return chunks.length > 0 ? chunks : [text];
}

function computeGec(token: string): string {
  const unix = Math.floor(Date.now() / 1000);
  const ticks = (BigInt(unix + 11644473600) / 300n) * 300n * 10000000n;
  return crypto.createHash("sha256").update(ticks.toString() + token).digest("hex").toUpperCase();
}

// Minimal WebSocket frame encoder (client frames must be masked).
function encodeFrame(opcode: number, payload: Buffer): Buffer {
  const mask = crypto.randomBytes(4);
  const len = payload.length;
  let header: Buffer;
  if (len < 126) {
    header = Buffer.from([0x80 | opcode, 0x80 | len]);
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  const masked = Buffer.alloc(len);
  for (let i = 0; i < len; i++) masked[i] = payload[i] ^ mask[i % 4];
  return Buffer.concat([header, mask, masked]);
}

// Open a TLS connection to the Edge host. Production (Vercel) has direct
// internet. EDGE_TTS_PROXY (a proxy URL) enables CONNECT tunneling for
// local testing only — it is never set in production.
async function connectEdgeTls(): Promise<tls.TLSSocket> {
  const proxy = process.env.EDGE_TTS_PROXY || "";
  if (!proxy) {
    return new Promise((resolve, reject) => {
      const s = tls.connect({ host: EDGE_HOST, port: 443, servername: EDGE_HOST });
      s.once("secureConnect", () => resolve(s));
      s.once("error", reject);
    });
  }
  const proxyUrl = new URL(proxy);
  const auth = proxyUrl.username
    ? "Basic " +
      Buffer.from(decodeURIComponent(proxyUrl.username) + ":" + decodeURIComponent(proxyUrl.password)).toString("base64")
    : "";
  const tcp = net.connect({ host: proxyUrl.hostname, port: Number(proxyUrl.port) || 3128 });
  const leftover = await new Promise<Buffer>((resolve, reject) => {
    let b = Buffer.alloc(0);
    const onData = (d: Buffer) => {
      b = Buffer.concat([b, d]);
      const end = b.indexOf("\r\n\r\n");
      if (end === -1) return;
      tcp.removeListener("data", onData);
      const head = b.subarray(0, end).toString();
      if (!head.includes("200")) return reject(new Error("proxy CONNECT failed: " + head.split("\r\n")[0]));
      resolve(b.subarray(end + 4));
    };
    tcp.on("data", onData);
    tcp.once("error", reject);
    tcp.on("connect", () => {
      tcp.write(
        `CONNECT ${EDGE_HOST}:443 HTTP/1.1\r\nHost: ${EDGE_HOST}:443\r\n` +
          (auth ? `Proxy-Authorization: ${auth}\r\n` : "") +
          `\r\n`,
      );
    });
  });
  // Hand the socket to TLS: drop the plain-data listener first, or it
  // keeps swallowing the handshake bytes and TLS never completes.
  tcp.removeAllListeners("data");
  tcp.pause();
  return new Promise((resolve, reject) => {
    const s = tls.connect({ socket: tcp, servername: EDGE_HOST });
    s.once("error", reject);
    if (leftover.length > 0) s.unshift(leftover);
    s.once("secureConnect", () => resolve(s));
  });
}

const ts = () => new Date().toUTCString();
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function synthesizeChunk(chunk: string): Promise<Buffer> {
  const socket = await connectEdgeTls();
  try {
    return await new Promise<Buffer>((resolve, reject) => {
      const audioParts: Buffer[] = [];
      let buf = Buffer.alloc(0);
      let handshakeDone = false;
      let handshakeBuf = Buffer.alloc(0);
      let settled = false;
      const finish = (err?: Error, out?: Buffer) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (err) reject(err);
        else resolve(out ?? Buffer.alloc(0));
      };
      const timer = setTimeout(() => finish(new Error("Edge TTS timed out")), TURN_TIMEOUT_MS);
      const gec = computeGec(EDGE_TOKEN);
      const connectionId = crypto.randomUUID();
      const requestId = crypto.randomUUID();
      const muid = crypto.randomBytes(16).toString("hex");
      const path =
        `/tts/cognitiveservices/websocket/v1?Ocp-Apim-Subscription-Key=${EDGE_TOKEN}` +
        `&Sec-MS-GEC=${gec}&Sec-MS-GEC-Version=1-${EDGE_CHROMIUM}&ConnectionId=${connectionId}`;
      const wsKey = crypto.randomBytes(16).toString("base64");
      const configMsg =
        `X-Timestamp:${ts()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
        JSON.stringify({
          context: {
            synthesis: {
              audio: {
                metadataoptions: { sentenceBoundaryEnabled: "false", wordBoundaryEnabled: "true" },
                outputFormat: "audio-24khz-48kbitrate-mono-mp3",
              },
            },
          },
        });
      const ssmlMsg =
        `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${ts()}\r\nPath:ssml\r\n\r\n` +
        `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ur-PK'><voice name='${VOICE}'>${esc(chunk)}</voice></speak>`;

      socket.on("data", (data: Buffer) => {
        if (!handshakeDone) {
          handshakeBuf = Buffer.concat([handshakeBuf, data]);
          const end = handshakeBuf.indexOf("\r\n\r\n");
          if (end === -1) return;
          const head = handshakeBuf.subarray(0, end).toString();
          if (!head.includes("101")) return finish(new Error("Edge handshake failed: " + head.split("\r\n")[0]));
          handshakeDone = true;
          buf = Buffer.concat([buf, handshakeBuf.subarray(end + 4)]);
          socket.write(encodeFrame(0x1, Buffer.from(configMsg, "utf8")));
          socket.write(encodeFrame(0x1, Buffer.from(ssmlMsg, "utf8")));
        } else {
          buf = Buffer.concat([buf, data]);
        }
        while (true) {
          if (buf.length < 2) break;
          const fin = (buf[0] & 0x80) !== 0;
          const opcode = buf[0] & 0x0f;
          const masked = (buf[1] & 0x80) !== 0;
          let len = buf[1] & 0x7f;
          let off = 2;
          if (len === 126) {
            if (buf.length < 4) break;
            len = buf.readUInt16BE(2);
            off = 4;
          } else if (len === 127) {
            if (buf.length < 10) break;
            len = Number(buf.readBigUInt64BE(2));
            off = 10;
          }
          const maskLen = masked ? 4 : 0;
          if (buf.length < off + maskLen + len) break;
          let payload = buf.subarray(off + maskLen, off + maskLen + len);
          if (masked) {
            const mask = buf.subarray(off, off + 4);
            const unmasked = Buffer.alloc(len);
            for (let i = 0; i < len; i++) unmasked[i] = payload[i] ^ mask[i % 4];
            payload = unmasked;
          }
          buf = buf.subarray(off + maskLen + len);
          if (!fin) continue;
          if (opcode === 0x9) {
            socket.write(encodeFrame(0xa, payload));
            continue;
          }
          if (opcode === 0x8) continue;
          if (opcode === 0x1) {
            const text = payload.toString("utf8");
            const p = (text.match(/Path:([^\r\n]+)/) || [])[1];
            if (p === "turn.end") return finish(undefined, Buffer.concat(audioParts));
            continue;
          }
          if (opcode === 0x2) {
            // Binary frames: 2-byte big-endian header length, header, MP3.
            if (payload.length >= 2) {
              const headerLen = payload.readUInt16BE(0);
              const audio = payload.subarray(2 + headerLen);
              if (audio.length > 0) audioParts.push(audio);
            }
            continue;
          }
        }
      });
      socket.on("error", (e) => finish(e as Error));
      socket.on("close", () => finish(new Error("Edge socket closed early")));
      socket.write(
        `GET ${path} HTTP/1.1\r\n` +
          `Host: ${EDGE_HOST}\r\n` +
          `Upgrade: websocket\r\n` +
          `Connection: Upgrade\r\n` +
          `Sec-WebSocket-Key: ${wsKey}\r\n` +
          `Sec-WebSocket-Version: 13\r\n` +
          `Origin: chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold\r\n` +
          `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/${EDGE_CHROMIUM}\r\n` +
          `Pragma: no-cache\r\n` +
          `Cache-Control: no-cache\r\n` +
          `Accept-Language: en-US,en;q=0.9\r\n` +
          `Cookie: muid=${muid}\r\n\r\n`,
      );
    });
  } finally {
    try {
      socket.destroy();
    } catch {
      /* noop */
    }
  }
}

export async function synthesizeSpeech(text: string): Promise<Buffer> {
  const cached = audioCache.get(text);
  if (cached) return cached;
  const chunks = splitChunks(text);
  const parts = await Promise.all(chunks.map((c) => synthesizeChunk(c)));
  const audio = Buffer.concat(parts);
  if (audio.length < 100) throw new Error("Edge TTS returned empty audio");
  cachePut(text, audio);
  return audio;
}

export interface SpeakResult {
  status: number;
  body: Buffer | { error: string };
}

export async function handleVoiceSpeak(body: unknown, ip: string): Promise<SpeakResult> {
  const text = (body as { text?: unknown } | null)?.text;
  if (typeof text !== "string" || text.trim().length === 0) {
    return { status: 400, body: { error: "text is required" } };
  }
  if (text.length > MAX_TEXT) {
    return { status: 400, body: { error: "text is too long" } };
  }
  if (rateLimited(ip)) {
    return { status: 429, body: { error: "Too many requests — try again shortly" } };
  }
  try {
    const audio = await synthesizeSpeech(text.trim());
    return { status: 200, body: audio };
  } catch (err) {
    console.error("Voice-speak error:", (err as Error)?.message || err);
    return { status: 502, body: { error: "Speech service unavailable" } };
  }
}
