import { commands, ExtensionContext, window, workspace } from "vscode";
import { Logger } from "../logger";
import { Highlights } from "../state/highlightsSingleton";
import { analyseAndDecorate } from "../operations/analyseAndDecorate";
import { Editor } from "../state/editor";

export class AttenuationToggleCommand {
	static register(context: ExtensionContext, logger: Logger) {
		logger.debug("Registering Toggle Attenuation Command");
		try {
			const toggleCommand = commands.registerCommand('boltzmann-analyser.ToggleAttenuation', async () => {
				const config = workspace.getConfiguration('boltzmann-analyser');
				const currentValue = config.get<boolean>('attenuation', false);
				const newValue = !currentValue;

				await config.update('attenuation', newValue, true);

				if (newValue) {
					logger.info("Attenuation enabled");
					window.showInformationMessage("Boltzmann Analyser: Attenuation enabled");
				} else {
					logger.info("Attenuation disabled");
					window.showInformationMessage("Boltzmann Analyser: Attenuation disabled");
				}

				// Re-analyze and update highlights for the current file
				if (Highlights.Enabled() && window.activeTextEditor) {
					logger.info("Refreshing highlights after attenuation toggle");
					Editor.SetCurrentWindow(window.activeTextEditor);
					Highlights.Singleton().deregisterAll(logger);
					const highlights = analyseAndDecorate(logger);
					highlights.then((inner) => {
						Highlights.Singleton().register(inner, Editor.CurrentWindow());
					});
				}
			});

			context.subscriptions.push(toggleCommand);
		} catch (error) {
			logger.error(`Failed to register attenuation toggle command: ${error}`);
		}
	}
}
