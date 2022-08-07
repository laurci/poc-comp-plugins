import path from "path";
import fs from "fs";
import {createProject, Project, ts} from "@ts-morph/bootstrap";
import {watch} from "chokidar";
import {
    PluginApi,
    PluginHandleCallback,
    Finder,
    ReplaceHandleResult,
    createPluginHandleApi,
    PluginSourceFileCallback,
    PluginGenerateSourceFileCallback,
    VoidCallback,
} from "./lib";
import {runOutput} from "./vm";

import plugins from "./plugins";

const SRC_DIR = path.join(__dirname, "../sample");
const SRC_DIST_DIR = path.join(SRC_DIR, "./dist");

class PluginApiImpl implements PluginApi {
    public matchHandles: [Finder<any>, PluginHandleCallback<any>][] = [];
    public beforeAllHandles: VoidCallback[] = [];
    public beforeHandles: PluginSourceFileCallback[] = [];
    public afterHandles: PluginSourceFileCallback[] = [];
    public afterAllHandles: VoidCallback[] = [];
    public pendingSourceFiles: {
        filePath: string;
        finalizer: PluginGenerateSourceFileCallback;
    }[] = [];

    constructor() {}

    beforeAll(cb: VoidCallback): PluginApi {
        this.beforeAllHandles.push(cb);
        return this;
    }

    before(cb: PluginSourceFileCallback): PluginApi {
        this.beforeHandles.push(cb);
        return this;
    }

    after(cb: PluginSourceFileCallback): PluginApi {
        this.afterHandles.push(cb);
        return this;
    }

    afterAll(cb: VoidCallback): PluginApi {
        this.afterAllHandles.push(cb);
        return this;
    }

    match<T extends ts.Node>(finder: Finder<T>, cb: PluginHandleCallback<T>): PluginApi {
        this.matchHandles.push([finder, cb]);
        return this;
    }

    createSourceFile(p: string, cb: PluginGenerateSourceFileCallback): string {
        const fullSourcePath = path.join(SRC_DIR, p);

        this.pendingSourceFiles.push({
            filePath: fullSourcePath,
            finalizer: cb,
        });

        return fullSourcePath.replace(".ts", "");
    }
}

function debounce(fn: () => void, ms: number) {
    let timer: NodeJS.Timeout;
    return () => {
        if (timer) {
            clearTimeout(timer);
        }

        timer = setTimeout(fn, ms);
    };
}

function compile(project: Project, plugins: PluginApiImpl[]): Record<string, string> {
    const output: Record<string, string> = {}; // TODO: better in-memory emit store :)
    const writer = (file: string, text: string) => {
        if (file.endsWith(".js") || file.endsWith(".jsx")) {
            output[file] = text;
        } else {
            console.log("writer skipped", file);
        }
    };

    console.time("create program");
    const program = project.createProgram();
    console.timeEnd("create program");

    console.time("create checker");
    const checker = program.getTypeChecker();
    console.timeEnd("create checker");

    console.time("create lang svc");
    const languageService = project.getLanguageService();
    console.timeEnd("create lang svc");

    for (let plugin of plugins) {
        plugin.beforeAllHandles.map((x) => x());
    }

    console.time("emit");
    const emitResult = program.emit(undefined, writer, undefined, false, {
        before: plugins.map((plugin, pId) => (ctx) => {
            return (root) => {
                console.time(`plugin ${pId} ${root.fileName}`);
                root = plugin.beforeHandles.reduce(
                    (root, cb) => cb(createPluginHandleApi(root, ctx, checker, program, languageService)) ?? root,
                    root
                );

                const next = <T extends ts.Node>(node: T): T => ts.visitEachChild(node, visitor, ctx);
                const visitor = (node: ts.Node): ts.Node => {
                    let hasNext: boolean = false;
                    let hasStop: boolean = false;

                    for (const [finder, cb] of plugin.matchHandles) {
                        if (finder(node)) {
                            const result = cb(createPluginHandleApi(node, ctx, checker, program, languageService));

                            if (!result) {
                                hasNext = true;
                                continue;
                            }

                            if (result.type == "next") {
                                hasNext = true;
                            } else if (result.type == "stop") {
                                hasStop = true;
                            } else if (result.type == "replace") {
                                return (result as ReplaceHandleResult).node;
                            }
                        }
                    }

                    if (hasStop && !hasNext) return node;

                    return next(node);
                };

                let result = next(root);

                result = plugin.afterHandles.reduce(
                    (result, cb) => cb(createPluginHandleApi(result, ctx, checker, program, languageService)) ?? result,
                    result
                );
                console.timeEnd(`plugin ${pId} ${root.fileName}`);

                return result;
            };
        }),
    });
    console.timeEnd("emit");

    const diagnosticsText = ts.formatDiagnostics(emitResult.diagnostics, {
        getCanonicalFileName(fileName: string) {
            return fileName;
        },
        getCurrentDirectory() {
            return program.getCurrentDirectory();
        },
        getNewLine() {
            return "\n";
        },
    });

    if (diagnosticsText.trim().length > 0) {
        console.log("diagnostics", diagnosticsText);
    }

    for (let plugin of plugins) {
        plugin.afterAllHandles.map((x) => x());
    }

    const pendingSourceFileNames: string[] = [];

    console.time("generate");
    for (let plugin of plugins) {
        for (let pendingSource of plugin.pendingSourceFiles) {
            const finalStr = pendingSource.finalizer(pendingSource.filePath);

            if (finalStr) {
                let final = project.getSourceFile(pendingSource.filePath);

                if (final) {
                    project.updateSourceFile(pendingSource.filePath, finalStr);
                } else {
                    final = project.createSourceFile(pendingSource.filePath, finalStr, {
                        scriptKind: ts.ScriptKind.TS,
                    });
                }

                pendingSourceFileNames.push(pendingSource.filePath);
            }
        }
    }
    console.timeEnd("generate");

    console.time("create generated program");
    const generatedProgram = project.createProgram();
    console.timeEnd("create generated program");

    console.time("emit generated");
    for (let fileName of pendingSourceFileNames) {
        const file = project.getSourceFile(fileName);
        if (!file) continue;

        generatedProgram.emit(file, writer, undefined, false);
    }
    console.timeEnd("emit generated");

    return output;
}

function compileAndRun(project: Project, plugins: PluginApiImpl[]) {
    console.time("compile");
    const output = compile(project, plugins);
    console.timeEnd("compile");

    runOutput(SRC_DIST_DIR, output);
    console.log("----------");
}

function startWithWatcher(project: Project, plugins: PluginApiImpl[]) {
    const watcher = watch([], {
        persistent: true,
        ignoreInitial: true,
    });

    watcher.add(SRC_DIR);

    function addToWatch(file: string) {
        if (!file.startsWith(SRC_DIR)) return;
        if (file.startsWith(SRC_DIST_DIR)) return;

        console.log("watch", file);
        watcher.add(file);
    }

    function removeFromWatch(file: string) {
        if (!file.startsWith(SRC_DIR)) return;

        console.log("unwatch", file);
        watcher.unwatch(file);
    }

    for (let source of project.getSourceFiles()) {
        addToWatch(source.fileName);
    }

    const processChanges = debounce(() => compileAndRun(project, plugins), 300);

    watcher.on("all", (event, file) => {
        if (!file.startsWith(SRC_DIR)) return;
        if (file.startsWith(SRC_DIST_DIR)) return;

        console.log("watcher", event, file);

        switch (event) {
            case "add": {
                addToWatch(file);
                project.createSourceFile(file, fs.readFileSync(file, "utf8"));
                break;
            }

            case "change": {
                let sourceFile = project.getSourceFile(file);
                if (!sourceFile) {
                    sourceFile = project.createSourceFile(file, fs.readFileSync(file, "utf8"));
                } else {
                    const content = fs.readFileSync(file, "utf8");
                    if (sourceFile.text != content) {
                        console.log("content is different");
                        project.updateSourceFile(file, content);
                    }
                }

                break;
            }

            case "unlink": {
                const sourceFile = project.getSourceFile(file);
                if (!sourceFile) return;

                project.removeSourceFile(sourceFile);
                removeFromWatch(file);
            }

            default: {
                return;
            }
        }

        processChanges();
    });

    processChanges();
}

async function main() {
    console.time("create project");
    const project = await createProject({
        tsConfigFilePath: path.join(SRC_DIR, "tsconfig.json"),
    });
    console.timeEnd("create project");

    const pluginInstances = plugins.compiler.map((x) => {
        const api = new PluginApiImpl();
        x(api);

        return api;
    });

    const isWatchMode = process.argv[process.argv.length - 1] == "--watch";

    if (isWatchMode) {
        console.log("starting watching project");
        startWithWatcher(project, pluginInstances);
    } else {
        compileAndRun(project, pluginInstances);
    }
}

main();
