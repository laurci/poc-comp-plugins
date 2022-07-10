import {LanguageServicePluginFn, PluginFn} from "../lib";

import callsitePlugin from "./callsite-plugin";
import macroPlugin from "./macro-plugin";
import linePlugin from "./line-plugin";

import removeCallerPlugin from "./remove-caller-plugin";
import autoRegisterPlugin from "./auto-register-plugin";

import deriveCompilerPlugin from "./derive/compiler";
import deriveLanguageServicePlugin from "./derive/language-service";

const plugins = {
    compiler: [macroPlugin, callsitePlugin, linePlugin, autoRegisterPlugin, deriveCompilerPlugin] as PluginFn[],
    languageService: [removeCallerPlugin, deriveLanguageServicePlugin] as LanguageServicePluginFn[],
};

export default plugins;
