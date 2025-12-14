import { parseAnalysis, Analysis } from "../analysis/analysisParser";
import { generateHighlights } from "../highlights/highlights";
import { analyseFile } from "../analysis/file";
import { Logger } from "../logger";
import { Highlight, Highlights } from "../state/highlightsSingleton";
import { window, workspace } from "vscode";

export const analyseAndDecorate = async (logger: Logger): Promise<Highlight[] | null> => {
	const analysisPath = await analyseFile(logger);
	logger.info("Analysing", analysisPath);

	if (!analysisPath) {
		logger.info("Analysis path is null, returning null");
		return null;
	}

	logger.info("Parsing analysis from path:", analysisPath);
	const analysis = parseAnalysis(analysisPath);
	logger.info(`Analysis parsed: totalComplexity=${analysis.totalComplexity}, nodeCount=${analysis.nodes.length}`);
	logger.debug("Generating Highlights", analysis);

	// Update complexity status bar and CodeLens with current file info
	const activeEditor = window.activeTextEditor;
	if (activeEditor) {
		const filename = activeEditor.document.fileName.split('/').pop() || 'Unknown';

		Highlights.updateComplexity(analysis.totalComplexity, filename, activeEditor, analysis.nodes);
		logger.info(`File complexity: ${analysis.totalComplexity} (${filename})`);
	}

	const folder = workspace.workspaceFolders![0].uri.path;
	const highlights = generateHighlights(analysis, logger, folder);
	logger.info(`Generated ${highlights.length} highlights`);
	return highlights;
};
