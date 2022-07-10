import {DeriveImplementationArgs, DeriveOf} from "../../../sample/comptime";
import {derives} from "../../../sample/meta/derive";
import {createPlugin, ts} from "../../lib";

/**
 * 
class WelcomeMessage extends class {
    protected _greet: Greet = new (class extends Greet {
        hello(): void {
            // generated code goes here
        }
    })(this, WelcomeMessage);

    protected _serializable = new (class extends Serializable {
        toByteArray(): Uint8Array {
            // generated code goes here
            throw new Error("Method not implemented.");
        }
    })(this, WelcomeMessage);
} {
    public hello() {
        return this._greet.hello();
    }

    public toByteArray(): Uint8Array {
        return this._serializable.toByteArray();
    }
}
 */

function renderImplementation(info: DeriveImplementationArgs): ts.Statement[] {
    const selfName = info.self.declaration.name!.getText();
    const methodName = info.method.declaration.name.getText();

    const deriveHandler = derives[selfName] as DeriveOf<any> | undefined;
    const deriveHandlerMethod = deriveHandler && deriveHandler[methodName];

    if (deriveHandlerMethod) {
        const result = deriveHandlerMethod(info);
        if (!result) return [];

        return result;
    } else {
        console.log(`Missing derive implementation for ${selfName}.${methodName}`);
        return [
            info.factory.createThrowStatement(
                info.factory.createNewExpression(info.factory.createIdentifier("Error"), undefined, [
                    info.factory.createStringLiteral(`Missing derive implementation for ${selfName}.${methodName}`),
                ])
            ),
        ];
    }
}

export default createPlugin((plugin) => {
    plugin.match(ts.isClassDeclaration, ({node, ctx, checker, replace}) => {
        const printer = ts.createPrinter();

        const deriveClause = node.heritageClauses?.find((clause) => {
            return clause.getText().startsWith("extends derive");
        });

        if (!deriveClause) return;

        const deriveExpression = deriveClause.types[0]?.expression;
        if (!deriveExpression || !ts.isCallExpression(deriveExpression)) return;

        const deriveIdentifiers = deriveExpression.arguments.filter((x) => ts.isIdentifier(x));
        if (!deriveIdentifiers.length) return;

        const classType = checker.getTypeAtLocation(node);
        const classSymbol = classType?.getSymbol();

        if (!classSymbol) return;
        const publicMethodDeclarations: ts.MethodDeclaration[] = [];
        const implementationPropertyDeclarations: ts.PropertyDeclaration[] = [];

        for (let identifier of deriveIdentifiers) {
            const ty = checker.getTypeAtLocation(identifier);
            const symbol = ty?.getSymbol();
            const declaration = symbol?.valueDeclaration;
            if (!declaration || !ts.isClassDeclaration(declaration)) continue;

            const methods = declaration.members.filter((x) => {
                if (!ts.isMethodDeclaration(x)) return false;
                if (!x.modifiers?.some((x) => x.kind === ts.SyntaxKind.AbstractKeyword)) return false;
                if (x.modifiers?.some((x) => x.kind === ts.SyntaxKind.StaticKeyword)) return false;
                return true;
            }) as ts.MethodDeclaration[];

            const implementationMethods: ts.MethodDeclaration[] = [];

            for (let method of methods) {
                const methodSymbol = checker.getSymbolAtLocation(method.name);
                if (!methodSymbol) continue;

                const args: DeriveImplementationArgs = {
                    factory: ts.factory,
                    self: {
                        declaration,
                        symbol,
                        type: ty,
                    },
                    method: {
                        declaration: method,
                        symbol: methodSymbol,
                    },
                    target: {
                        declaration: node,
                        symbol: classSymbol,
                        type: classType,
                    },
                };

                implementationMethods.push(
                    ctx.factory.createMethodDeclaration(
                        undefined,
                        undefined,
                        undefined,
                        method.name,
                        undefined,
                        undefined,
                        method.parameters,
                        method.type,
                        ctx.factory.createBlock(renderImplementation(args))
                    )
                );

                publicMethodDeclarations.push(
                    ts.factory.createMethodDeclaration(
                        undefined,
                        [ctx.factory.createModifier(ts.SyntaxKind.PublicKeyword)],
                        undefined,
                        method.name,
                        undefined,
                        undefined,
                        method.parameters,
                        method.type,
                        ctx.factory.createBlock([
                            ctx.factory.createReturnStatement(
                                ctx.factory.createCallExpression(
                                    ctx.factory.createPropertyAccessExpression(
                                        ctx.factory.createPropertyAccessExpression(ctx.factory.createThis(), `_${identifier.getText()}`),
                                        ctx.factory.createIdentifier(method.name.getText())
                                    ),
                                    undefined,
                                    method.parameters.map((x) => ctx.factory.createIdentifier(x.name.getText()))
                                )
                            ),
                        ])
                    )
                );
            }

            const implementationClassDeclaration = ctx.factory.createClassExpression(
                undefined,
                undefined,
                undefined,
                undefined,
                [
                    ctx.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [
                        ctx.factory.createExpressionWithTypeArguments(ctx.factory.createIdentifier(identifier.getText()), undefined),
                    ]),
                ],
                implementationMethods
            );

            const implementationPropertyDeclaration = ctx.factory.createPropertyDeclaration(
                undefined,
                [ctx.factory.createModifier(ts.SyntaxKind.ProtectedKeyword)],
                `_${identifier.getText()}`,
                undefined,
                undefined,
                ctx.factory.createNewExpression(ctx.factory.createParenthesizedExpression(implementationClassDeclaration), undefined, [
                    ctx.factory.createThis(),
                    ctx.factory.createIdentifier(node.name!.text),
                ])
            );

            implementationPropertyDeclarations.push(implementationPropertyDeclaration);
        }

        const finalClassDeclaration = ctx.factory.createClassDeclaration(
            node.decorators,
            node.modifiers,
            node.name,
            node.typeParameters,
            [
                ...(node.heritageClauses ?? []).filter((x) => x !== deriveClause),
                ctx.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [
                    ctx.factory.createExpressionWithTypeArguments(
                        ts.factory.createClassExpression(
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            implementationPropertyDeclarations
                        ),
                        undefined
                    ),
                ]),
            ],
            [...node.members, ...publicMethodDeclarations]
        );

        return replace(finalClassDeclaration);
    });
});
