import { Template } from '../core/types';
/**
 * 行级打印 — a row-action button that prints the current record as a simple
 * sheet, using the ctx.element.ownerDocument backdoor (the sandbox blocks
 * window.print / document.body directly).
 */
export declare const rowPrint: Template;
