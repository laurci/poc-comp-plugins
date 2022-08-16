import {createLanguageServicePlugin, findNodeAtLocation, ts} from "../../lib";

export default createLanguageServicePlugin((plugin, {languageService, project}) => {
    plugin.getSemanticDiagnostics((filename) => {
        const diagnostics = languageService.getSemanticDiagnostics(filename);
        return diagnostics.filter((diagnostic) => {
            if (diagnostic.category != ts.DiagnosticCategory.Error || diagnostic.code != 1206) return true;
            if (typeof diagnostic.start == "undefined") return true;

            const file = languageService.getProgram()?.getSourceFile(filename);
            if (!file) return true;

            const node = findNodeAtLocation(file, diagnostic.start);
            if (!node) return true;

            if (ts.isFunctionDeclaration(node)) {
                // we should also check if the decorator is a function decorator.
                return false;
            }

            return true;
        });
    });
});
