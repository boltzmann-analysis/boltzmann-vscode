import { window, workspace } from "vscode";
import { BOLTZMANN_STORAGE_PATH, executeAnalyser } from "../adapters/boltzmann";
import { Logger } from "../logger";

export async function analyseFile(logger: Logger): Promise<string | null> {
	const currentlyOpenTabFilePath = window.activeTextEditor!.document.fileName;
	const folder = workspace.workspaceFolders![0].uri.path;

	if(currentlyOpenTabFilePath.indexOf(BOLTZMANN_STORAGE_PATH) > 0) {
		logger.info("Open file is within the boltzmann storage directory. Skipping Analysis", currentlyOpenTabFilePath);
		return null;
	}

	const filePath = currentlyOpenTabFilePath.substring(folder.length + 1);

	logger.info("Analysing file in folder", filePath, folder);
	try {
		const result = await executeAnalyser({ folder, filePath }, logger);
		return result;
	} catch (error) {
		logger.error(error);
		return null;
	}
}
