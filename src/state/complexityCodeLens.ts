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

export class ComplexityCodeLensProvider implements CodeLensProvider {
    private _onDidChangeCodeLenses = new EventEmitter<void>();
    public readonly onDidChangeCodeLenses: Event<void> = this._onDidChangeCodeLenses.event;

    private static currentComplexity: number = 0;
    private static currentDocument: TextDocument | undefined;

    static updateComplexity(totalComplexity: number, document: TextDocument) {
        this.currentComplexity = totalComplexity;
        this.currentDocument = document;
    }

    static getCurrentComplexity(): number {
        return this.currentComplexity;
    }

    static getCurrentDocument(): TextDocument | undefined {
        return this.currentDocument;
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
        if (complexity === 0) {
            return [];
        }

        // Create a CodeLens at the very first line
        const topOfDocument = new Range(new Position(0, 0), new Position(0, 0));
        const codeLens = new CodeLens(topOfDocument, {
            title: `File Complexity: ${complexity.toFixed(2)}Ω`,
            command: '',
            tooltip: `Total file complexity: ${complexity.toFixed(2)}Ω`
        });

        return [codeLens];
    }
}
