import { window, workspace } from "vscode";
import { Analysis } from "../analysis/analysisParser";
import { Logger } from "../logger";
import { Highlight } from "../state/highlightsSingleton";
import { AttenuationCache } from "../attenuation/attenuation";

type HighlightWithComplexity = Highlight & { complexity: number, hoverMessage: string };

export function generateHighlights(analysis: Analysis, logger: Logger, folder: string) {
	let decorations: HighlightWithComplexity[] = [];

	if (analysis === undefined || analysis.nodes === undefined) {
		return [];
	}

	const config = workspace.getConfiguration('boltzmann-analyser');
	const complexityThreshold = config.get<number>('complexityThreshold', 0.5);
	const highlightAlpha = config.get<number>('highlightAlpha', 0.3);
	const minComplexityPerLoc = config.get<number>('minComplexityPerLoc', 0);
	logger.info(`Using complexity threshold: ${complexityThreshold}, highlight alpha: ${highlightAlpha}, min complexity per LOC: ${minComplexityPerLoc}`);

	// Load attenuation weights if enabled
	const attenuationCache = new AttenuationCache(folder, logger);
	attenuationCache.load();

	// Apply attenuation to complexity values and filter by minimum absolute complexity
	const attenuatedNodes = analysis.nodes
		.map(node => {
			const weight = attenuationCache.getWeight(node.parentNodeName, node.nodeName);
			return {
				...node,
				complexity: node.complexity * weight
			};
		})
		.filter(node => node.complexity >= minComplexityPerLoc);
	logger.info(`Nodes after absolute complexity filter: ${attenuatedNodes.length}/${analysis.nodes.length}`);

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

		if (normalised_complexity < complexityThreshold) { continue; }

		let red = toColorDecimal(normalised_complexity);
		let green = toColorDecimal(1 - normalised_complexity);
		let alpha = toColorDecimal(highlightAlpha);
		const backgroundColor = `#${toHex(red)}${toHex(green)}00${toHex(alpha)}`;

		const hoverMessage = `Complexity: ${node.complexity.toFixed(2)}`;

		const decoration = window.createTextEditorDecorationType({
			backgroundColor
		});
		decorations.push({ decoration, range: node.range, complexity: normalised_complexity, hoverMessage });
	}

	// Remove overlapping highlights, keeping higher complexity ones
	const nonOverlappingDecorations = removeOverlaps(decorations, logger);
	logger.info(`Highlights after overlap removal: ${nonOverlappingDecorations.length}/${decorations.length}`);

	return nonOverlappingDecorations;
}

function removeOverlaps(highlights: HighlightWithComplexity[], logger: Logger): Highlight[] {
	if (highlights.length === 0) {
		return [];
	}

	const sorted = [...highlights].sort((a, b) => b.complexity - a.complexity);
	const kept: HighlightWithComplexity[] = [];

	for (const current of sorted) {
		let hasOverlap = false;

		for (const keptHighlight of kept) {
			if (rangesOverlap(current.range, keptHighlight.range)) {
				hasOverlap = true;
				break;
			}
		}

		if (!hasOverlap) {
			kept.push(current);
		}
	}

	logger.debug(`Removed ${sorted.length - kept.length} overlapping highlights`);

	return kept.map(({ decoration, range, hoverMessage }) => ({ decoration, range, hoverMessage }));
}

function rangesOverlap(a: import("vscode").Range, b: import("vscode").Range): boolean {
	return !a.end.isBefore(b.start) && !b.end.isBefore(a.start);
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