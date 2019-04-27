import os from "os";

export type ChokidarOptions = import("chokidar").WatchOptions;

export type RelcOptions = {
  delay: number;
  attemptCleanExit: boolean | number;
  restartOnCleanExit: boolean;
  verbose: boolean;
  watcher: boolean;
  watchPath: string | string[];
  workers: number;
}

export type Options = Partial<RelcOptions> & ChokidarOptions;
type ReqOptions = RelcOptions & ChokidarOptions;

const options: ReqOptions = {
  // Persistence
  persistent: true,
  // Path filtering
  ignored: [
    "*.txt",
    "*.js.map",
    ".git",
    "node_modules"
  ],
  ignoreInitial: true,
  followSymlinks: true,
  cwd: void 0,
  disableGlobbing: false,
  // Performance
  usePolling: false,
  interval: 100,
  binaryInterval: 300,
  useFsEvents: false,
  alwaysStat: false,
  depth: void 0,
  awaitWriteFinish: false,
  // Errors
  ignorePermissionErrors: false,
  atomic: true,
  // Relc options
  delay: 100,
  attemptCleanExit: true,
  restartOnCleanExit: true,
  verbose: true,
  watcher: true,
  watchPath: ".",
  workers: os.cpus().length
}

export default options;