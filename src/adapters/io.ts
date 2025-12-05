import { closeSync, openSync, readFileSync } from "fs";

export const readJsonFromFile = (path: string) => {
	try {
		const file = openSync(path, 'r');
		const content_raw = readFileSync(file);
		closeSync(file);
		const decoded = new TextDecoder("utf-8").decode(content_raw);
		const json = JSON.parse(decoded);
		return json;
	} catch 
	{
		return {};
	}
};