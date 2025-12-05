import { execSync } from "child_process";
import { Logger } from "../logger";
import { Fail, Ok, Result } from "../result";

type ExecuteAnalyser = (options: ExecutionOptions, logger: Logger) => Result<string, Error>

export type ExecutionOptions = { folder: string, filePath: string}

export const EXECUTABLE_PATH = "/home/samantha/git/boltzmann/target/release/boltzmann_analyser";
export const BOLTZMANN_STORAGE_PATH = ".boltzmann";

export const executeAnalyser: ExecuteAnalyser = (options: ExecutionOptions, logger: Logger) => {
	const command = `${EXECUTABLE_PATH} file ${options.folder} ${options.filePath} ${options.folder}`;

	try {
		logger.info("Executing command", command);
		const buffer = execSync(command);
		logger.trace("Command Result", buffer);
	}
	catch(error) {
		logger.error(error);
		Fail(error);		
	}

	return Ok(`${options.folder}/${BOLTZMANN_STORAGE_PATH}/${options.filePath}`);
};
