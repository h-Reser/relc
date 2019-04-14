# Relc - Reloadable Clusters
[![npm version](https://badge.fury.io/js/%40h-reser%2Frelc.svg)](https://badge.fury.io/js/%40h-reser%2Frelc)
[![dependencies Status](https://david-dm.org/h-Reser/relc/status.svg)](https://david-dm.org/h-Reser/relc)
[![devDependencies Status](https://david-dm.org/h-Reser/relc/dev-status.svg)](https://david-dm.org/h-Reser/relc?type=dev)

Runs your app in multiple clusters, and reloads them when they crash.

## Installation
```
npm i @h-reser/relc
```

## Usage
Relc works best as an entry point to you application. The example below is for Typescript.

### ./src/index.ts
```
import Relc from "@h-reser/relc";
import path from "path";

type Options = import("@h-reser/relc").Options;

const options: Options = {
  // (optional) your options
};

new Relc(
  path.resolve(__dirname, "worker.js"),
  options
);
```
### ./src/worker.ts
```
import http from "http";

const port = 3000;

http.createServer((req, res) => {
  res.writeHead(200);
  res.end("hello world\n");
}).listen(port, () => {
  console.log(`Worker ${process.pid} listening on port ${port}!`);
});
```
## Options
The options below are supported in addition to all options from [`Chokidar`](https://github.com/paulmillr/chokidar).
```
{
  delay: number;
  attemptCleanExit: boolean | number;
  restartOnCleanExit: boolean;
  verbose: boolean;
  watcher: boolean;
  watchPath: string | string[];
  workers: number;
  // options from Chokidar
}
```
`delay`: (*default*: `100`) When using the watcher, time in ms seconds between a Chokidar event and a Relc action.

`attemptCleanExit`: (*default*: `true`) When restarting a worker, a graceful shut down will be attempted. Relc will send a signal to your server to shutdown. It if takes more than 1 second, the worker will be force-closed. The time can be customized by specifying the number of milliseconds that you want to wait.

`restartOnCleanExit`: (*default*: `true`) When a worker exits with code 0, Relc will automatically restart it if set to true.

`verbose`: (*default*: `true`) Logs each start/stop event of the workers when true.

`watcher`: (*default*: `true`) Enables / Disables the watcher.

`watchPath`: (*default*: `"."`) Sets the watch path of the watcher. By default, it will watch your process.cwd().

`workers`: (*default*: `os.cpus().length`) Defines the number of workers. By default, Relc will create one worker per CPU on your machine.
