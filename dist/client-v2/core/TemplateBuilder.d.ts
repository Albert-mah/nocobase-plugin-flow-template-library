import React from 'react';
import { JsTemplateRow } from './templateLibrary';
export type BuilderResult = JsTemplateRow;
export declare const TemplateBuilder: React.FC<{
    open: boolean;
    initial?: JsTemplateRow | null;
    existingKeys: string[];
    onSave: (row: JsTemplateRow) => Promise<void>;
    onClose: () => void;
}>;
export default TemplateBuilder;
