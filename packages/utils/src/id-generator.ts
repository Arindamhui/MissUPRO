import { randomInt } from "node:crypto";

export class PublicIdGenerationError extends Error {
  constructor(message = "Unable to generate unique public identifier") {
    super(message);
    this.name = "PublicIdGenerationError";
  }
}

function numericSegment(length: number) {
  let value = "";

  while (value.length < length) {
    value += randomInt(0, 10).toString();
  }

  return value;
}

export function createCandidatePublicId(prefix: string, digits: number) {
  return `${prefix}${numericSegment(digits)}`;
}

export async function generateUniquePublicId(params: {
  prefix: string;
  digits: number;
  exists: (candidate: string) => Promise<boolean>;
  maxAttempts?: number;
}) {
  const maxAttempts = params.maxAttempts ?? 32;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = createCandidatePublicId(params.prefix, params.digits);
    const exists = await params.exists(candidate);

    if (!exists) {
      return candidate;
    }
  }

  throw new PublicIdGenerationError();
}