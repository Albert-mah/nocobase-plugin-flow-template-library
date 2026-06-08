import { Template } from './types';
/**
 * Turn (template + chosen params) into the final JS string that gets written
 * into the native JS code slot (`stepParams.jsSettings.runJs.code`).
 *
 * We inject the params as a single `const $p = {...}` prefix rather than doing
 * `{{mustache}}` substitution inside the body — string interpolation breaks on
 * quotes/newlines, while a JSON-serialized object is always valid and the body
 * just reads `$p.fieldName`.
 */
export declare function generateCode(template: Template, params: Record<string, any>): string;
