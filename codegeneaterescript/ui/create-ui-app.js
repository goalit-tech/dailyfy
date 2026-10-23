#!/usr/bin/env node
/**
 * Creates a new reusable UI5 component below the reuse folder of the landing page.
 *
 * Usage (from the dailyfy folder):
 *   npm run createuiapp                          -> asks for the project name
 *   npm run createuiapp --projectname=orders     -> no question
 *   npm run createuiapp -- orders                -> no question
 *
 * Namespace = <namespace from config.json>.<projectname>, e.g. goalittech.ui.reuse.orders
 * Versions (UI5, manifest) come from versions.json so that all apps are generated alike.
 * The files are created from ./templates/reuse-app.
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..", "..");
const templateDir = path.join(here, "templates", "reuse-app");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const config = readJson(path.join(here, "config.json"));
const versions = readJson(path.join(here, "versions.json"));

// the sample (and the host) use CRLF
const EOL = "\r\n";
const toEol = (text) => text.replace(/\r?\n/g, EOL);

function projectNameFromArgs() {
	const argv = process.argv.slice(2);
	let name = process.env.npm_config_projectname;
	for (let i = 0; i < argv.length; i++) {
		const match = /^--projectname(?:=(.*))?$/.exec(argv[i]);
		if (match) {
			name = match[1] !== undefined ? match[1] : argv[i + 1];
		} else if (!argv[i].startsWith("--")) {
			name = argv[i];
		}
	}
	// "npm run createuiapp --projectname" (without a value) arrives as "true"
	return name && name !== "true" ? name.trim() : "";
}

async function ask(question) {
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
	try {
		return (await rl.question(question)).trim();
	} finally {
		rl.close();
	}
}

function validate(name) {
	if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
		return "The project name must start with a letter and may only contain letters, digits and underscores (it becomes part of the UI5 namespace).";
	}
	return null;
}

function replaceAll(text, values) {
	return Object.entries(values).reduce((result, [key, value]) => result.split(key).join(value), text);
}

function copyTemplate(from, to, values) {
	fs.mkdirSync(to, { recursive: true });
	for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
		const source = path.join(from, entry.name);
		const target = path.join(to, entry.name);
		if (entry.isDirectory()) {
			copyTemplate(source, target, values);
		} else if (entry.name === "manifest.json") {
			writeManifest(source, target, values);
		} else {
			fs.writeFileSync(target, toEol(replaceAll(fs.readFileSync(source, "utf8"), values)));
		}
	}
}

function writeManifest(source, target, values) {
	const manifest = JSON.parse(replaceAll(fs.readFileSync(source, "utf8"), values));
	manifest["sap.ui5"].dependencies.libs = Object.fromEntries(config.libs.map((lib) => [lib, {}]));
	fs.writeFileSync(target, toEol(JSON.stringify(manifest, null, "\t") + "\n"));
}

function printRegistration(name, namespace, title) {
	const hostManifest = path.join(projectRoot, config.hostManifest);
	const usedPrefixes = [];
	try {
		const host = readJson(hostManifest)["sap.ui5"];
		usedPrefixes.push(...(host.config?.reuseComponents || []).map((component) => component.prefix));
	} catch {
		// the host manifest is optional for the hint only
	}
	let prefix = name[0].toLowerCase();
	while (usedPrefixes.includes(prefix)) {
		prefix += name[prefix.length]?.toLowerCase() || "x";
	}
	console.log(`
To show it in the landing page add the following to ${config.hostManifest}:

  "sap.ui5" > "componentUsages":
    "${name}Component": { "name": "${namespace}", "settings": {}, "componentData": {}, "lazy": true }

  "sap.ui5" > "config" > "reuseComponents":
    { "key": "${name}", "text": "${title}", "description": "${title} reusable component", "icon": "sap-icon://product", "usage": "${name}Component", "prefix": "${prefix}", "eventMappings": [] }`);
}

async function main() {
	let name = projectNameFromArgs();
	if (!name) {
		name = await ask("Project name (e.g. orders): ");
	}
	const error = validate(name);
	if (error) {
		throw new Error(name ? error : "No project name given.");
	}

	const namespace = `${config.namespace}.${name}`;
	const target = path.join(projectRoot, config.targetDir, name);
	if (fs.existsSync(target)) {
		throw new Error(`${path.relative(projectRoot, target)} already exists.`);
	}

	const title = name[0].toUpperCase() + name.slice(1);
	const values = {
		__NAMESPACE__: namespace,
		__HOST_PATH__: config.hostNamespace.replace(/\./g, "/"),
		__CSS_CLASS__: `${name}Page`,
		__TITLE__: title,
		__MANIFEST_VERSION__: versions.manifestVersion,
		__MIN_UI5_VERSION__: versions.minUI5Version
	};

	try {
		copyTemplate(templateDir, target, values);
	} catch (copyError) {
		fs.rmSync(target, { recursive: true, force: true });
		throw copyError;
	}

	console.log(`Created UI5 app '${namespace}' in ${path.relative(projectRoot, target)} (UI5 ${versions.minUI5Version}, manifest ${versions.manifestVersion})`);
	printRegistration(name, namespace, title);
}

main().catch((error) => {
	console.error(`createuiapp failed: ${error.message}`);
	process.exit(1);
});
