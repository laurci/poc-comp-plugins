import {createPlugin, ts} from "../../lib";

const printer = ts.createPrinter();

function logNode<T extends ts.Node>(node: T, ...args: any[]) {
    console.log(...args, printer.printNode(ts.EmitHint.Unspecified, node, node.getSourceFile()));
}

type ReactLogFlags = "render" | "after-render";
interface LogOptions {
    react?: ReactLogFlags[];
}

function renderLogDecorator(
    node: ts.FunctionDeclaration,
    params: ts.ObjectLiteralExpression | undefined,
    factory: ts.NodeFactory
): ts.FunctionDeclaration {
    const options = (eval(`(${params?.getText() ?? "undefined"})`) ?? {}) as LogOptions;

    const prepend: ts.Statement[] = [];
    const append: ts.Statement[] = [];

    // do stuff here

    prepend.push(
        factory.createExpressionStatement(
            factory.createCallExpression(factory.createPropertyAccessExpression(factory.createIdentifier("console"), "log"), undefined, [
                factory.createStringLiteral(`prepend ${node.name!.text}`, false),
            ])
        )
    );

    append.push(
        factory.createExpressionStatement(
            factory.createCallExpression(factory.createPropertyAccessExpression(factory.createIdentifier("console"), "log"), undefined, [
                factory.createStringLiteral(`append ${node.name!.text}`, false),
            ])
        )
    );

    // stop stuff here

    return factory.createFunctionDeclaration(
        node.decorators,
        node.modifiers,
        node.asteriskToken,
        node.name,
        node.typeParameters,
        node.parameters,
        node.type,
        node.body
            ? factory.createBlock([...prepend, factory.createTryStatement(node.body!, undefined, factory.createBlock(append))])
            : undefined
    );
}

export default createPlugin((plugin) => {
    plugin.match(ts.isFunctionDeclaration, ({node, ctx, replace}) => {
        const decorator = node.decorators?.find((x) => ts.isCallExpression(x.expression));
        if (!decorator) return;

        const expr = decorator.expression as ts.CallExpression;
        if (!expr) return;

        const identifier = expr.expression;
        if (!identifier || !ts.isIdentifier(identifier)) return;

        const decoratorIndex = node.decorators!.indexOf(decorator);

        console.log("found decorator", identifier.text, decoratorIndex);

        const newNode = ctx.factory.createFunctionDeclaration(
            node.decorators!.filter((_, i) => i != decoratorIndex),
            node.modifiers,
            node.asteriskToken,
            node.name,
            node.typeParameters,
            node.parameters,
            node.type,
            node.body
        );

        if (identifier.text == "log") {
            const replacement = renderLogDecorator(newNode, expr.arguments[0] as ts.ObjectLiteralExpression, ctx.factory);
            logNode(replacement, "replacement");
            return replace(replacement);
        }
    });
});
