import React from 'react';
import { ThemeTokens } from './themes';
/**
 * Thumbnails for `styleSelect` params — tiny visual previews of each variant,
 * drawn with the CURRENT theme tokens so the picker re-skins live. Keyed
 * `<thumbs>.<optionValue>` (see ParamSpec.thumbs).
 */
export type ThumbFC = React.FC<{
    T: ThemeTokens;
}>;
export declare const PHONE_PLATFORMS: Record<string, {
    name: string;
    glyph: string;
    color: string;
    acts: string[];
}>;
/**
 * Template families register their variant thumbnails from their own files
 * (side-effect import next to the template definition) — adding a new family
 * never touches this core file.
 */
export declare function registerStyleThumbs(prefix: string, map: Record<string, ThumbFC>): void;
export declare const styleThumbs: Record<string, ThumbFC>;
