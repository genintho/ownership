export class OErrors {
	message(): string {
		throw new Error("Must be implemented");
	}
}

export class OErrorFileNoOwner extends OErrors {
	public readonly filePath: string;
	constructor(root: string, filePath: string) {
		super();
		this.filePath = filePath.replace(root, ".");
	}
	message(): string {
		return this.filePath + " has no owner";
	}
}

export class OErrorNothingToTest extends OErrors {
	message(): string {
		return "Nothing to test";
	}
}

export class OErrorNoConfig extends Error {
	constructor() {
		super("No Configuration file found. Run the command `init` to generate one.");
	}
}
