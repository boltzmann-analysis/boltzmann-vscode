import { workspace } from "vscode";
import { readJsonFromFile } from "../adapters/io";
import { BOLTZMANN_STORAGE_PATH } from "../adapters/boltzmann";
import { Logger } from "../logger";

type WeightedGraphEdge = {
	name: string;
	count: number;
	self_information: number;
}

type WeightedGraphNode = {
	edges: { [key: string]: WeightedGraphEdge };
}

type WeightedGraph = {
	nodes: { [key: string]: WeightedGraphNode };
}

export class AttenuationCache {
	private weightedGraph: WeightedGraph | null = null;
	private enabled: boolean = false;

	constructor(private folder: string, private logger: Logger) {}

	load(): void {
		const config = workspace.getConfiguration('boltzmann-analyser');
		this.enabled = config.get<boolean>('attenuation', false);

		if (!this.enabled) {
			this.logger.debug("Attenuation disabled");
			return;
		}

		try {
			const projectBltaPath = `${this.folder}/${BOLTZMANN_STORAGE_PATH}/project.blta`;
			const projectData = readJsonFromFile(projectBltaPath);

			if (!projectData || !projectData.weighted_graph) {
				this.logger.info("Project analysis not found. Run 'Analyse Project' to enable attenuation.");
				this.enabled = false;
				return;
			}

			this.weightedGraph = projectData.weighted_graph;
			this.logger.info("Attenuation enabled");
		} catch (error) {
			this.logger.error(`Error loading project analysis for attenuation: ${error}`);
			this.enabled = false;
		}
	}

	getWeight(parentNodeName: string | null, nodeName: string): number {
		if (!this.enabled || !this.weightedGraph) {
			return 1.0;
		}

		try {
			// If there's a parent, look for the edge in the parent's edges
			if (parentNodeName && this.weightedGraph.nodes[parentNodeName]) {
				const parentNode = this.weightedGraph.nodes[parentNodeName];
				const edge = parentNode.edges[nodeName];
				if (edge && edge.self_information !== undefined) {
					return edge.self_information;
				}
			}

			// Otherwise, return 1.0 (no attenuation)
			return 1.0;
		} catch (error) {
			this.logger.debug(`Error attenuating ${nodeName}: ${error}`);
			return 1.0;
		}
	}

	isEnabled(): boolean {
		return this.enabled;
	}
}
