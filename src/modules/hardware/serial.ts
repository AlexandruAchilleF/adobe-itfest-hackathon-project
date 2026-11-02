// Punte către Arduino / ESP32 / imprimante termice prin Web Serial (Chrome/Edge, desktop).
//
//   const port = await connectSerial(115200);
//   await port.writeLine("LED 255 0 0");
//   port.onLine((line) => console.log("de la placă:", line));
//
// Exemplu Arduino: Serial.begin(115200); citește cu Serial.readStringUntil('\n').

export function serialSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

/** Împarte un flux de text în linii complete (păstrează restul pentru bucata următoare). */
export class LineSplitter {
  private rest = "";
  push(chunk: string): string[] {
    const parts = (this.rest + chunk).split(/\r?\n/);
    this.rest = parts.pop() ?? "";
    return parts.filter((l) => l.length > 0);
  }
}

interface SerialPortLike {
  open(opts: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
}

export interface SerialConnection {
  writeLine(text: string): Promise<void>;
  write(bytes: Uint8Array): Promise<void>;
  onLine(cb: (line: string) => void): void;
  close(): Promise<void>;
}

export async function connectSerial(baudRate = 115200): Promise<SerialConnection> {
  if (!serialSupported()) throw new Error("Web Serial nu e disponibil. Folosește Chrome sau Edge pe desktop.");
  const serial = (navigator as unknown as { serial: { requestPort(): Promise<SerialPortLike> } }).serial;
  const port = await serial.requestPort();
  await port.open({ baudRate });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const listeners: Array<(l: string) => void> = [];
  const splitter = new LineSplitter();
  const reader = port.readable!.getReader();
  let closed = false;

  void (async () => {
    try {
      while (!closed) {
        const { value, done } = await reader.read();
        if (done) break;
        for (const line of splitter.push(decoder.decode(value, { stream: true }))) listeners.forEach((cb) => cb(line));
      }
    } catch {
      /* portul a fost deconectat */
    }
  })();

  const write = async (bytes: Uint8Array) => {
    const writer = port.writable!.getWriter();
    try {
      await writer.write(bytes);
    } finally {
      writer.releaseLock();
    }
  };

  return {
    write,
    writeLine: (text) => write(encoder.encode(`${text}\n`)),
    onLine: (cb) => void listeners.push(cb),
    close: async () => {
      closed = true;
      await reader.cancel().catch(() => {});
      reader.releaseLock();
      await port.close();
    },
  };
}
