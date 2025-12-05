import { parseAnalysis, Analysis } from "../analysis/analysisParser";
import { generateHighlights } from "../highlights/highlights";
import { analyseFile } from "../analysis/file";
import { Logger } from "../logger";
import { Highlight, Highlights } from "../state/highlightsSingleton";
import { Option} from "../option";
import { window } from "vscode";

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
				const filePath = activeEditor.document.fileName;
				
				Highlights.updateComplexity(analysisResult.totalComplexity, filename);
				logger.info(`File complexity: ${analysisResult.totalComplexity} (${filename})`);
				
				// Update file decoration
				const { getFileDecorationProvider } = require('../extension');
				const decorationProvider = getFileDecorationProvider();
				if (decorationProvider) {
					logger.debug('Updating file decoration for:', filePath);
					decorationProvider.updateFileComplexity(filePath, analysisResult.totalComplexity);
				} else {
					logger.debug('No decoration provider found');
				}
			}
			
			return generateHighlights(analysisResult, logger);
		}
	);
};
