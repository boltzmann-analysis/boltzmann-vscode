import { window } from "vscode";
import { Analysis } from "../analysis/analysisParser";
import { Logger } from "../logger";
import { Highlight } from "../state/highlightsSingleton";

export function generateHighlights(analysis: Analysis, logger: Logger) {
	let decorations: Highlight[] = [];

	if (analysis === undefined || analysis.nodes === undefined) {
		return [];
	}

	for (const token of analysis.nodes) {
		let normalised_complexity = (token.complexity - analysis.minimumComplexity) / (analysis.maximumComplexity - analysis.minimumComplexity);
		if (normalised_complexity === 0) { continue; }

		let red = toColorDecimal(normalised_complexity);
		let green = toColorDecimal(1 - normalised_complexity);
		let alpha = toColorDecimal(normalised_complexity / 10);
		const backgroundColor = `#${toHex(red)}${toHex(green)}00${toHex(alpha)}`;
		const decoration = window.createTextEditorDecorationType({
			backgroundColor
		});
		decorations.push({ decoration, range: token.range });
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