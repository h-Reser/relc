import Deferred from "@h-reser/deferred";
declare type ClusterWorker = import("cluster").Worker;
export declare type Options = import("./options").Options;
declare type Worker = {
    isListening: Deferred;
    isOnline: Deferred;
    worker: ClusterWorker;
};
declare type Workers = {
    [key: number]: Worker;
};
export default class Relc {
    private options;
    private watcherTimer;
    watcher: import("chokidar").FSWatcher | void;
    workers: Workers;
    constructor(module: string, options?: Options);
    private readonly relcOptions;
    private readonly chokidarOptions;
    private readonly version;
    private clear;
    private command;
    private commands;
    private createWorker;
    private fork;
    private forkAll;
    private handleWorkerExit;
    private initiateCluster;
    private master;
    private onWatcherError;
    private onWatcherEvent;
    private onWatcherReady;
    private restartWorkers;
    private worker;
}
export {};
//# sourceMappingURL=index.d.ts.map