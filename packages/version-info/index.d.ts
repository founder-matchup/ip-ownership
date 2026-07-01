declare module "@imput/version-info" {
    export function getCommit(): Promise<string | undefined>;
    export function getBranch(): Promise<string | undefined>;
    export function getRemote(): Promise<string | undefined>;
    export function getVersion(): Promise<string>;
}
