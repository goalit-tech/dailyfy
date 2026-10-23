#!/usr/bin/env node
/**
 * Updates the central version file (./versions.json) that every generated UI5 app
 * uses, so that all apps are created with the same, latest versions.
 *
 * Usage (from the dailyfy folder):
 *   npm run updateuiversions                    -> updates ui/versions.json only
 *   npm run updateversions                      -> also bumps the UI5 version of the existing apps (ui5*.yaml,
 *                                                  minUI5Version) and all package.json dependencies of the project
 *   add "-- --dry-run" to show the changes without writing
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const versionsFile = path.join(here, "versions.json");
const projectRoot = path.resolve(here, "..", "..");
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");

async function fetchJson(url) {
	const response = await fetch(url, { headers: { accept: "application/json" } });
	if (!response.ok) {
		throw new Error(`${url} responded with ${response.status}`);
	}
	return response.json();
}

async function latestNpmVersion(pkg) {
	const data = await fetchJson(`https://registry.npmjs.org/${pkg.replace("/", "%2F")}/latest`);
	return data.version;
}

function write(file, data) {
	if (!dryRun) {
		fs.writeFileSync(file, JSON.stringify(data, null, "\t") + "\n");
	}
}

async function updateVersionsFile() {
	const versions = JSON.parse(fs.readFileSync(versionsFile, "utf8"));
	const [ui5, mapping] = await Promise.all([
		fetchJson("https://ui5.sap.com/version.json"),
		fetchJson("https://unpkg.com/@ui5/manifest@latest/mapping.json")
	]);
	const latestUi5Version = ui5.latest.version;
	const [major, minor] = latestUi5Version.split(".");

	// highest manifest schema (major 1) that is known for the latest UI5 version or the closest older one
	const byVersion = mapping.$byUI5Version;
	const known = Object.keys(byVersion).filter((key) => key.startsWith(`${major}.`) && Number(key.split(".")[1]) <= Number(minor));
	known.sort((a, b) => Number(b.split(".")[1]) - Number(a.split(".")[1]));
	const manifestVersion = known.length ? byVersion[known[0]].maxSchemaVersion["1"] : versions.manifestVersion;

	const next = { ...versions, ui5Version: latestUi5Version, minUI5Version: `${major}.${minor}.0`, manifestVersion };

	for (const key of Object.keys(next)) {
		console.log(`${versions[key] === next[key] ? "  =" : "  ->"} ${key}: ${versions[key] === next[key] ? next[key] + " (up to date)" : versions[key] + " => " + next[key]}`);
	}
	write(versionsFile, next);
	return next;
}

// keeps the UI5 version of the existing apps (ui5*.yaml, manifest.json) in line with versions.json
function updateUi5Versions(versions, dir = projectRoot) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (entry.name === "node_modules" || entry.name.startsWith(".")) {
			continue;
		}
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			updateUi5Versions(versions, full);
			continue;
		}
		const isYaml = /^ui5.*\.yaml$/.test(entry.name);
		if (!isYaml && entry.name !== "manifest.json") {
			continue;
		}
		const source = fs.readFileSync(full, "utf8");
		const updated = isYaml
			? source.replace(/^(\s+version:\s*)\d+\.\d+\.\d+/gm, `$1${versions.ui5Version}`)
			: source.replace(/("minUI5Version"\s*:\s*")[\d.]+"/g, `$1${versions.minUI5Version}"`);
		if (updated !== source) {
			console.log(`  -> ${path.relative(projectRoot, full)}`);
			if (!dryRun) {
				fs.writeFileSync(full, updated);
			}
		}
	}
}

function findPackageFiles(dir, found = []) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (entry.name === "node_modules" || entry.name.startsWith(".")) {
			continue;
		}
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			findPackageFiles(full, found);
		} else if (entry.name === "package.json") {
			found.push(full);
		}
	}
	return found;
}

async function updatePackageFiles() {
	const cache = new Map();
	for (const file of findPackageFiles(projectRoot)) {
		const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
		let changed = false;
		for (const section of ["dependencies", "devDependencies"]) {
			for (const [dep, range] of Object.entries(pkg[section] || {})) {
				const prefix = (/^[\^~]/.exec(range) || [""])[0];
				// only plain semver ranges are bumped, e.g. "^3" or "~1.2.3"
				if (!/^[\^~]?\d/.test(range)) {
					continue;
				}
				if (!cache.has(dep)) {
					cache.set(dep, latestNpmVersion(dep).catch((error) => {
						console.warn(`  ! ${dep}: ${error.message}`);
						return null;
					}));
				}
				const latest = await cache.get(dep);
				if (!latest) {
					continue;
				}
				// keep the granularity of the existing range ("^3" stays a major-only range)
				const parts = range.replace(/^[\^~]/, "").split(".").length;
				const next = prefix + latest.split(".").slice(0, parts).join(".");
				if (next !== range) {
					console.log(`  -> ${path.relative(projectRoot, file)}: ${dep} ${range} => ${next}`);
					pkg[section][dep] = next;
					changed = true;
				}
			}
		}
		if (changed) {
			const original = fs.readFileSync(file, "utf8");
			const indent = (/\n([\t ]+)"/.exec(original) || [, "  "])[1];
			const eol = original.includes("\r\n") ? "\r\n" : "\n";
			if (!dryRun) {
				fs.writeFileSync(file, JSON.stringify(pkg, null, indent).replace(/\n/g, eol) + (original.endsWith("\n") ? eol : ""));
			}
		}
	}
}

console.log(`${dryRun ? "[dry-run] " : ""}UI versions (${path.relative(projectRoot, versionsFile)}):`);
try {
	const versions = await updateVersionsFile();
	if (args.has("--project")) {
		console.log(`${dryRun ? "[dry-run] " : ""}UI5 version of existing apps:`);
		updateUi5Versions(versions);
		console.log(`${dryRun ? "[dry-run] " : ""}Project dependencies:`);
		await updatePackageFiles();
		console.log("Run 'npm install' in the changed folders to apply the new package versions.");
	}
} catch (error) {
	console.error(`updateuiversions failed: ${error.message}`);
	process.exit(1);
}
