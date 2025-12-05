import { ExtensionContext, window, commands, workspace, WorkspaceFolder, RelativePattern } from 'vscode';
import { Logger } from './logger';
import { HighlightCommand } from './handlers/highlightCommand';
import { TextEditorEvents } from './handlers/textEditorEvents';
import { WorkspaceEvents } from './handlers/workspaceEvents';
import { Highlights } from './state/highlightsSingleton';
import { ComplexityDecorationProvider } from './decorations/fileDecorations';
import * as path from 'path';

let fileDecorationProvider: ComplexityDecorationProvider;

export function activate(context: ExtensionContext) {
	const logger = new Logger("Boltzmann Analyser");
	
	// Initialize highlighting state from workspace storage
	Highlights.Initialize(context);
	
	// Register file decoration provider
	fileDecorationProvider = new ComplexityDecorationProvider(logger);
	logger.info('Creating file decoration provider');
	const disposable = window.registerFileDecorationProvider(fileDecorationProvider);
	context.subscriptions.push(disposable);
	logger.info('File decoration provider registered');
	
	// Watch for changes to .boltzmann analysis files
	const workspaceFolders = workspace.workspaceFolders;
	if (workspaceFolders) {
		workspaceFolders.forEach(folder => {
			const pattern = new RelativePattern(folder, '**/.boltzmann/**');
			const watcher = workspace.createFileSystemWatcher(pattern);
			
			// When analysis files are created, changed, or deleted
			watcher.onDidCreate(uri => {
				logger.info('🆕 Analysis file created:', uri.fsPath);
				setTimeout(() => refreshDecorationForAnalysisFile(uri.fsPath, logger), 50);
			});
			
			watcher.onDidChange(uri => {
				logger.info('🔄 Analysis file changed:', uri.fsPath);
				setTimeout(() => refreshDecorationForAnalysisFile(uri.fsPath, logger), 50);
			});
			
			watcher.onDidDelete(uri => {
				logger.info('🗑️ Analysis file deleted:', uri.fsPath);
				setTimeout(() => refreshDecorationForAnalysisFile(uri.fsPath, logger), 50);
			});
			
			context.subscriptions.push(watcher);
		});
	}
	
	TextEditorEvents.registerOnDidChange(logger);
	WorkspaceEvents.registerOnDidSaveTextDocument(logger);
	HighlightCommand.registerToggle(context, logger);
	
	// Register refresh complexity command with error handling
	try {
		const refreshCommand = commands.registerCommand('boltzmann-analyser.RefreshComplexity', () => {
			fileDecorationProvider.clearCache();
			logger.info('File complexity decorations refreshed');
		});
		context.subscriptions.push(refreshCommand);
		
		// Add debug command to test decorations
		const debugCommand = commands.registerCommand('boltzmann-analyser.TestDecorations', () => {
			const activeEditor = window.activeTextEditor;
			if (activeEditor) {
				const uri = activeEditor.document.uri;
				const filePath = activeEditor.document.fileName;
				logger.info('🧪 Testing decoration for URI:', uri.toString());
				logger.info('🧪 Testing decoration for path:', filePath);
				logger.info('🧪 Workspace folders:', workspace.workspaceFolders?.map((f: WorkspaceFolder) => f.uri.fsPath));
				
				// Test with a simple complexity first
				fileDecorationProvider.updateFileComplexity(filePath, 42);
				logger.info('🧪 Set test complexity of 42 for current file');
				
				// Also try to trigger decoration directly
				const decoration = fileDecorationProvider.provideFileDecoration(uri);
				logger.info('🧪 Direct decoration result:', decoration);
				
				// Force refresh all decorations
				fileDecorationProvider.refreshAllFiles();
				logger.info('🧪 Forced refresh of all file decorations');
			}
		});
		context.subscriptions.push(debugCommand);
	} catch (error) {
		logger.error(`Failed to register refresh command: ${error}`);
	}
}

export function deactivate() {
	Highlights.disposeStatusBar();
}

export function getFileDecorationProvider(): ComplexityDecorationProvider | undefined {
	return fileDecorationProvider;
}

function refreshDecorationForAnalysisFile(analysisFilePath: string, logger: Logger) {
	if (!fileDecorationProvider) {
		return;
	}
	
	// Convert analysis file path back to source file path
	// e.g., /workspace/.boltzmann/src/file.rs -> /workspace/src/file.rs
	const workspaceFolder = workspace.workspaceFolders?.[0];
	if (!workspaceFolder) {
		return;
	}
	
	const workspacePath = workspaceFolder.uri.fsPath;
	const boltzmannDir = path.join(workspacePath, '.boltzmann');
	
	// Check if this is actually in a .boltzmann directory
	if (!analysisFilePath.includes('.boltzmann')) {
		return;
	}
	
	// Extract the relative path from the .boltzmann directory
	const relativePath = path.relative(boltzmannDir, analysisFilePath);
	const sourceFilePath = path.join(workspacePath, relativePath);
	
	logger.info(`Refreshing decoration for source file: ${sourceFilePath} (from analysis: ${analysisFilePath})`);
	
	// Clear cache and refresh the specific file
	fileDecorationProvider.refreshFile(sourceFilePath);
}
