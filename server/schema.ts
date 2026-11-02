// Normalizează un JSON Schema (generat cu z.toJSONSchema) într-o formă acceptată
// de structured outputs la Claude și Gemini:
//  - oneOf → anyOf, const → enum
//  - scoate constrângerile pe care furnizorii nu le acceptă (min/max, pattern...).
//    Validarea completă rămâne în browser, cu Zod.
//  - obiectele primesc additionalProperties: false

const DROP = new Set([
  "$schema",
  "$id",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minLength",
  "maxLength",
  "pattern",
  "format",
  "minItems",
  "maxItems",
  "uniqueItems",
  "default",
]);

type Json = unknown;

export function normalizeSchema(node: Json): Json {
  if (Array.isArray(node)) return node.map(normalizeSchema);
  if (!node || typeof node !== "object") return node;

  const out: Record<string, Json> = {};
  for (const [key, value] of Object.entries(node as Record<string, Json>)) {
    if (DROP.has(key)) continue;
    if (key === "oneOf") {
      out.anyOf = normalizeSchema(value);
    } else if (key === "const") {
      out.enum = [value];
    } else if (key === "properties" || key === "$defs" || key === "definitions") {
      out[key] = Object.fromEntries(
        Object.entries(value as Record<string, Json>).map(([k, v]) => [k, normalizeSchema(v)]),
      );
    } else {
      out[key] = normalizeSchema(value);
    }
  }
  if (out.type === "object" && out.properties && out.additionalProperties === undefined) {
    out.additionalProperties = false;
  }
  return out;
}

/** Generează date plauzibile dintr-o schemă (folosit de furnizorul mock). */
export function fakeFromSchema(schema: Json, root: Json = schema, depth = 0, key = "text"): Json {
  if (!schema || typeof schema !== "object" || depth > 8) return null;
  const s = schema as Record<string, Json>;
  if (typeof s.$ref === "string") {
    const path = s.$ref.replace(/^#\//, "").split("/");
    let target: Json = root;
    for (const p of path) target = (target as Record<string, Json>)?.[p];
    return fakeFromSchema(target, root, depth + 1, key);
  }
  if (Array.isArray(s.enum)) return s.enum[0];
  if ("const" in s) return s.const;
  const variants = (s.anyOf ?? s.oneOf) as Json[] | undefined;
  if (Array.isArray(variants)) return fakeFromSchema(variants[0], root, depth + 1, key);
  const type = Array.isArray(s.type) ? s.type.find((t) => t !== "null") : s.type;
  switch (type) {
    case "object": {
      const props = (s.properties ?? {}) as Record<string, Json>;
      return Object.fromEntries(
        Object.entries(props).map(([k, v]) => [k, fakeFromSchema(v, root, depth + 1, k)]),
      );
    }
    case "array":
      return [fakeFromSchema(s.items, root, depth + 1, key)];
    case "string":
      return `(demo) ${key}`;
    case "number":
      return typeof s.minimum === "number" ? s.minimum : 42;
    case "integer":
      return typeof s.minimum === "number" ? s.minimum : 1;
    case "boolean":
      return true;
    default:
      return null;
  }
}
