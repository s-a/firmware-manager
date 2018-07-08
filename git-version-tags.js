const semver = require('semver')
const util = require('util')
const fs = require('fs')
const path = require('path')
const exec = util.promisify(require('child_process').exec)
let gitFolder = process.env.REPOSITORY_FOLDER

gitFolder = path.join(gitFolder, '.git')
const repositoryFolder = path.normalize(process.env.REPOSITORY_FOLDER)

if (!fs.existsSync(gitFolder)) {
	throw new Error(`Repository folder "${gitFolder}" does not exist.`)
}
process.cwd(gitFolder)

const commands = {
	current: `git --git-dir ${gitFolder} rev-parse --verify HEAD`,
	fetch: `git --git-dir ${gitFolder} fetch --all`,
	ref: `git --git-dir ${gitFolder} for-each-ref --format="%(refname:short)|%(object)" --count=300 --sort="-*authordate" refs/tags/`,
	contains: `git --git-dir ${gitFolder} branch --format="%(refname)" --contains`,
	checkout: `git --git-dir ${gitFolder} --work-tree=${repositoryFolder} checkout`,
	stash: `git --git-dir ${gitFolder} --work-tree=${repositoryFolder} stash`,
	stashDrop: `git --git-dir ${gitFolder} --work-tree=${repositoryFolder} stash drop`
}

function compare(a, b) {
	if (semver.lt(a.version, b.version)) {
		return 1
	} else {
		return -1
	}
}

async function execute(command, silent) {
	global.logger.debug(command)
	let result
	try {
		const {
			stdout,
			stderr
		} = await exec(command, {
			cwd: repositoryFolder
		})
		if (stderr && silent !== true) {
			throw new Error(stderr)
		}
		result = stdout
	} catch (error) {
		if (silent !== true) {
			throw new Error(error)
		}
	}
	return result
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

async function checkout(commit) {
	await execute(commands.stash, true)
	await execute(commands.stashDrop, true)
	await execute(commands.checkout + ' ' + commit, true)
}

module.exports = {
	getGitVersionTags,
	checkout
}