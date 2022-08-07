import {createPlugin, ts} from "../lib";

function getFunctionDeclaration(checker: ts.TypeChecker, symbol: ts.Symbol, node: ts.Identifier): ts.SignatureDeclaration | undefined {
    const declarations = symbol.getDeclarations() ?? [];

    let declaration = declarations.find((x) => ts.isFunctionLike(x)) as ts.SignatureDeclaration | undefined;

    if (!declaration) {
        const type = checker.getTypeOfSymbolAtLocation(symbol, node);

        if (type.symbol) {
            declaration = type.symbol.declarations?.find((x) => ts.isFunctionLike(x)) as ts.SignatureDeclaration | undefined;
        }
    }

    return declaration;
}

type ParameterReference = {op: "argument.text" | "position"; referenceIndex: number};

type ParameterReferenceLink = ParameterReference | undefined;

const referenceMap = new Map<string, ParameterReferenceLink[]>();

function getParameterReferences(checker: ts.TypeChecker, ident: ts.Identifier): ParameterReferenceLink[] {
    if (referenceMap.has(ident.text)) return referenceMap.get(ident.text)!;

    const links: ParameterReferenceLink[] = [];

    function updateAndReturn() {
        referenceMap.set(ident.text, links);
        return links;
    }

    const symbol = checker.getSymbolAtLocation(ident);
    if (!symbol) return updateAndReturn();

    const declaration = getFunctionDeclaration(checker, symbol, ident);
    if (!declaration) return updateAndReturn();

    for (let idx = 0; idx < declaration.parameters.length; idx++) {
        let param = declaration.parameters[idx];

        const type = param.type;

        if (!type || !ts.isTypeReferenceNode(type)) {
            links[idx] = undefined;
            continue;
        }

        if (type.typeName.getText() == "CallArgumentText") {
            const typeArg = type.typeArguments?.[0];
            if (!typeArg || !ts.isTypeQueryNode(typeArg)) {
                links[idx] = undefined;
                continue;
            }

            const referenceParameterName = typeArg.exprName.getText();

            const referenceParameterIndex = declaration.parameters.findIndex((x) => x.name.getText() == referenceParameterName);
            if (referenceParameterIndex < 0) {
                links[idx] = undefined;
                continue;
            }

            links[idx] = {
                op: "argument.text",
                referenceIndex: referenceParameterIndex,
            };
        } else if (type.typeName.getText() == "CallPosition") {
            links[idx] = {
                op: "position",
                referenceIndex: -1,
            };
        }
    }

    return updateAndReturn();
}

function createFunctionCall(factory: ts.NodeFactory, node: ts.CallExpression, links: ParameterReferenceLink[]) {
    const args = links.map((link, idx) => {
        if (typeof link == "undefined") {
            if (node.arguments[idx]) {
                return node.arguments[idx];
            } else {
                return factory.createVoidZero();
            }
        } else {
            switch (link.op) {
                case "argument.text": {
                    if (node.arguments[link.referenceIndex]) {
                        return factory.createStringLiteral(node.arguments[link.referenceIndex].getText(), false);
                    } else {
                        return factory.createVoidZero();
                    }
                }
                case "position": {
                    const {line, character} = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());

                    return factory.createObjectLiteralExpression(
                        [
                            factory.createPropertyAssignment("line", factory.createNumericLiteral(line)),
                            factory.createPropertyAssignment("col", factory.createNumericLiteral(character)),
                            factory.createPropertyAssignment("file", factory.createStringLiteral(node.getSourceFile().fileName)),
                        ],
                        true
                    );
                }
            }
        }
    });

    return factory.createCallExpression(node.expression, node.typeArguments, args);
}

export default createPlugin((plugin) => {
    plugin.match(ts.isCallExpression, (it) => {
        const identifierNode = it.node.expression;

        if (!ts.isIdentifier(identifierNode)) return;
        if (identifierNode.text !== "assert" && identifierNode.text !== "debug") return; // TODO: support other functions

        const parameterReferences = getParameterReferences(it.checker, identifierNode);

        if (getParameterReferences.length == 0) return;

        return it.replace(createFunctionCall(it.ctx.factory, it.node, parameterReferences));
    });
});
