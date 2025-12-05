import {
    FileDecoration,
    FileDecorationProvider,
    Uri,
    EventEmitter,
    Event,
    workspace
} from 'vscode';
import { Logger } from '../logger';
import * as path from 'path';
import * as fs from 'fs';

export class ComplexityDecorationProvider implements FileDecorationProvider {
    private _onDidChangeFileDecorations = new EventEmitter<Uri | Uri[] | undefined>();
    readonly onDidChangeFileDecorations: Event<Uri | Uri[] | undefined> = this._onDidChangeFileDecorations.event;
    
    private complexityCache = new Map<string, number>();
    private logger: Logger;
    
    constructor(logger: Logger) {
        this.logger = logger;
    }
    
    provideFileDecoration(uri: Uri): FileDecoration | undefined {
        this.logger.info('🔍 Providing decoration for:', uri.fsPath);
        
        // Check if file complexity display is enabled
        const config = workspace.getConfiguration('boltzmann-analyser');
        const showComplexity = config.get<boolean>('showFileComplexity', true);
        
        this.logger.info('📋 Show complexity setting:', showComplexity);
        
        if (!showComplexity) {
            this.logger.info('❌ File complexity display is disabled');
            return undefined;
        }
        
        const complexity = this.getFileComplexity(uri);
        
        this.logger.info('📊 File complexity for', uri.fsPath, ':', complexity);
        
        if (complexity === undefined) {
            this.logger.info('❓ No complexity found for file');
            return undefined;
        }
        
        // Format complexity with appropriate color - keep badge short
        let badge: string;
        if (complexity >= 1000000) {
            badge = Math.round(complexity / 1000000) + 'm';
        } else if (complexity >= 1000) {
            badge = Math.round(complexity / 1000) + 'k';
        } else if (complexity >= 100) {
            badge = Math.round(complexity).toString();
        } else {
            badge = complexity.toFixed(0);
        }

        const decoration: FileDecoration = {
            badge,
            tooltip: `File complexity: ${complexity.toFixed(2)}`
        };
        
        this.logger.info('Returning decoration for', uri.fsPath, ':', decoration);
        return decoration;
    }
    
    private getFileComplexity(uri: Uri): number | undefined {
        const filePath = uri.fsPath;
        const cacheKey = filePath;
        
        // Check cache first
        if (this.complexityCache.has(cacheKey)) {
            return this.complexityCache.get(cacheKey);
        }
        
        // Try to find corresponding analysis file
        const complexity = this.loadComplexityFromAnalysis(filePath);
        
        if (complexity !== undefined) {
            this.complexityCache.set(cacheKey, complexity);
        }
        
        return complexity;
    }
    
    private loadComplexityFromAnalysis(filePath: string): number | undefined {
        try {
            this.logger.info('🔍 Loading complexity for:', filePath);
            
            const workspaceFolder = workspace.getWorkspaceFolder(Uri.file(filePath));
            if (!workspaceFolder) {
                this.logger.info('❌ No workspace folder found for:', filePath);
                return undefined;
            }
            
            const workspacePath = workspaceFolder.uri.fsPath;
            const relativePath = path.relative(workspacePath, filePath);
            const analysisPath = path.join(workspacePath, '.boltzmann', relativePath);
            
            this.logger.info('📁 Looking for analysis file at:', analysisPath);
            
            if (!fs.existsSync(analysisPath)) {
                this.logger.info('❌ Analysis file does not exist:', analysisPath);
                return undefined;
            }
            
            const analysisContent = fs.readFileSync(analysisPath, 'utf8');
            const analysis = JSON.parse(analysisContent);
            
            this.logger.info('✅ Analysis loaded successfully');
            this.logger.info('📊 Analysis content keys:', Object.keys(analysis));
            
            // Extract total complexity from root node
            if (analysis.tree && analysis.tree.nodes && analysis.tree.nodes.length > 0) {
                const complexity = analysis.tree.nodes[0].complexity;
                this.logger.info('✅ Extracted complexity:', complexity);
                return complexity;
            }
            
            this.logger.info('❌ No complexity found in analysis structure');
            
        } catch (error) {
            this.logger.error(`❌ Error loading complexity for file ${filePath}: ${error}`);
        }
        
        return undefined;
    }
    
    public clearCache() {
        this.logger.info('Clearing decoration cache for all files');
        this.complexityCache.clear();
        this._onDidChangeFileDecorations.fire(undefined);
    }
    
    public refreshFile(filePath: string) {
        this.logger.debug('Refreshing decoration for specific file:', filePath);
        this.complexityCache.delete(filePath);
        this._onDidChangeFileDecorations.fire(Uri.file(filePath));
    }
    
    public refreshAllFiles() {
        this.logger.info('Refreshing decorations for all files');
        this.clearCache();
        // Fire event to refresh all file decorations
        this._onDidChangeFileDecorations.fire(undefined);
    }
}