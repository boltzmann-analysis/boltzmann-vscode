import {
    CodeLensProvider,
    TextDocument,
    CodeLens,
    Range,
    Position,
    workspace,
    EventEmitter,
    Event
} from "vscode";
import { AnalysisNode } from "../analysis/analysisParser";

export class ComplexityCodeLensProvider implements CodeLensProvider {
    private _onDidChangeCodeLenses = new EventEmitter<void>();
    public readonly onDidChangeCodeLenses: Event<void> = this._onDidChangeCodeLenses.event;

    private static currentComplexity: number = 0;
    private static currentDocument: TextDocument | undefined;
    private static analysisNodes: AnalysisNode[] = [];

    static updateComplexity(totalComplexity: number, document: TextDocument, nodes?: AnalysisNode[]) {
        this.currentComplexity = totalComplexity;
        this.currentDocument = document;
        this.analysisNodes = nodes || [];
    }

    static getCurrentComplexity(): number {
        return this.currentComplexity;
    }

    static getCurrentDocument(): TextDocument | undefined {
        return this.currentDocument;
    }

    static getAnalysisNodes(): AnalysisNode[] {
        return this.analysisNodes;
    }

    refresh() {
        this._onDidChangeCodeLenses.fire();
    }

    provideCodeLenses(document: TextDocument): CodeLens[] {
        const config = workspace.getConfiguration('boltzmann-analyser');
        const showInset = config.get<boolean>('showComplexityInset', true);

        if (!showInset) {
            return [];
        }

        const currentDoc = ComplexityCodeLensProvider.getCurrentDocument();
        if (!currentDoc || currentDoc.uri.toString() !== document.uri.toString()) {
            return [];
        }

        const complexity = ComplexityCodeLensProvider.getCurrentComplexity();
        const nodes = ComplexityCodeLensProvider.getAnalysisNodes();
        const codeLenses: CodeLens[] = [];

        // Add file-level complexity at the top
        if (complexity > 0) {
            const topOfDocument = new Range(new Position(0, 0), new Position(0, 0));
            codeLenses.push(new CodeLens(topOfDocument, {
                title: `File Complexity: ${complexity.toFixed(2)}Ω`,
                command: '',
                tooltip: `Total file complexity: ${complexity.toFixed(2)}Ω`
            }));
        }

        // Add function-level complexity for each significant node
        // Only for Rust files
        let significantNodes: AnalysisNode[] = [];

        if (document.languageId === 'rust' || document.fileName.endsWith('.rs')) {
            // Filter for Rust-specific nodes (functions, methods, impl blocks, etc.)
            significantNodes = nodes.filter(node => {
                const name = node.nodeName.toLowerCase();
                return name.includes('function') ||
                       name.includes('method') ||
                       name.includes('impl') ||
                       name.includes('struct') ||
                       name.includes('enum') ||
                       name.includes('trait');
            });
        }

        // Group nodes by line and keep only the highest complexity per line
        const nodesByLine = new Map<number, { node: AnalysisNode, complexity: number }>();

        for (const node of significantNodes) {
            // Calculate total complexity for this node (not just density)
            const lineCount = node.range.end.line - node.range.start.line || 1;
            const totalNodeComplexity = node.complexity * lineCount;

            // Only consider if complexity is significant
            if (totalNodeComplexity >= 1) {
                const line = node.range.start.line;
                const existing = nodesByLine.get(line);

                // Keep the node with higher complexity for this line
                if (!existing || totalNodeComplexity > existing.complexity) {
                    nodesByLine.set(line, { node, complexity: totalNodeComplexity });
                }
            }
        }

        // Create CodeLens for the selected nodes
        for (const [line, { node, complexity }] of nodesByLine) {
            const position = new Position(line, 0);
            const range = new Range(position, position);

            codeLenses.push(new CodeLens(range, {
                title: `Complexity: ${complexity.toFixed(2)}Ω`,
                command: '',
                tooltip: `${node.nodeName} complexity: ${complexity.toFixed(2)}Ω (density: ${node.complexity.toFixed(2)}Ω/LOC)`
            }));
        }

        return codeLenses;
    }
}
