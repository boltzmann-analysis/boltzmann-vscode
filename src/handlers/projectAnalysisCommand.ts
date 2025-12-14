import { commands, ExtensionContext, window, workspace } from "vscode";
import { executeProjectAnalyser } from "../adapters/boltzmann";
import { Logger } from "../logger";

export class ProjectAnalysisCommand {
	static register(context: ExtensionContext, logger: Logger) {
		logger.debug("Registering Project Analysis Command");
		try {
			const analyseProjectCommand =
				commands.registerCommand('boltzmann-analyser.AnalyseProject', async () => {
					const workspaceFolder = workspace.workspaceFolders?.[0];

					if (!workspaceFolder) {
						window.showErrorMessage("Boltzmann Analyser: No workspace folder open");
						logger.error("No workspace folder open");
						return;
					}

					const folder = workspaceFolder.uri.path;
					logger.info("Starting project analysis for folder:", folder);

					window.showInformationMessage("Boltzmann Analyser: Starting project analysis...");

					try {
						executeProjectAnalyser(folder, logger);
						window.showInformationMessage("Boltzmann Analyser: Project analysis completed successfully");
					} catch (error) {
						logger.error(error);
						window.showErrorMessage("Boltzmann Analyser: Project analysis failed. Check logs for details.");
					}
				});

			context.subscriptions.push(analyseProjectCommand);
		} catch (error) {
			logger.error(`Failed to register project analysis command: ${error}`);
		}
	}
}
