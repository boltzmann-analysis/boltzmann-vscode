import { parseAnalysis, Analysis } from "../analysis/analysisParser";
import { generateHighlights } from "../highlights/highlights";
import { analyseFile } from "../analysis/file";
import { Logger } from "../logger";
import { Highlight, Highlights } from "../state/highlightsSingleton";
import { Option} from "../option";
import { window, workspace } from "vscode";

export const analyseAndDecorate: (logger: Logger) => Option<Highlight[]> = (logger: Logger) => {
	const analysisPath = analyseFile(logger);
	logger.info("Analysing", analysisPath);
	let analysis = analysisPath.then(
		(inner) => {
			logger.debug("Parsing analysis", analysisPath);
			return parseAnalysis(inner);
		}
	);
	return analysis.then(
		(analysisResult) => {
			logger.debug("Generating Highlights", analysisResult);

			// Update complexity status bar with current file info
			const activeEditor = window.activeTextEditor;
			if (activeEditor) {
				const filename = activeEditor.document.fileName.split('/').pop() || 'Unknown';

				Highlights.updateComplexity(analysisResult.totalComplexity, filename);
				logger.info(`File complexity: ${analysisResult.totalComplexity} (${filename})`);
			}

			const folder = workspace.workspaceFolders![0].uri.path;
			return generateHighlights(analysisResult, logger, folder);
		}
	);
};
