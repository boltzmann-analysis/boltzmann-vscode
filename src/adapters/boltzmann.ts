import { execSync } from "child_process";
import { workspace } from "vscode";
import { Logger } from "../logger";
import { Fail, Ok, Result } from "../result";

type ExecuteAnalyser = (options: ExecutionOptions, logger: Logger) => Result<string, Error>

export type ExecutionOptions = { folder: string, filePath: string}

export const BOLTZMANN_STORAGE_PATH = ".boltzmann";

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

export const executeAnalyser: ExecuteAnalyser = (options: ExecutionOptions, logger: Logger) => {
	const binaryPath = getBinaryPath(logger);
	const command = `"${binaryPath}" file "${options.folder}" "${options.filePath}" "${options.folder}"`;

	try {
		logger.info("Executing command", command);
		const buffer = execSync(command, { encoding: 'utf8' });
		logger.trace("Command Result", buffer);
	}
	catch(error) {
		logger.error('Error executing Boltzmann analyzer');
		logger.error('Make sure the binary path is correct in settings or that boltzmann_analyser is in your PATH');
		return Fail(error as Error);
	}

	return Ok(`${options.folder}/${BOLTZMANN_STORAGE_PATH}/${options.filePath}`);
};
