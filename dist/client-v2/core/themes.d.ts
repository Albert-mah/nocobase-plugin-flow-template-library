import { ParamSpec } from './types';
/**
 * Unified visual themes for display templates. Picking a theme injects its
 * design tokens into the generated code as `$p.__theme` (see
 * defineGalleryModel), so template bodies style themselves with `T.*` tokens
 * instead of hard-coded colors. The picker renders these as a visual swatch
 * wall (not a text dropdown).
 */
export interface ThemeTokens {
    /** accent / primary color */
    primary: string;
    /** container background */
    bg: string;
    /** inner card / muted background */
    card: string;
    /** main text */
    text: string;
    /** secondary text */
    sub: string;
    /** hairline borders */
    border: string;
    /** accent gradient (banners / emphasis) */
    gradient: string;
    /** true → light text on dark surfaces */
    dark?: boolean;
}
export declare const UI_THEMES: Record<string, {
    label: string;
    tokens: ThemeTokens;
}>;
export declare const DEFAULT_TOKENS: ThemeTokens;
export declare function resolveThemeTokens(theme?: string): ThemeTokens;
/** drop-in ParamSpec for display templates — rendered as a visual swatch wall */
export declare const themeParam: ParamSpec;
