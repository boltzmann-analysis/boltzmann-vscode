import { commands, ExtensionContext, TextEditor, window } from "vscode";
import { Highlights  } from "../state/highlightsSingleton";
import { analyseAndDecorate as computeHighlights } from "../operations/analyseAndDecorate";
import { Logger } from "../logger";
import { Editor } from "../state/editor";

export class HighlightCommand {
		static registerToggle (context: ExtensionContext, logger: Logger) {
		logger.debug("Registering Toggle Highlighting Command");
		try {
			const highlightCommand = 
				commands.registerTextEditorCommand('boltzmann-analyser.HighlightToggle', (textEditor: TextEditor) => {
				const isEnabled = Highlights.Toggle();
				
				if (isEnabled) {
					logger.info("Highlighting enabled");
					window.showInformationMessage("Boltzmann Analyser: Highlighting enabled");
					
					Editor.SetCurrentWindow(textEditor);
					Highlights.Singleton().deregisterAll(logger);
					let highlights = computeHighlights(logger);
					highlights.then((inner) => {
						Highlights.Singleton().register(inner, Editor.CurrentWindow());
						
						// Refresh file decorations after analysis completes
						setTimeout(() => {
							const { getFileDecorationProvider } = require('../extension');
							const decorationProvider = getFileDecorationProvider();
							if (decorationProvider) {
								decorationProvider.refreshAllFiles();
							}
						}, 200);
					});
				} else {
					logger.info("Highlighting disabled");
					window.showInformationMessage("Boltzmann Analyser: Highlighting disabled");
					Highlights.Singleton().deregisterAll(logger);
					Highlights.updateComplexity(0, ''); // Hide status bar
				}
			});

			context.subscriptions.push(highlightCommand);
		} catch (error) {
			logger.error(`Failed to register toggle command: ${error}`);
		}
	}
}