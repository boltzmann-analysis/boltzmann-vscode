import { ExtensionContext } from 'vscode';
import { Logger } from './logger';
import { HighlightCommand } from './handlers/highlightCommand';
import { TextEditorEvents } from './handlers/textEditorEvents';
import { WorkspaceEvents } from './handlers/workspaceEvents';
import { Highlights } from './state/highlightsSingleton';

export function activate(context: ExtensionContext) {
	const logger = new Logger("Boltzmann Analyser");

	// Initialize highlighting state from workspace storage
	Highlights.Initialize(context);

	TextEditorEvents.registerOnDidChange(logger);
	WorkspaceEvents.registerOnDidSaveTextDocument(logger);
	HighlightCommand.registerToggle(context, logger);
}

export function deactivate() {
	Highlights.disposeStatusBar();
}
