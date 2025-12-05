import { TextEditor, window } from "vscode";
import { Highlights } from "../state/highlightsSingleton";
import { analyseAndDecorate } from "../operations/analyseAndDecorate";
import { Logger } from "../logger";
import { Editor } from "../state/editor";

export class TextEditorEvents {
    static registerOnDidChange(logger: Logger) {
        // Handle when the active text editor changes
        window.onDidChangeActiveTextEditor((editor: TextEditor | undefined) => {
            if (Highlights.Disabled() || !editor) { return; }
            
            logger.debug("Active text editor changed, applying highlights");
            Editor.SetCurrentWindow(editor);
            
            Highlights.Singleton().deregisterAll(logger);
            const highlights = analyseAndDecorate(logger);
            highlights.then(
                (inner) => Highlights.Singleton().register(inner, Editor.CurrentWindow())
            );
        });
        
        // Also handle when visible editors change (for splits, etc.)
        window.onDidChangeVisibleTextEditors((editors: readonly TextEditor[]) => {
            if (Highlights.Disabled() || editors.length === 0) { return; }
            
            // Apply to the active editor if it's in the visible editors
            const activeEditor = window.activeTextEditor;
            if (activeEditor && editors.includes(activeEditor)) {
                logger.debug("Visible text editors changed, applying highlights to active editor");
                Editor.SetCurrentWindow(activeEditor);
                
                Highlights.Singleton().deregisterAll(logger);
                const highlights = analyseAndDecorate(logger);
                highlights.then(
                    (inner) => Highlights.Singleton().register(inner, Editor.CurrentWindow())
                );
            }
        });
    }
}