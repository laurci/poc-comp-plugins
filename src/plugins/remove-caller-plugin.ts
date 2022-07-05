import {createLanguageServicePlugin} from "../lib";

export default createLanguageServicePlugin((plugin, {languageService, project}) => {
    plugin.getCompletionsAtPosition((filename, position, options) => {
        const completions = languageService.getCompletionsAtPosition(filename, position, options);
        if (!completions) return;

        const oldLength = completions.entries.length;

        completions.entries = completions.entries.filter((entry) => {
            return entry.name != "caller";
        });

        if (oldLength != completions.entries.length) {
            project.projectService.logger.info(`[HELLO]: ${oldLength - completions.entries.length} completions removed`);
        }

        return completions;
    });
});
