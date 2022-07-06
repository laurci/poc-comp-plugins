import {LanguageServicePluginFn, PluginFn} from "../lib";

import callsitePlugin from "./callsite-plugin";
import macroPlugin from "./macro-plugin";
import linePlugin from "./line-plugin";

import removeApplyPlugin from "./remove-apply-plugin";
import removeCallerPlugin from "./remove-caller-plugin";
import autoRegisterPlugin from "./auto-register-plugin";

const plugins = {
    compiler: [macroPlugin, callsitePlugin, linePlugin, autoRegisterPlugin] as PluginFn[],
    languageService: [removeCallerPlugin, removeApplyPlugin] as LanguageServicePluginFn[],
};

export default plugins;
