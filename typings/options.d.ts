export declare type ChokidarOptions = import("chokidar").WatchOptions;
export declare type RelcOptions = {
    delay: number;
    attemptCleanExit: boolean | number;
    restartOnCleanExit: boolean;
    verbose: boolean;
    watcher: boolean;
    watchPath: string | string[];
    workers: number;
};
export declare type Options = Partial<RelcOptions> & ChokidarOptions;
declare type ReqOptions = RelcOptions & ChokidarOptions;
declare const options: ReqOptions;
export default options;
//# sourceMappingURL=options.d.ts.map