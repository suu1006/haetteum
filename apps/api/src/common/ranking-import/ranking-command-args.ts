export function parseRankingDirectoryArg(argv: string[]): string {
  const separateArgIndex = argv.indexOf("--directory");

  if (separateArgIndex >= 0) {
    const directory = argv[separateArgIndex + 1];
    if (directory !== undefined && directory.trim() !== "") return directory;
    throw new Error("Missing directory");
  }

  const equalsArg = argv.find((arg) => arg.startsWith("--directory="));
  const directory = equalsArg?.slice("--directory=".length);

  if (directory !== undefined && directory.trim() !== "") return directory;

  throw new Error("Missing directory");
}
