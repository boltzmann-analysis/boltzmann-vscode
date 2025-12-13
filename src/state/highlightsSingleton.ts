import { Range, TextEditor, TextEditorDecorationType, ExtensionContext, StatusBarItem, StatusBarAlignment, window } from "vscode";
import { Option } from "../option";
import { Logger } from "../logger";

export type Highlight = { decoration: TextEditorDecorationType, range: Range, hoverMessage?: string }

const HIGHLIGHTS_ENABLED_KEY = 'boltzmann.highlights.enabled';

export class ComplexityStatusBar {
    private static statusBarItem: StatusBarItem;
    
    static initialize() {
        this.statusBarItem = window.createStatusBarItem('boltzmann.complexity', StatusBarAlignment.Left, 100);
        this.statusBarItem.name = 'Boltzmann File Complexity';
        this.statusBarItem.command = 'boltzmann-analyser.HighlightToggle';
    }
    
    static updateComplexity(totalComplexity: number, filename: string) {
        if (this.statusBarItem) {
            this.statusBarItem.text = `$(graph) ${totalComplexity.toFixed(2)}Ω`;
            this.statusBarItem.tooltip = `Total file complexity: ${totalComplexity.toFixed(2)}Ω (${filename})`;
            this.statusBarItem.show();
        }
    }
    
    static hide() {
        if (this.statusBarItem) {
            this.statusBarItem.hide();
        }
    }
    
    static dispose() {
        if (this.statusBarItem) {
            this.statusBarItem.dispose();
        }
    }
}

export class Highlights {
    private inner: Highlight[] = [];
    private enabled: boolean = false;
    private static context: ExtensionContext;
    
    static Initialize(context: ExtensionContext) {
        this.context = context;
        // Load persisted state
        const savedState = context.workspaceState.get<boolean>(HIGHLIGHTS_ENABLED_KEY, false);
        this.Singleton().enabled = savedState;
        
        // Initialize status bar
        ComplexityStatusBar.initialize();
    }
    
    static Singleton(){
        if(highlights === undefined) {
            highlights = new Highlights();
        }
        
        return highlights;
    }

    static Disabled(): boolean {
        return !this.Singleton().enabled;
    }

    static Enabled(): boolean {
        return this.Singleton().enabled;
    }

	static Enable() {
        this.Singleton().enabled = true;
        this.saveState();
	}

	static Disable() {
        this.Singleton().enabled = false;
        this.saveState();
	}
	
	static Toggle(): boolean {
	    const newState = !this.Singleton().enabled;
	    this.Singleton().enabled = newState;
	    this.saveState();
	    return newState;
	}
	
	private static saveState() {
	    if (this.context) {
	        this.context.workspaceState.update(HIGHLIGHTS_ENABLED_KEY, this.Singleton().enabled);
	    }
	}

    
    public deregisterAll(logger: Logger) {
        logger.info("disposing all decorations");
        this.inner.forEach(x => x.decoration.dispose());
    }
    
    public register(highlights: Highlight[], textEditor: Option<TextEditor>) {
        if(!this.enabled) { return; }
        this.inner = highlights;
        this.inner.forEach(x => textEditor.then((inner) => {
            const options = x.hoverMessage
                ? [{ range: x.range, hoverMessage: x.hoverMessage }]
                : [x.range];
            inner.setDecorations(x.decoration, options);
        }));
    }
    
    static updateComplexity(totalComplexity: number, filename: string) {
        if (this.Enabled()) {
            ComplexityStatusBar.updateComplexity(totalComplexity, filename);
        } else {
            ComplexityStatusBar.hide();
        }
    }
    
    static disposeStatusBar() {
        ComplexityStatusBar.dispose();
    }

}

let highlights: Highlights | undefined = undefined;