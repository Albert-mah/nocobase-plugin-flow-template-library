import React from 'react';
/**
 * Preview thumbnails for the gallery. Each is a React.FC<{params?, ctx?}>:
 * without props it renders MOCK sample data; when the user configures the
 * selected template, `params` (and `ctx` for real data fetches) are passed in
 * so the preview reflects the actual choices live.
 */
type PreviewProps = {
    params?: any;
    ctx?: any;
};
export declare const previews: Record<string, React.FC>;
/**
 * Template families can register / override their gallery previews from their
 * own files (side-effect import next to the template definition) — adding a
 * new family never touches this core file. Lookup is `previews[template.key]`
 * at render time, so late registration is fine.
 */
export declare function registerPreview(key: string, fc: React.FC<PreviewProps>): void;
export declare const FallbackPreview: React.FC<{
    icon?: string;
}>;
export {};
