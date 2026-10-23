#!/usr/bin/env node
/**
 * Creates a new reusable UI5 component below the reuse folder of the landing page.
 *
 * Usage (from the dailyfy folder):
 *   npm run createuiapp                          -> asks for the project name and the prefix
 *   npm run createuiapp -- orders ord            -> no questions (project name, 3 character prefix)
 *   npm run createuiapp -- --projectname=orders --prefix=ord
 *
 * Steps:
 *   1. Generates the app with the SAP Fiori generator (yo @sap/fiori:headless), installed as a
 *      devDependency of this project (no global install), into a temporary folder.
 *   2. Namespace = <namespace from config.json>.<projectname>, e.g. goalittech.ui.reuse.orders.
 *   3. Adapts the generated webapp as configured in config.json ("webapp"):
 *      remove files/folders and add/overwrite files from the template folder. manifest.json is kept as generated.
 *   4. Copies the webapp to <targetDir from config.json>/<projectname>.
 *   5. Adds the app to "componentUsages" and "reuseComponents" of <hostConfig from config.json>
 *      (component-router-config.json of the landing page).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..", "..");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const config = readJson(path.join(here, "config.json"));

function argsFromCommandLine() {
	const argv = process.argv.slice(2);
	let name = process.env.npm_config_projectname;
	let prefix;
	const positionals = [];
	for (let i = 0; i < argv.length; i++) {
		const match = /^--(projectname|prefix)(?:=(.*))?$/.exec(argv[i]);
		if (match) {
			const value = match[2] !== undefined ? match[2] : argv[++i];
			if (match[1] === "projectname") {
				name = value;
			} else {
				prefix = value;
			}
		} else if (!argv[i].startsWith("--")) {
			positionals.push(argv[i]);
		}
	}
	name = positionals[0] ?? name;
	prefix = positionals[1] ?? prefix;
	// "npm run createuiapp --projectname" (without a value) arrives as "true"
	const clean = (value) => (value && value !== "true" ? value.trim() : "");
	return { name: clean(name), prefix: clean(prefix) };
}

let pipedLines;
function readPipedLine() {
	if (!pipedLines) {
		try {
			pipedLines = fs.readFileSync(0, "utf8").split(/\r?\n/);
		} catch {
			pipedLines = [];
		}
	}
	return (pipedLines.shift() ?? "").trim();
}

async function ask(rl, question) {
	if (!process.stdin.isTTY) {
		process.stdout.write(question);
		return readPipedLine();
	}
	return (await rl.question(question)).trim();
}

function validate(name) {
	if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
		return "The project name must start with a letter and may only contain letters, digits and underscores (it becomes part of the UI5 namespace).";
	}
	return null;
}

// the prefix is mandatory, has a fixed length and must not be used by another reuse component
function validatePrefix(prefix, name) {
	const length = config.prefixLength;
	if (!new RegExp(`^[A-Za-z][A-Za-z0-9]{${length - 1}}$`).test(prefix)) {
		return `The prefix is mandatory and must be exactly ${length} characters: a letter followed by letters or digits.`;
	}
	const host = readJson(path.join(projectRoot, config.hostConfig));
	const usedBy = (host.reuseComponents || []).find(
		(component) => component.key !== name && String(component.prefix).toLowerCase() === prefix.toLowerCase()
	);
	return usedBy ? `The prefix '${prefix}' is already used by '${usedBy.key}'.` : null;
}

function replaceAll(text, values) {
	return Object.entries(values).reduce((result, [key, value]) => result.split(key).join(value), text);
}

// the generator is a devDependency, so it is started from node_modules and not from a global install
function runGenerator(appConfigFile) {
	const require = createRequire(path.join(projectRoot, "package.json"));
	let yoCli;
	try {
		const yoPackage = require.resolve("yo/package.json");
		yoCli = path.join(path.dirname(yoPackage), readJson(yoPackage).bin.yo);
		require.resolve("@sap/generator-fiori/package.json");
	} catch {
		throw new Error("'yo' and '@sap/generator-fiori' are not installed. Run: npm install --save-dev yo @sap/generator-fiori");
	}

	const result = spawnSync(
		process.execPath,
		[yoCli, "@sap/fiori:headless", appConfigFile, "--force", "--skipInstall"],
		{ cwd: projectRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
	);
	if (result.status !== 0) {
		throw new Error(`The Fiori generator failed:\n${result.stdout}${result.stderr}`);
	}
}

function generate(name, namespace, title, workDir) {
	const appConfigFile = path.join(workDir, "app.json");
	fs.writeFileSync(
		appConfigFile,
		JSON.stringify(
			{
				version: "0.2",
				floorplan: config.generator.floorplan,
				project: {
					name,
					targetFolder: path.join(workDir, "out").replace(/\\/g, "/"),
					namespace: config.namespace,
					title,
					description: title,
					ui5Theme: config.generator.ui5Theme,
					ui5Version: config.generator.ui5Version,
					localUI5Version: config.generator.ui5Version,
					sapux: false,
					skipAnnotations: true,
					enableTypeScript: Boolean(config.generator.enableTypeScript)
				}
			},
			null,
			2
		)
	);
	runGenerator(appConfigFile);

	const webapp = path.join(workDir, "out", name, "webapp");
	if (!fs.existsSync(webapp)) {
		throw new Error("The Fiori generator did not create a webapp folder.");
	}
	return webapp;
}

// remove: files and folders of the generated webapp that a reuse component does not need
function removeFromWebapp(webapp) {
	for (const entry of config.webapp.remove || []) {
		fs.rmSync(path.join(webapp, entry), { recursive: true, force: true });
	}
}

// add: copy the files of the template folder; existing generated files are overwritten
function addToWebapp(webapp, values) {
	const templateDir = path.join(projectRoot, config.webapp.templateDir || "");
	if (!config.webapp.templateDir || !fs.existsSync(templateDir)) {
		return;
	}
	const copy = (from, to) => {
		fs.mkdirSync(to, { recursive: true });
		for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
			const source = path.join(from, entry.name);
			const target = path.join(to, entry.name);
			if (entry.isDirectory()) {
				copy(source, target);
			} else {
				fs.writeFileSync(target, replaceAll(fs.readFileSync(source, "utf8"), values));
			}
		}
	};
	copy(templateDir, webapp);
}

// registers the app in the host config; an existing entry of the same name is replaced
function registerInHost(name, title, namespace, prefix) {
	const hostFile = path.join(projectRoot, config.hostConfig);
	const host = readJson(hostFile);
	const usage = `${name}Component`;

	host.componentUsages = host.componentUsages || {};
	host.componentUsages[usage] = { name: namespace, settings: {}, componentData: {}, lazy: true };

	const others = (host.reuseComponents || []).filter((component) => component.key !== name);
	host.reuseComponents = others.concat({
		key: name,
		text: title,
		description: `${title} reusable component`,
		icon: "sap-icon://product",
		usage,
		prefix,
		eventMappings: []
	});

	fs.writeFileSync(hostFile, JSON.stringify(host, null, 2) + "\n");
}

// asks until the value is valid; without a terminal the invalid value is reported as error
async function askValid(rl, question, value, check) {
	for (;;) {
		if (!value) {
			value = await ask(rl, question);
		}
		const error = check(value);
		if (!error) {
			return value;
		}
		if (!process.stdin.isTTY) {
			throw new Error(value ? error : "Missing input.");
		}
		console.log(error);
		value = "";
	}
}

async function main() {
	const args = argsFromCommandLine();
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
	let name;
	let prefix;
	try {
		name = await askValid(rl, "Project name (e.g. orders): ", args.name, validate);
		prefix = (
			await askValid(rl, `Prefix (${config.prefixLength} characters, unique, e.g. ord): `, args.prefix, (value) =>
				validatePrefix(value, name)
			)
		).toLowerCase();
	} finally {
		rl.close();
	}

	const namespace = `${config.namespace}.${name}`;
	const target = path.join(projectRoot, config.targetDir, name);
	if (fs.existsSync(target)) {
		throw new Error(`${path.relative(projectRoot, target)} already exists.`);
	}

	const title = name[0].toUpperCase() + name.slice(1);
	const values = {
		__NAMESPACE__: namespace,
		__NAME__: name,
		__TITLE__: title,
		__HOST_PATH__: config.hostNamespace.replace(/\./g, "/")
	};

	const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "createuiapp-"));
	try {
		const webapp = generate(name, namespace, title, workDir);
		removeFromWebapp(webapp);
		addToWebapp(webapp, values);

		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.cpSync(webapp, target, { recursive: true });
		registerInHost(name, title, namespace, prefix);
	} catch (generationError) {
		fs.rmSync(target, { recursive: true, force: true });
		throw generationError;
	} finally {
		fs.rmSync(workDir, { recursive: true, force: true });
	}

	console.log(`Created UI5 app '${namespace}' in ${path.relative(projectRoot, target)}`);
	console.log(`Registered '${name}' (componentUsages + reuseComponents, prefix '${prefix}') in ${config.hostConfig}`);
}

main().catch((error) => {
	console.error(`createuiapp failed: ${error.message}`);
	process.exit(1);
});
