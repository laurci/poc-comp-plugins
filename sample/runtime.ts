import nativeAssert from "assert";
import path from "path";

function assertNotReached(): any {
    throw new Error("Unreachable");
}

export function log(...params: any[]) {
    assertNotReached();
}

export function magic(): number {
    return assertNotReached();
}

type CallArgumentText<T> = string;
type CallPosition = {
    line: number;
    col: number;
    file: string;
};

class AssertionError extends Error {
    constructor(argExpr: string, line: number, col: number, file: string) {
        super(
            `Assertion failed at ${path.basename(file)} on line #${line + 1}:${col + 1}: ${argExpr}\n\t\t${file}:${line + 1}:${col + 1}\n`
        );
        this.name = "AssertionError";
    }
}

export function assert(condition: unknown, argText?: CallArgumentText<typeof condition>, position?: CallPosition): asserts condition {
    if (!argText || !position) throw new Error("Invalid call to assert.");

    if (!condition) {
        throw new AssertionError(argText, position.line, position.col, position.file);
    }
}
