import chalk from "chalk";

let mode: null | "quiet" | "debug" = null;

const timings = new Map<string, number>();

export const log = {
	setLevel: (newMode: "quiet" | "debug") => {
		mode = newMode;
	},
	debug: (...message: any[]) => {
		if (mode === "debug") {
			console.log(
				...message.map((m) => {
					return chalk.grey(m);
				}),
			);
		}
	},
	line: (char: string = "-") => {
		console.log(char.repeat(70));
	},
	info: (...message: any[]) => {
		if (mode !== "quiet") {
			console.log(...message);
		}
	},
	warn: (...message: any[]) => {
		console.warn(...message);
	},
	error: (...message: any[]) => {
		console.error(...message);
	},
	time: (label: string) => {
		timings.set(label, Date.now());
	},
	timeEnd: (label: string, shouldLog: boolean = true): number => {
		const time = timings.get(label);
		if (!time) {
			throw new Error(`Time for label ${label} not found`);
		}

		const duration = Date.now() - time;
		if (shouldLog) {
			log.debug(`${label} took ${duration}ms`);
		}
		return duration;
	},
};
