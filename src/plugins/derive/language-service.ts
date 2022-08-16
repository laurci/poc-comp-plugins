import {createLanguageServicePlugin, findNodeAtLocation, findUpperNode, ts} from "../../lib";

export default createLanguageServicePlugin((plugin, {languageService, project}) => {
    plugin.getSemanticDiagnostics((filename) => {
        const diagnostics = languageService.getSemanticDiagnostics(filename);
        return diagnostics
            .filter((diagnostic) => {
                if (diagnostic.category != ts.DiagnosticCategory.Error || diagnostic.code != 2515) return true;
                if (typeof diagnostic.start == "undefined") return true;

                const file = languageService.getProgram()?.getSourceFile(filename);
                if (!file) return true;

                const identifier = findNodeAtLocation(file, diagnostic.start);
                if (!identifier || !ts.isIdentifier(identifier)) return true;

                const classDeclaration = findUpperNode(identifier, ts.isClassDeclaration);
                if (!classDeclaration) return true;

                const hasDerive = !!classDeclaration.heritageClauses?.find((clause) => {
                    return clause.getText().startsWith("extends derive");
                });

                return !hasDerive;
            })
            .filter((diagnostic) => {
                if (diagnostic.category != ts.DiagnosticCategory.Error || diagnostic.code != 2345) return true;
                if (typeof diagnostic.start == "undefined") return true;

                const file = languageService.getProgram()?.getSourceFile(filename);
                if (!file) return true;

                const identifier = findNodeAtLocation(file, diagnostic.start);
                if (!identifier) return true;

                const callExpression = findUpperNode(identifier, ts.isCallExpression);
                if (!callExpression) return true;

                const callIdentifier = callExpression.expression;
                if (!callIdentifier || !ts.isIdentifier(callIdentifier)) return true;

                const isDerive = callIdentifier.text == "derive";

                return !isDerive;
            });
    });
});
