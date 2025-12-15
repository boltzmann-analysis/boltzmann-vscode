import { execSync } from "child_process";
import { workspace } from "vscode";
import { Logger } from "../logger";
import * as https from "https";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import { URL } from "url";

type ExecuteAnalyser = (options: ExecutionOptions, logger: Logger) => Promise<string>
type ExecuteProjectAnalyser = (folder: string, logger: Logger) => void

export type ExecutionOptions = { folder: string, filePath: string}

export const BOLTZMANN_STORAGE_PATH = ".boltzmann";

type AnalysisMode = "local" | "remote";

function getAnalysisMode(logger: Logger): AnalysisMode {
	const config = workspace.getConfiguration('boltzmann-analyser');
	const mode = config.get<AnalysisMode>('analysisMode', 'local');
	logger.debug('Analysis mode:', mode);
	return mode;
}

function getRemoteServerUrl(logger: Logger): string {
	const config = workspace.getConfiguration('boltzmann-analyser');
	const url = config.get<string>('remoteServerUrl', 'http://localhost:3030');
	logger.debug('Remote server URL:', url);
	return url;
}

function getLanguageFromFilePath(filePath: string): string {
	const ext = path.extname(filePath).toLowerCase();
	const languageMap: { [key: string]: string } = {
		'.js': 'JavaScript',
		'.jsx': 'JavaScript',
		'.ts': 'TypeScript',
		'.tsx': 'TypeScript',
		'.rs': 'Rust',
		'.cs': 'CSharp',
		'.go': 'Go',
		'.py': 'Python',
		'.c': 'C',
		'.h': 'C_H',
		'.cpp': 'CPlusPlus',
		'.cc': 'CPlusPlus',
		'.cxx': 'CPlusPlus',
		'.hpp': 'CPlusPlus_Hpp',
		'.hh': 'CPlusPlus_Hpp',
		'.hxx': 'CPlusPlus_Hpp',
		'.asm': 'Assembly',
		'.s': 'Assembly',
		'.sh': 'Bash',
		'.bash': 'Bash',
		'.java': 'Java',
		'.html': 'Html',
		'.htm': 'Html',
		'.nix': 'Nix'
	};
	return languageMap[ext] || 'Unknown';
}

function getBinaryPath(logger: Logger): string {
	const config = workspace.getConfiguration('boltzmann-analyser');
	const userPath = config.get<string>('binaryPath', '');

	if (userPath && userPath.trim() !== '') {
		logger.debug('Using user-configured binary path:', userPath);
		return userPath.trim();
	}

	// Default to binary name (assumes it's in PATH)
	logger.debug('Using default binary name from PATH');
	return 'boltzmann_analyser';
}

async function executeRemoteAnalyser(options: ExecutionOptions, logger: Logger): Promise<string> {
	const serverUrl = getRemoteServerUrl(logger);
	const language = getLanguageFromFilePath(options.filePath);

	// Read the file content
	const fullPath = path.join(options.folder, options.filePath);
	const content = fs.readFileSync(fullPath, { encoding: 'utf8' });

	// Prepare the request body
	const requestBody = JSON.stringify({
		content,
		language,
		file_id: options.filePath
	});

	logger.info('Sending remote analysis request to', serverUrl);
	logger.debug('Language:', language, 'File:', options.filePath);

	return new Promise((resolve, reject) => {
		const url = new URL('/analyse', serverUrl);
		const protocol = url.protocol === 'https:' ? https : http;

		const requestOptions = {
			hostname: url.hostname,
			port: url.port,
			path: url.pathname,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(requestBody)
			}
		};

		const req = protocol.request(requestOptions, (res) => {
			let data = '';

			res.on('data', (chunk) => {
				data += chunk;
			});

			res.on('end', () => {
				if (res.statusCode !== 200) {
					logger.error(`Remote analysis failed with status: ${res.statusCode}`);
					logger.error(`Response: ${data}`);
					reject(new Error(`Remote analysis failed with status ${res.statusCode}: ${data}`));
					return;
				}

				try {
					const response = JSON.parse(data);

					if (!response.success) {
						logger.error('Remote analysis returned success: false');
						reject(new Error('Remote analysis failed'));
						return;
					}

					// Save the response data to a .blta file
					const outputDir = path.join(options.folder, BOLTZMANN_STORAGE_PATH);
					const outputPath = path.join(outputDir, `${options.filePath}.blta`);

					// Ensure directory exists
					const outputDirPath = path.dirname(outputPath);
					if (!fs.existsSync(outputDirPath)) {
						fs.mkdirSync(outputDirPath, { recursive: true });
					}

					// Write the analyzed file data
					fs.writeFileSync(outputPath, JSON.stringify(response.data, null, 2));

					logger.info('Remote analysis completed successfully');
					logger.trace(`Analysis result written to: ${outputPath}`);
					resolve(outputPath);
				} catch (error) {
					logger.error(error);
					logger.error('Error parsing remote analysis response');
					reject(error);
				}
			});
		});

		req.on('error', (error) => {
			logger.error(error);
			logger.error('Error making remote analysis request');
			reject(error);
		});

		req.write(requestBody);
		req.end();
	});
}

function executeLocalAnalyser(options: ExecutionOptions, logger: Logger): string {
	const binaryPath = getBinaryPath(logger);
	const command = `"${binaryPath}" file "${options.folder}" "${options.filePath}" "${options.folder}"`;

	logger.info("Executing command", command);
	const buffer = execSync(command, { encoding: 'utf8' });
	logger.trace("Command Result", buffer);

	return `${options.folder}/${BOLTZMANN_STORAGE_PATH}/${options.filePath}.blta`;
}

export const executeAnalyser: ExecuteAnalyser = async (options: ExecutionOptions, logger: Logger) => {
	const mode = getAnalysisMode(logger);

	if (mode === 'remote') {
		return executeRemoteAnalyser(options, logger);
	} else {
		return executeLocalAnalyser(options, logger);
	}
};

export const executeProjectAnalyser: ExecuteProjectAnalyser = (folder: string, logger: Logger) => {
	const binaryPath = getBinaryPath(logger);
	const command = `"${binaryPath}" folder "." "."`;

	logger.info("Executing project analysis command", command);
	logger.info("Working directory:", folder);
	execSync(command, { encoding: 'utf8', cwd: folder });
	logger.info("Project analysis completed successfully");
};
