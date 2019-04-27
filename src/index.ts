import chokidar from "chokidar";
import cluster from "cluster";
import Deferred from "@h-reser/deferred";
import fs from "fs";
import os from "os";
import path from "path";

import defaults from "./options";
import log from "./logger";

type RelcOptions = import("./options").RelcOptions;
type ChokidarOptions = import("./options").ChokidarOptions;

type ClusterWorker = import("cluster").Worker;
export type Options = import("./options").Options;

type Worker = {
  isListening: Deferred,
  isOnline: Deferred,
  worker: ClusterWorker
};
type Workers = {
  [key: number]: Worker;
};

export default class Relc {

  private options: Options = {};
  private watcherTimer: NodeJS.Timeout | void = void 0;

  public watcher: import("chokidar").FSWatcher | void = void 0;
  public workers: Workers = {};

  public constructor(
    module: string,
    options: Options = {}
  ) {
    if (cluster.isMaster) {
      return this.master(options);
    }
    return this.worker(module);
  }

  private get relcOptions(): RelcOptions {
    return {
      delay: this.options.delay === void 0
        ? defaults.delay
        : this.options.delay,
      attemptCleanExit: this.options.attemptCleanExit === void 0
        ? defaults.attemptCleanExit
        : this.options.attemptCleanExit,
      restartOnCleanExit: this.options.restartOnCleanExit === void 0
        ? defaults.restartOnCleanExit
        : this.options.restartOnCleanExit,
      verbose: this.options.verbose === void 0
        ? defaults.verbose
        : this.options.verbose,
      watcher: this.options.watcher === void 0
        ? defaults.watcher
        : this.options.watcher,
      watchPath: this.options.watchPath === void 0
        ? defaults.watchPath
        : this.options.watchPath,
      workers: this.options.workers === void 0
        ? defaults.workers
        : this.options.workers,
    }
  }

  private get chokidarOptions(): ChokidarOptions {
    return {
      persistent: this.options.persistent === void 0
        ? defaults.persistent
        : this.options.persistent,
      ignored: this.options.ignored === void 0
        ? defaults.ignored
        : this.options.ignored,
      ignoreInitial: this.options.ignoreInitial === void 0
        ? defaults.ignoreInitial
        : this.options.ignoreInitial,
      followSymlinks: this.options.followSymlinks === void 0
        ? defaults.followSymlinks
        : this.options.followSymlinks,
      cwd: this.options.cwd === void 0
        ? defaults.cwd
        : this.options.cwd,
      disableGlobbing: this.options.disableGlobbing === void 0
        ? defaults.disableGlobbing
        : this.options.disableGlobbing,
      usePolling: this.options.usePolling === void 0
        ? defaults.usePolling
        : this.options.usePolling,
      interval: this.options.interval === void 0
        ? defaults.interval
        : this.options.interval,
      binaryInterval: this.options.binaryInterval === void 0
        ? defaults.binaryInterval
        : this.options.binaryInterval,
      useFsEvents: this.options.useFsEvents === void 0
        ? defaults.useFsEvents
        : this.options.useFsEvents,
      alwaysStat: this.options.alwaysStat === void 0
        ? defaults.alwaysStat
        : this.options.alwaysStat,
      depth: this.options.depth === void 0
        ? defaults.depth
        : this.options.depth,
      awaitWriteFinish: typeof this.options.awaitWriteFinish === "boolean"
        ? this.options.awaitWriteFinish
        : this.options.awaitWriteFinish === void 0
          ? defaults.awaitWriteFinish
          : this.options.awaitWriteFinish,
      ignorePermissionErrors: this.options.ignorePermissionErrors === void 0
        ? defaults.ignorePermissionErrors
        : this.options.ignorePermissionErrors,
      atomic: this.options.atomic === void 0
        ? defaults.atomic
        : this.options.atomic,
    }
  }

  private get version(): string {
    const packageJson = fs.readFileSync(path.resolve(__dirname, "..", "package.json"), "utf8");
    const parsed = JSON.parse(packageJson);
    return parsed.version;
  }

  private clear(): void {
    process.stdout.write("\x1Bc");
  }

  private command(cmd: string): void {
    switch (cmd) {
      case "rs":
        this.restartWorkers(true);
        break;
      case "clear":
        this.clear();
        break;
      default:
        log.error(`unknown command '${cmd}'`);
    }
    process.stdin.resume();
  }

  private commands(): void {
    const instance = this;
    process.stdin.setEncoding("utf8");
    process.stdin.on("readable", function () {
      const chunk = process.stdin.read() as string;
      chunk
        .split(os.EOL)
        .forEach(str => {
          if (str === null || !str.length) {
            return;
          }
          instance.command(str);
        });
    });
  }

  private createWorker(worker: ClusterWorker): Worker {
    const isListening = new Deferred();
    const isOnline = new Deferred();

    worker.on("message", (msg) => {
      worker.emit(msg);
    });

    worker.on("listening", () => {
      isListening.resolve();
    });
    worker.on("online", () => {
      worker.send("RELC_PID:" + process.pid); // Save PID of main process in process.env of the worker
      if (this.relcOptions.verbose)
        log.success(`worker ${worker.process.pid} is online`);
      isOnline.resolve();
    });

    return {
      isListening,
      isOnline,
      worker
    }
  }

  private fork(): void {
    const worker = cluster.fork();
    this.workers[worker.id] = this.createWorker(worker);
  }

  private forkAll(): void {
    for (let i = 0; i < this.relcOptions.workers; i++) {
      this.fork();
    }
  }

  private handleWorkerExit(
    worker: ClusterWorker,
    code: number
  ): void {
    if (worker.exitedAfterDisconnect && this.relcOptions.verbose) {
      log.warn(`worker ${worker.process.pid} has exited.`);
    }
    else if (this.relcOptions.verbose) {
      log.error(`unexpected exit of worker ${worker.process.pid} with code ${code}.`);
    }
    const classWorker = this.workers[worker.id];
    if (!classWorker) return;
    const hasWatcher = this.relcOptions.watcher;
    const { isRejected, isResolved } = classWorker.isListening;
    const isListening = isRejected || isResolved;
    const restartOnCleanExit = this.relcOptions.restartOnCleanExit;
    delete this.workers[worker.id];
    if (
      !hasWatcher
      || (code === 0 && restartOnCleanExit)
      || (isListening && code !== 0)
    ) {
      this.restartWorkers();
    }
  }

  private initiateCluster() {
    if (this.relcOptions.verbose)
      log.info("initiating cluster...");

    cluster.on("exit", (worker: ClusterWorker, code: number) => {
      this.handleWorkerExit(worker, code);
    });

    this.forkAll();
  }

  private master(options: Options): Relc {
    this.clear();
    log.dimmed(this.version);
    this.commands();
    this.options = options;

    if (!this.relcOptions.watcher) {
      this.onWatcherReady()();
    }
    else {
      log.dimmed("watching: " + String(this.relcOptions.watchPath));

      this.watcher = chokidar.watch(
        this.relcOptions.watchPath,
        this.chokidarOptions
      )
        .on("add", () => this.onWatcherEvent())
        .on("addDir", () => this.onWatcherEvent())
        .on("change", () => this.onWatcherEvent())
        .on("error", this.onWatcherError)
        .on("ready", this.onWatcherReady())
        .on("unlink", () => this.onWatcherEvent())
        .on("unlinkDir", () => this.onWatcherEvent());
    }
    return this;
  }

  private onWatcherError(error: Error): void {
    throw error;
  }

  private onWatcherEvent(): void {
    if (this.watcherTimer) clearTimeout(this.watcherTimer);

    this.watcherTimer = setTimeout(() => {
      this.restartWorkers();
    }, this.relcOptions.delay);
  }

  private onWatcherReady(): () => void {
    const instance = this;
    return () => {
      instance.initiateCluster();
    }
  }

  private restartWorkers(isManuallyTriggered: boolean = false): void {
    if (isManuallyTriggered)
      log.info("restarting by request...");
    else
      log.info("restarting due to changes...");

    Object.keys(cluster.workers).forEach(key => {
      const worker = (cluster.workers[key] as ClusterWorker);
      delete this.workers[worker.id];
      const attemptCleanExit = this.relcOptions.attemptCleanExit;
      if (attemptCleanExit || typeof attemptCleanExit === "number") {
        const timeout = setTimeout(() => {
          worker.kill();
          if (this.relcOptions.verbose)
            log.info(`worker ${worker.process.pid} could not be gracefully exited.`)
        }, 1000);
        worker.disconnect();
        worker.on("exit", () => {
          clearTimeout(timeout);
        });
      }
      else {
        worker.kill();
      }
    });
    this.forkAll();
  }

  private worker(module: string): Relc {
    process.on("message", (msg) => {
      // Save PID of main process in process.env of the worker
      if (msg.startsWith("RELC_PID:")) {
        process.env.RELC_PID = msg.substring("RELC_PID:".length);
      }
    });

    const cwd = this.chokidarOptions.cwd || process.cwd();
    const resolvedPath = path.resolve(cwd, module);
    import(resolvedPath);
    return this;
  }

}