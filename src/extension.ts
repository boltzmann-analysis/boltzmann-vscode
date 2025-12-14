import { ExtensionContext, languages, window } from 'vscode';
import { Logger } from './logger';
import { HighlightCommand } from './handlers/highlightCommand';
import { ProjectAnalysisCommand } from './handlers/projectAnalysisCommand';
import { AttenuationToggleCommand } from './handlers/attenuationToggleCommand';
import { TextEditorEvents } from './handlers/textEditorEvents';
import { WorkspaceEvents } from './handlers/workspaceEvents';
import { Highlights } from './state/highlightsSingleton';
import { analyseAndDecorate } from './operations/analyseAndDecorate';
import { Editor } from './state/editor';

export function activate(context: ExtensionContext) {
	const logger = new Logger("Boltzmann Analyser");

	// Initialize highlighting state from workspace storage
	Highlights.Initialize(context);

	// Register CodeLens provider for all languages
	const codeLensProvider = languages.registerCodeLensProvider(
		{ scheme: 'file' },
		Highlights.getCodeLensProvider()
	);
	context.subscriptions.push(codeLensProvider);

	TextEditorEvents.registerOnDidChange(logger);
	WorkspaceEvents.registerOnDidSaveTextDocument(logger);
	HighlightCommand.registerToggle(context, logger);
	ProjectAnalysisCommand.register(context, logger);
	AttenuationToggleCommand.register(context, logger);

	// Analyze and highlight the currently open file on startup
	if (Highlights.Enabled() && window.activeTextEditor) {
		logger.info("Analyzing currently open file on startup");
		Editor.SetCurrentWindow(window.activeTextEditor);
		analyseAndDecorate(logger).then((highlights) => {
			if (highlights) {
				Highlights.Singleton().register(highlights, Editor.CurrentWindow());
			}
		});
	}
}

export function deactivate() {
	Highlights.disposeStatusBar();
}
