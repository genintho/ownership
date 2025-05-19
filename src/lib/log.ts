import chalk from "chalk";

let mode: null | "quiet" | "debug" = null;

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
};
