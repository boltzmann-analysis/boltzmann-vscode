import { window, workspace } from "vscode";
import { Analysis } from "../analysis/analysisParser";
import { Logger } from "../logger";
import { Highlight } from "../state/highlightsSingleton";
import { AttenuationCache } from "../attenuation/attenuation";

export function generateHighlights(analysis: Analysis, logger: Logger, folder: string) {
	let decorations: Highlight[] = [];

	if (analysis === undefined || analysis.nodes === undefined) {
		return [];
	}

	// Load attenuation weights if enabled
	const attenuationCache = new AttenuationCache(folder, logger);
	attenuationCache.load();

	// Apply attenuation to complexity values
	const attenuatedNodes = analysis.nodes.map(node => {
		const weight = attenuationCache.getWeight(node.parentNodeName, node.nodeName);
		return {
			...node,
			complexity: node.complexity * weight
		};
	});
	logger.info(JSON.stringify(attenuatedNodes));

	// Recalculate min/max after attenuation
	let maxComplexity = 0;
	let minComplexity = Number.MAX_SAFE_INTEGER;
	for (const node of attenuatedNodes) {
		if (node.complexity === 0) {
			continue;
		}
		if (node.complexity > maxComplexity) {
			maxComplexity = node.complexity;
		}
		if (node.complexity < minComplexity) {
			minComplexity = node.complexity;
		}
	}

	for (const node of attenuatedNodes) {
		let normalised_complexity = (node.complexity - minComplexity) / (maxComplexity - minComplexity);
		if (normalised_complexity === 0 || isNaN(normalised_complexity)) { continue; }

		let red = toColorDecimal(normalised_complexity);
		let green = toColorDecimal(1 - normalised_complexity);
		let alpha = toColorDecimal(normalised_complexity / 10);
		const backgroundColor = `#${toHex(red)}${toHex(green)}00${toHex(alpha)}`;
		const decoration = window.createTextEditorDecorationType({
			backgroundColor
		});
		decorations.push({ decoration, range: node.range });
	}

	return decorations;
}

function toColorDecimal(normalisedValue: number){
	return Math.round(255*normalisedValue);
}

function toHex(decimal: number): string {
	const hex = decimal.toString(16);
	if(hex.length === 1){
		return `0${hex}`;
	}

	return hex;
}