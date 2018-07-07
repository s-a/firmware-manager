const semver = require('semver')
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const gitFolder = 'c:/git/csx-client/.git/'
const commands = {
	current: `git --git-dir ${gitFolder} rev-parse --verify HEAD`,
	fetch: `git --git-dir ${gitFolder} fetch --all`,
	ref: `git --git-dir ${gitFolder} for-each-ref --format="%(refname:short)|%(object)" refs/tags/`,
	contains: `git --git-dir ${gitFolder} branch --format="%(refname)" --contains`
}

function compare(a, b) {
	if (semver.lt(a.version, b.version)) {
		return 1
	} else {
		return -1
	}
}

async function execute(command) {
	const {
		stdout,
		stderr
	} = await exec(command)
	if (stderr) {
		throw new Error(stderr)
	}
	return stdout
}

async function getGitVersionTags() {
	const currentHash = await execute(commands.current)
	await execute(commands.fetch)
	let refTable = await execute(commands.ref)
	refTable = refTable.replace(/\r/g, '').split('\n')
	let versions = []
	for (let r = 0; r < refTable.length; r++) {
		const row = refTable[r]
		const cols = row.split('|')
		const version = {
			tag: cols[0],
			hash: cols[1],
			version: semver.clean(cols[0])
		}
		if (version.tag && version.hash) {
			versions.push(version)
		}
	}

	for (let v = 0; v < versions.length; v++) {
		const ver = versions[v]
		let branches = await execute(commands.contains + ' ' + ver.hash)
		branches = branches.replace(/\r/g, '').replace(/refs\/heads\//g, '').split('\n')
		versions[v].branches = []
		for (let b = 0; b < branches.length; b++) {
			const branch = branches[b].trim()
			if (branch !== '') {
				versions[v].branches.push(branch)
			}
		}
	}

	versions = versions.sort(compare)
	return {
		currentHash: currentHash.replace(/\n/g, '').replace(/\r/g, ''),
		versions
	}
}

module.exports = getGitVersionTags