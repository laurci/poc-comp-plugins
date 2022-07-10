import {ts} from "../src/lib";

export type DeriveImplementationArgs = {
    factory: ts.NodeFactory;
    self: {
        declaration: ts.ClassDeclaration;
        symbol: ts.Symbol;
        type: ts.Type;
    };
    method: {
        declaration: ts.MethodDeclaration;
        symbol: ts.Symbol;
    };
    target: {
        declaration: ts.ClassDeclaration;
        symbol: ts.Symbol;
        type: ts.Type;
    };
};

export type DeriveOf<T> = {
    [key in keyof T]: (info: DeriveImplementationArgs) => ts.Statement[] | undefined | void;
};

type ConstructorFunction = abstract new (...args: any[]) => any;

export function deriveOf<T extends ConstructorFunction>(handler: DeriveOf<InstanceType<T>>) {
    return handler;
}
