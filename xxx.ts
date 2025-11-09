// file: gen-mcp.ts
import ts from "typescript";
import fs from "fs";
import path from "path";

const pkgs = process.argv.slice(2);
if (!pkgs.length) {
  console.error("❌ Usage: bun run gen-mcp.ts <package-name> [more-packages...]");
  process.exit(1);
}

for (const pkg of pkgs) {
  console.log(`\n🔍 Generating MCP JSON for: ${pkg} ...`);

  const tmpFile = path.resolve(`./tmp-${pkg}.ts`);
  fs.writeFileSync(
    tmpFile,
    `
    import * as Pkg from "${pkg}";
    type TargetType = typeof Pkg;
    export type { TargetType };
    `
  );

  const program = ts.createProgram([tmpFile], {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    allowSyntheticDefaultImports: true,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    types: [pkg],
  });

  const checker = program.getTypeChecker();
  const source = program.getSourceFile(tmpFile)!;
  let targetType: ts.Type | null = null;

  ts.forEachChild(source, (node) => {
    if (ts.isTypeAliasDeclaration(node) && node.name.text === "TargetType") {
      targetType = checker.getTypeFromTypeNode(node.type);
    }
  });

  if (!targetType) {
    console.error(`❌ Tidak menemukan tipe untuk ${pkg}`);
    fs.unlinkSync(tmpFile);
    continue;
  }

  const props = checker.getPropertiesOfType(targetType);
  const results: any[] = [];

  for (const prop of props) {
    const name = prop.getName();
    const propType = checker.getTypeOfSymbolAtLocation(prop, source);

    // === Jika fungsi ===
    const callSignatures = propType.getCallSignatures();
    if (callSignatures.length) {
      const sig = callSignatures[0] as ts.Signature;
      const params = sig.getParameters().map((p, i) => {
        const decl = p.getDeclarations()?.[0] as ts.ParameterDeclaration | undefined;
        const paramType = checker.getTypeOfSymbolAtLocation(p, decl || source);

        const isOptional =
          !!(decl && (decl.questionToken || decl.initializer)) ||
          (decl && ts.isParameter(decl) && !!decl.dotDotDotToken); // cek rest parameter

        return {
          name: p.getName(),
          type: checker.typeToString(paramType),
          optional: isOptional,
        };
      });

      const returnType = checker.typeToString(sig.getReturnType());

      results.push({
        name,
        type: "function",
        args: params,
        returns: returnType,
        description: `${pkg} function ${name}`,
        "x-props": {
          module: pkg,
          kind: "function",
          operationId: name,
        },
      });
      continue;
    }

    // === Jika class ===
    const symbolDecls = prop.getDeclarations() ?? [];
    for (const decl of symbolDecls) {
      if (ts.isClassDeclaration(decl) || ts.isClassExpression(decl)) {
        const classType = checker.getTypeAtLocation(decl);
        const classMethods = classType
          .getProperties()
          .filter((p) =>
            checker.getTypeOfSymbolAtLocation(p, decl).getCallSignatures().length
          );

        const methods = classMethods.map((m) => {
          const sig = checker
            .getTypeOfSymbolAtLocation(m, decl)
            .getCallSignatures()[0] as ts.Signature;

          const params = sig.getParameters().map((p) => {
            const d = p.getDeclarations()?.[0] as ts.ParameterDeclaration | undefined;
            const t = checker.getTypeOfSymbolAtLocation(p, d || decl);
            return {
              name: p.getName(),
              type: checker.typeToString(t),
              optional: !!(d && (d.questionToken || d.initializer || d.dotDotDotToken)),
            };
          });

          const returnType = checker.typeToString(sig.getReturnType());
          return { name: m.getName(), params, returns: returnType };
        });

        results.push({
          name,
          type: "class",
          methods,
          description: `${pkg} class ${name}`,
          "x-props": {
            module: pkg,
            kind: "class",
            operationId: name,
          },
        });
      }
    }
  }

  fs.unlinkSync(tmpFile);
  const outFile = `${pkg}-mcp.json`;
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
  console.log(`✅ Generated ${results.length} entries → ${outFile}`);
}

console.log("\n🎉 Done! Ready to use in MCP tools.");
