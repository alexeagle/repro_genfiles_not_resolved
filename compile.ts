/// <reference path="./node.d.ts"/>
import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

export function formatDiagnostics(diags: ts.Diagnostic[]): string {
  return diags.map((d) => {
                let res = ts.DiagnosticCategory[d.category];
                if (d.file) {
                  res += ' at ' + d.file.fileName + ':';
                  const {line, character} = d.file.getLineAndCharacterOfPosition(d.start);
                  res += (line + 1) + ':' + (character + 1) + ':';
                }
                res += ' ' + ts.flattenDiagnosticMessageText(d.messageText, '\n');
                return res;
              })
      .join('\n');
}
function check(diags: ts.Diagnostic[]) {
  if (diags && diags.length && diags[0]) {
    throw new Error(formatDiagnostics(diags));
  }
}

function main(project: string, genDir?: string) {
  const basePath = path.join(process.cwd(), project);
  let diagnostics: ts.Diagnostic[] = [];

  // Allow a directory containing tsconfig.json as the project value
  if (fs.lstatSync(project).isDirectory()) {
    project = path.join(project, "tsconfig.json");
  }

  const {config, error} = ts.readConfigFile(project, f => fs.readFileSync(f, 'utf-8'));
  check([error]);

  let parsed =
      ts.parseJsonConfigFileContent(config, {readDirectory: ts.sys.readDirectory}, basePath);
  check(parsed.errors);

  genDir = genDir || parsed.options.outDir;
  if (!genDir) {
    throw new Error("compilerOptions must include outDir if --genDir not set");
  }


  const compilerHost = ts.createCompilerHost(parsed.options, true);
  let program = ts.createProgram(parsed.fileNames, parsed.options, compilerHost);
  check(program.getOptionsDiagnostics());

  if (!fs.existsSync(genDir)) fs.mkdirSync(genDir);
  fs.writeFileSync(path.join(genDir, "b.ts"), "export let a:string;", {encoding: 'utf-8'});

  program = ts.createProgram(parsed.fileNames, parsed.options, ts.createCompilerHost(parsed.options), program);
  check(program.getGlobalDiagnostics());

  for (let sf of program.getSourceFiles()) {
    diagnostics.push(...ts.getPreEmitDiagnostics(program, sf));
  }
  check(diagnostics);

  let failed = false;
  for (let sourceFile of program.getSourceFiles()) {
    let {diagnostics, emitSkipped} =
        program.emit(sourceFile);
    diagnostics.push(...diagnostics);
    failed = failed || emitSkipped;
  }
  check(diagnostics);
}

console.log(process.argv[2]);
console.log(process.argv[3]);
main(process.argv[2], process.argv[3]);