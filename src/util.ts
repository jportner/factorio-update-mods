import semver from 'semver';

export type SemVerString = `${number}.${number}.${number}`;

interface WithSemVerString {
  version: SemVerString;
}

export function semVerDesc(a: WithSemVerString, b: WithSemVerString) {
  return semver.compare(b.version, a.version); // sort in descending order
}
