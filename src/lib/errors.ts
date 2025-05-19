export class OError {
	message(): string {
		throw new Error("Must be implemented");
	}
}

export class OErrorFileNoOwner extends OError {
	public readonly filePath: string;
	constructor(root: string, filePath: string) {
		super();
		this.filePath = filePath.replace(root, ".");
	}
	message(): string {
		return this.filePath + " has no owner";
	}
}

export class OErrorNothingToTest extends OError {
	message(): string {
		return "Nothing to test";
	}
}

export class OErrorDebugAndQuiet extends OError {
	message(): string {
		return "Option debug and quiet cannot be enabled at the same time";
	}
}

export class OErrorNoConfig extends OError {
	message() {
		return "No Configuration file found. Run the command `init` to generate one.";
	}
}
