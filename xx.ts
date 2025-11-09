// file: gen-lodash-mcp.ts
import ts from "typescript";
import fs from "fs";

const moduleName = "lodash";
const tmpFile = `./tmp-${moduleName}.ts`;

// generate file sementara untuk memastikan simbol dapat di-resolve
fs.writeFileSync(
  tmpFile,
  `
  import * as _ from "${moduleName}";
  type LodashType = typeof _;
  export type { LodashType };
  `
);

// buat program TS yang bisa resolve definisi lodash
const program = ts.createProgram([tmpFile], {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2020,
  strict: true,
  esModuleInterop: true,
  skipLibCheck: true,
  allowSyntheticDefaultImports: true,
  moduleResolution: ts.ModuleResolutionKind.Node10,
  types: ["lodash"],
});

const checker = program.getTypeChecker();
const source = program.getSourceFile(tmpFile)!;

// ambil type alias LodashType
let lodashType: ts.Type | null = null;

ts.forEachChild(source, (node) => {
  if (ts.isTypeAliasDeclaration(node) && node.name.text === "LodashType") {
    lodashType = checker.getTypeFromTypeNode(node.type);
  }
});

if (!lodashType) {
  console.error("❌ Tidak menemukan tipe lodash");
  process.exit(1);
}

const props = checker.getPropertiesOfType(lodashType);
const results: any[] = [];

for (const prop of props) {
  const name = prop.getName();
  const propType = checker.getTypeOfSymbolAtLocation(prop, source);

  const callSignatures = propType.getCallSignatures();
  if (!callSignatures.length) continue; // skip non-function

  const sig = callSignatures[0] as ts.Signature;
  const params = sig.getParameters().map((p) => {
    const decl = p.getDeclarations()?.[0];
    return {
      name: p.getName(),
      type: checker.typeToString(
        checker.getTypeOfSymbolAtLocation(p, decl || source)
      ),
    };
  });

  const returnType = checker.typeToString(sig.getReturnType());

  results.push({
    name,
    type: "function",
    args: params,
    returns: returnType,
    description: `Lodash function ${name}`,
    "x-props": {
      module: moduleName,
      kind: "function",
      operationId: name,
    },
  });
}

fs.unlinkSync(tmpFile);
fs.writeFileSync(`lodash-mcp.json`, JSON.stringify(results, null, 2));

console.log(`✅ Generated ${results.length} lodash MCP tools`);
