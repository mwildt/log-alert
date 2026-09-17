import { EventEmitter } from "node:events";
import { open } from "node:fs/promises";
import { basename } from "node:path";

const NEWLINE = 0x0a;

export class LogTailer extends EventEmitter {
  constructor(filePath, { label } = {}) {
    super();
    this.filePath = filePath;
    this.label = label ?? filePath;
    this.name = basename(filePath);
    this.position = 0;
    this.size = 0;
    this.partial = "";
    this.timer = null;
    this.stopped = false;
  }

  async start() {
    await this.seekToEnd();
    this.tick();
  }

  async seekToEnd() {
    try {
      const stat = await open(this.filePath, "r").then((fh) =>
        fh.stat().then(async (s) => {
          await fh.close();
          return s;
        }),
      );
      this.size = stat.size;
      this.position = stat.size;
    } catch {
      this.size = 0;
      this.position = 0;
    }
  }

  tick(intervalMs = 500) {
    if (this.stopped) return;
    this.timer = setTimeout(() => this.poll().catch((err) => this.emit("error", err)), intervalMs);
  }

  async poll() {
    if (this.stopped) return;

    let fh;
    try {
      fh = await open(this.filePath, "r");
    } catch (err) {
      if (err.code === "ENOENT") {
        this.tick();
        return;
      }
      throw err;
    }

    try {
      const stat = await fh.stat();
      if (stat.size < this.position) {
        this.position = 0;
        this.partial = "";
      }

      if (stat.size !== this.position) {
        const length = stat.size - this.position;
        const buffer = Buffer.alloc(length);
        await fh.read(buffer, 0, length, this.position);
        this.position = stat.size;
        this.size = stat.size;
        this.handleBuffer(buffer);
      }
    } finally {
      await fh.close();
      this.tick();
    }
  }

  handleBuffer(buffer) {
    let start = 0;
    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i] === NEWLINE) {
        const chunk = buffer.subarray(start, i);
        const line = this.partial + chunk.toString("utf8");
        this.partial = "";
        if (line.length > 0) this.emit("line", line);
        start = i + 1;
      }
    }
    if (start < buffer.length) {
      this.partial += buffer.subarray(start).toString("utf8");
    }
  }

  flush() {
    if (this.partial.length > 0) {
      const line = this.partial;
      this.partial = "";
      this.emit("line", line);
    }
  }

  stop() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
