import { Input } from "../../../components/ui/Input";
import type { JsonSchema, JsonSchemaProperty } from "../../../components/ui/ConfigForm";

/**
 * Schema fields that are shared dataset plumbing — never hyperparameters,
 * so the search-space editor skips them.
 */
const RESERVED_FIELDS = new Set([
  "dataset_path",
  "target_column",
  "feature_columns",
  "trainer_name",
]);

/**
 * Tunable hyperparameter fields for a trainer schema: every property
 * except the reserved dataset plumbing.
 */
export function tunableFields(schema: JsonSchema): Array<{
  name: string;
  prop: JsonSchemaProperty;
}> {
  const properties = schema.properties ?? {};
  return Object.entries(properties)
    .filter(([name]) => !RESERVED_FIELDS.has(name))
    .map(([name, prop]) => ({ name, prop: prop as JsonSchemaProperty }));
}

function resolveType(prop: JsonSchemaProperty): string | null {
  if (prop.type) return prop.type;
  if (Array.isArray(prop.anyOf)) {
    const nonNull = prop.anyOf.find((variant) => variant.type !== "null");
    return nonNull?.type ?? null;
  }
  return null;
}

function humanize(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Parse one comma-separated (or JSON, for array-typed fields) input into
 * a candidate value list. Returns the values or an error message.
 */
export function parseSearchValues(
  text: string,
  prop: JsonSchemaProperty,
): { values?: unknown[]; error?: string } {
  const type = resolveType(prop);

  // Array-typed fields (e.g. MLP hidden_dims: list[int]) take raw JSON —
  // comma-splitting cannot express nested lists.
  if (type === "array") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { error: "Enter a JSON array, e.g. [[128, 64], [256, 128]]" };
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { error: "Enter a non-empty JSON array of candidates" };
    }
    return { values: parsed };
  }

  const items = text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (items.length === 0) {
    return { error: "Enter at least one comma-separated value" };
  }

  const parseOne = (item: string): { value?: unknown; error?: string } => {
    if (prop.enum && !prop.enum.map(String).includes(item)) {
      return {
        error: `"${item}" is not one of: ${prop.enum.map(String).join(", ")}`,
      };
    }
    if (type === "integer") {
      const num = Number(item);
      if (!Number.isInteger(num)) return { error: `"${item}" is not an integer` };
      return { value: num };
    }
    if (type === "number") {
      const num = Number(item);
      if (!Number.isFinite(num)) return { error: `"${item}" is not a number` };
      return { value: num };
    }
    if (type === "boolean") {
      const lower = item.toLowerCase();
      if (lower === "true") return { value: true };
      if (lower === "false") return { value: false };
      return { error: `"${item}" must be true or false` };
    }
    return { value: item };
  };

  const values: unknown[] = [];
  for (const item of items) {
    const parsed = parseOne(item);
    if (parsed.error) return { error: parsed.error };
    values.push(parsed.value);
  }
  return { values };
}

/**
 * Validate every tunable field's raw text. Returns per-field error
 * messages (empty object when the whole space is valid).
 */
export function getSearchSpaceErrors(
  values: Record<string, string>,
  schema: JsonSchema,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const { name, prop } of tunableFields(schema)) {
    const { error } = parseSearchValues(values[name] ?? "", prop);
    if (error) errors[name] = error;
  }
  return errors;
}

/**
 * Build the API search_space payload from raw field text.
 * Returns undefined when any field is invalid (see getSearchSpaceErrors).
 */
export function buildSearchSpace(
  values: Record<string, string>,
  schema: JsonSchema,
): Record<string, unknown[]> | undefined {
  const space: Record<string, unknown[]> = {};
  for (const { name, prop } of tunableFields(schema)) {
    const { values: parsed, error } = parseSearchValues(values[name] ?? "", prop);
    if (error || !parsed) return undefined;
    space[name] = parsed;
  }
  return space;
}

interface SearchSpaceEditorProps {
  schema: JsonSchema;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

/**
 * Search-space editor: one input per tunable hyperparameter where each
 * input holds a candidate list (comma-separated, or JSON for array-typed
 * fields). Presentational — the parent owns the raw text state.
 */
export function SearchSpaceEditor({
  schema,
  values,
  onChange,
}: SearchSpaceEditorProps): React.ReactElement {
  const fields = tunableFields(schema);
  const errors = getSearchSpaceErrors(values, schema);

  if (fields.length === 0) {
    return <></>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {fields.map(({ name, prop }) => {
        const label = prop.title ?? humanize(name);
        const type = resolveType(prop);
        const error = errors[name];
        return (
          <div
            key={name}
            style={{ display: "flex", flexDirection: "column", gap: "4px" }}
          >
            <Input
              label={label}
              required
              placeholder={
                type === "array"
                  ? 'JSON array, e.g. [[128, 64], [256, 128]]'
                  : "comma-separated values"
              }
              value={values[name] ?? ""}
              onChange={(e) => onChange(name, e.target.value)}
            />
            {error && (
              <span style={{ fontSize: "12px", color: "#dc2626" }}>{error}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
