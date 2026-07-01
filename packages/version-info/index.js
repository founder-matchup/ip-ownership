import { existsSync }  from 'node:fs';
import { join, parse } from 'node:path';
import { cwd }         from 'node:process';
import { readFile }    from 'node:fs/promises';

const findFile = (file) => {
    let dir = cwd();

    while (dir !== parse(dir).root) {
        if (existsSync(join(dir, file))) {
            return dir;
        }

        dir = join(dir, '../');
    }
}

const root = findFile('.git');
const pack = findFile('package.json');

const readGit = (filename) => {
    if (!root) {
        throw 'no git repository root found';
    }

    return readFile(join(root, filename), 'utf8');
}

let _envCache;
const loadGitEnv = async () => {
    if (_envCache) return _envCache;

    const envFile = findFile('.git-env');
    if (!envFile) return {};

    try {
        const content = await readFile(join(envFile, '.git-env'), 'utf8');
        _envCache = Object.fromEntries(
            content.split('\n')
                .filter(String)
                .map(line => line.split('='))
                .map(([k, ...v]) => [k, v.join('=')])
        );
    } catch {
        _envCache = {};
    }

    return _envCache;
}

const parseRemoteUrl = (raw) => {
    let remote = raw;

    if (remote?.startsWith('git@')) {
        remote = remote.split(':')[1];
    } else if (remote?.startsWith('http')) {
        remote = new URL(remote).pathname.substring(1);
    }

    return remote?.replace(/\.git$/, '') || undefined;
}

export const getCommit = async () => {
    if (root) {
        return (await readGit('.git/logs/HEAD'))
                ?.split('\n')
                ?.filter(String)
                ?.pop()
                ?.split(' ')[1];
    }

    return (await loadGitEnv()).GIT_COMMIT || undefined;
}

export const getBranch = async () => {
    if (process.env.CF_PAGES_BRANCH) {
        return process.env.CF_PAGES_BRANCH;
    }

    if (process.env.WORKERS_CI_BRANCH) {
        return process.env.WORKERS_CI_BRANCH;
    }

    if (root) {
        return (await readGit('.git/HEAD'))
                ?.replace(/^ref: refs\/heads\//, '')
                ?.trim();
    }

    return (await loadGitEnv()).GIT_BRANCH || undefined;
}

export const getRemote = async () => {
    if (root) {
        let remote = (await readGit('.git/config'))
                        ?.split('\n')
                        ?.find(line => line.includes('url = '))
                        ?.split('url = ')[1];

        const parsed = parseRemoteUrl(remote);
        if (parsed) return parsed;
    }

    const env = await loadGitEnv();
    const parsed = parseRemoteUrl(env.GIT_REMOTE);
    if (parsed) return parsed;

    return undefined;
}

export const getVersion = async () => {
    if (!pack) {
        throw 'no package root found';
    }

    const { version } = JSON.parse(
        await readFile(join(pack, 'package.json'), 'utf8')
    );

    return version;
}
