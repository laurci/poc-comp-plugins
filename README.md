# comp-plugins POC

## Running:

1. `yarn` to install deps
2. `yarn dev` to run the script

## The what

The script creates a new typescript compiler instance (program, checker and language service) and loads the project at `./sample`. It then proceeds to transform the sample with the configured plugins (it creates a transformer factory for each plugin). The plugins then proceed to modify the AST and produce changes where needed. The output is never written to disk, instead it is serialized as JSON and then base64 encoded and transported for execution to a different node process that hacks the shit out of the module resolution system to load the desired files from memory instead of loading them from the disk. This is a hack, for this demo only. If you want to take a look check `./sample/dist/starter.js` and `./src/vm.ts`, but be sure to drink a good amount of holy water before. The main file loaded by the runner process is `sample/index.ts`.

The output of the script is split into the compile time logs (including full dumps of the output files) and the runtime logs. (look after the `running...` log)

### The line plugin

This is the most basic plugin. It brings c++'s `__line` into typescript :) It basically replaces any uses of the `__line` identifier with a number literal representing the line it is located on.

### The macro plugin

This plugin implements macros on a very basic level. A macro is just a call expression that contains a double non-null expression before it's identifier `test!!(...)`. This is just one way to do this. You could also completely ignore this and just look for a specific set of identifiers. There are 2 macros implemented:

-   `magic!!()`: it gets replaced with the number literal 42
-   `log!!(...any[])`: it gets replaced with a call to `console.log`. this example shows that you could have 0 cost abstractions like using different log providers depending on configuration options. you could also completely remove calls depending on the `LOG_LEVEL` config.

### The callsite plugin

This plugins looks for usages of the `CallArgumentText<T>` and `CallPosition` types in the parameters of functions. It then binds references to those parameters and replaces the call expression with a modified version that provides the proper values for the random. A bit hard to grasp, so here's an example:

```typescript
// if you have this signature
function assert(condition: unknown, argText?: CallArgumentText<typeof condition>, position?: CallPosition): asserts condition;

// and you invoke it like so
assert(a === 42);

// it will be converted to the following call
assert(a == 42, "a == 42", {line: 42, col: 69, file: "some random absolute path"});

// so the runtime can make sense of it and use it for stuff
function assert(condition: unknown, argText?: CallArgumentText<typeof condition>, position?: CallPosition): asserts condition {
    if (!argText || !position) throw new Error("Invalid call to assert.");

    if (!condition) {
        throw new AssertionError(argText, position.line, position.col, position.file);
    }
}
```

## The why

Improve the Deepkit type compiler and provide a solid meta-programming platform for Typescript. Help people to remove the runtime bloat and allow for easy to implement zero-cost abstractions. For details see my suggestion in the Deepkit Discord server [here](https://discord.com/channels/759513055117180999/956486537208528937/992438187634987068).

## To do:

-   simplify the API for basic "preprocessor" style plugins
-   `before` and `after` hooks for plugins
-   allowing plugins to append statements to the source file without replacing existing statements
-   allowing plugins to create fake source files to generate arbitrary code in it and refer to it from the real source files (should also be able to emit them)
-   hack the language service and provide cool editor features to plugins
-   write a few more example plugins (any suggestions appreciated)
-   make this work with `incremental` and `watch`

## Making sense of this codebase

Well... there are no docs, this is just a POC :) So go exploring! Start with `src/bin.ts` and `sample/index.ts`.
