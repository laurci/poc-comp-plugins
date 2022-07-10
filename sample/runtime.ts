import type {Class} from "type-fest";
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

export function getRegisteredServices() {
    require("./generated/auto-register-plugin/map");

    const registryMap = (global as any).__auto_svc_registry_map as {new: (...args: any[]) => any}[];
    if (!registryMap) return [];

    return registryMap;
}

export abstract class Derivable {
    constructor(protected instance: any, protected instanceClass: Class<any>) {}
}

type DerivableConstructor<T> = {new (): T};

export function derive<T1>(t1: DerivableConstructor<T1>): DerivableConstructor<T1>;
export function derive<T1, T2>(t1: DerivableConstructor<T1>, t2: DerivableConstructor<T2>): DerivableConstructor<T1 & T2>;
export function derive<T1, T2, T3>(
    t1: DerivableConstructor<T1>,
    t2: DerivableConstructor<T2>,
    t3: DerivableConstructor<T3>
): DerivableConstructor<T1 & T2 & T3>;
export function derive<T1, T2, T3, T4>(
    t1: DerivableConstructor<T1>,
    t2: DerivableConstructor<T2>,
    t3: DerivableConstructor<T3>,
    t4: DerivableConstructor<T4>
): DerivableConstructor<T1 & T2 & T3 & T4>;
export function derive(...args: any[]) {
    return assertNotReached();
}
