// src/lib/ruleEngine.ts
// Robust rule engine for EQL/KQL-like syntax
// Handles: wildcards, nested parentheses, OR/AND/NOT, field:value patterns

const SNAKE_MAP: Record<string, string> = {
  "user.name": "user_name",
  "host.name": "host_name",
  "process.name": "process_name",
  "process.executable": "process_executable",
  "process.command_line": "process_command_line",
  "process.parent.name": "process_parent_name",
  "process.pid": "process_pid",
  "process.args": "process_args",
  "process.args_count": "process_args_count",
  "agent.name": "agent_name",
  "event.type": "event_type",
  "event.action": "event_type", // alias
  "event.id": "event_id",
  "host.ip": "host_ip",
  "source.ip": "source_ip",
  "destination.ip": "destination_ip",
  "user.id": "user_id",
  "file.extension": "file_extension",
  "timestamp": "ts",
};

// ============================================================================
// FIELD ACCESS
// ============================================================================
export function getField(row: Record<string, any>, path: string): string {
  // Normalize common aliases
  if (path === "event.action") path = "event.type";

  // Try dot notation first
  const valDot = path.split(".").reduce<any>(
    (acc, k) => (acc != null ? acc[k] : undefined),
    row
  );
  if (valDot != null) return String(valDot);

  // Try snake_case mapping
  const snake = SNAKE_MAP[path] ?? path.replace(/\./g, "_");
  const valSnake = row[snake];
  if (valSnake != null) return String(valSnake);

  return "";
}

// ============================================================================
// WILDCARD MATCHING
// ============================================================================
export function wcMatch(value: string, pattern: string): boolean {
  // Clean up value and pattern
  value = String(value ?? "").replace(/^"+|"+$/g, "").trim();
  pattern = String(pattern ?? "").replace(/^"+|"+$/g, "").trim();

  if (!pattern) return false;

  // Escape regex special chars EXCEPT *, then convert * to .*
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");

  const re = new RegExp(`^${escaped}$`, "i");
  return re.test(value);
}

// ============================================================================
// TOKENIZER - Converts rule string into tokens
// ============================================================================
type Token =
  | { type: "FIELD"; value: string }
  | { type: "COLON" }
  | { type: "LPAREN" }
  | { type: "RPAREN" }
  | { type: "AND" }
  | { type: "OR" }
  | { type: "NOT" }
  | { type: "VALUE"; value: string };

function tokenize(input: string): Token[] {
  // Pre-process: fix common syntax issues in rules
  let s = input
    .replace(/[\u201C\u201D]/g, '"')  // smart double quotes
    .replace(/[\u2018\u2019]/g, "'")  // smart single quotes
    .replace(/\r\n/g, " ")
    .replace(/\n/g, " ");

  // Fix "or*pattern" -> "or *pattern" (missing space after or/and/not)
  s = s.replace(/\b(or|and|not)(\*)/gi, "$1 $2");

  // Fix patterns like "field:* -decode *" -> "field:*-decode*"
  // The pattern ":* text *" should become ":*text*"
  // This handles cases where wildcard patterns have spaces inside them
  s = s.replace(/:\s*\*\s+([^*\s()"']+)\s+\*/g, ":*$1*");

  // Also handle ":* text*" -> ":*text*"  
  s = s.replace(/:\s*\*\s+([^*\s()"']+\*)/g, ":*$1");

  // And "*text *" at the end
  s = s.replace(/:\s*(\*[^*\s()"']+)\s+\*/g, ":$1*");

  // Normalize multiple spaces
  s = s.replace(/\s+/g, " ").trim();

  const tokens: Token[] = [];
  let i = 0;

  while (i < s.length) {
    // Skip whitespace
    if (/\s/.test(s[i])) {
      i++;
      continue;
    }

    // Parentheses
    if (s[i] === "(") {
      tokens.push({ type: "LPAREN" });
      i++;
      continue;
    }
    if (s[i] === ")") {
      tokens.push({ type: "RPAREN" });
      i++;
      continue;
    }

    // Check for logical operators (case-insensitive, word boundary)
    const remaining = s.slice(i);

    const andMatch = remaining.match(/^and(?=\s|\(|$)/i);
    if (andMatch) {
      tokens.push({ type: "AND" });
      i += 3;
      continue;
    }

    const orMatch = remaining.match(/^or(?=\s|\(|$)/i);
    if (orMatch) {
      tokens.push({ type: "OR" });
      i += 2;
      continue;
    }

    const notMatch = remaining.match(/^not(?=\s|\(|$)/i);
    if (notMatch) {
      tokens.push({ type: "NOT" });
      i += 3;
      continue;
    }

    // Quoted string (value)
    if (s[i] === '"' || s[i] === "'") {
      const quote = s[i];
      let j = i + 1;
      while (j < s.length && s[j] !== quote) {
        if (s[j] === "\\" && j + 1 < s.length) j++; // skip escaped char
        j++;
      }
      const val = s.slice(i + 1, j);
      tokens.push({ type: "VALUE", value: val });
      i = j + 1;
      continue;
    }

    // Field name followed by colon, OR bare value/pattern
    // Match: field.name: or field_name: or just a bare value like *pattern*
    const fieldMatch = remaining.match(/^([a-zA-Z_][a-zA-Z0-9_.]*)\s*:/);
    if (fieldMatch) {
      tokens.push({ type: "FIELD", value: fieldMatch[1] });
      tokens.push({ type: "COLON" });
      i += fieldMatch[0].length;
      continue;
    }

    // Bare value (unquoted pattern like *bitsadmin* or -decode)
    // Also handles wildcard groups with spaces: *Program Files*
    // If it starts with '*', grab until the next '*'
    if (s[i] === "*") {
      let j = i + 1;
      while (j < s.length && s[j] !== "*") j++;
      if (j < s.length && s[j] === "*") {
        const val = s.slice(i, j + 1);
        tokens.push({ type: "VALUE", value: val });
        i = j + 1;
        continue;
      }
    }

    // Fallback: bare token without spaces
    let j = i;
    while (j < s.length) {
      const rest = s.slice(j);
      if (/^\s/.test(rest) || rest[0] === "(" || rest[0] === ")") break;
      if (/^(and|or|not)(\s|\(|$)/i.test(rest)) break;
      if (/^[a-zA-Z_][a-zA-Z0-9_.]*\s*:/.test(rest) && !/^https?:/i.test(rest) && !/^ftps?:/i.test(rest)) break;
      j++;
    }

    if (j > i) {
      const val = s.slice(i, j).trim();
      if (val) {
        tokens.push({ type: "VALUE", value: val });
      }
      i = j;
      continue;
    }


    // Unknown character, skip
    i++;
  }

  return tokens;
}

// ============================================================================
// PARSER - Converts tokens into an AST
// ============================================================================
type ASTNode =
  | { type: "match"; field: string; pattern: string }
  | { type: "and"; left: ASTNode; right: ASTNode }
  | { type: "or"; left: ASTNode; right: ASTNode }
  | { type: "not"; child: ASTNode }
  | { type: "true" }  // fallback for empty/invalid
  | { type: "false" }; // fallback for invalid

class Parser {
  private tokens: Token[];
  private pos: number = 0;
  private lastField: string | null = null; // Track context for bare values

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): ASTNode {
    if (this.tokens.length === 0) {
      return { type: "false" };
    }
    try {
      const result = this.parseOr();
      return result;
    } catch (e) {
      console.warn("Parse error:", e);
      return { type: "false" };
    }
  }

  private peek(): Token | null {
    return this.tokens[this.pos] ?? null;
  }

  private consume(): Token | null {
    return this.tokens[this.pos++] ?? null;
  }

  private parseOr(): ASTNode {
    let left = this.parseAnd();

    while (this.peek()?.type === "OR") {
      this.consume(); // eat OR
      const right = this.parseAnd();
      left = { type: "or", left, right };
    }

    return left;
  }

  private parseAnd(): ASTNode {
    let left = this.parseNot();

    while (this.peek()?.type === "AND") {
      this.consume(); // eat AND
      const right = this.parseNot();
      left = { type: "and", left, right };
    }

    // Handle implicit AND (two terms next to each other without operator)
    while (
      this.peek() &&
      this.peek()?.type !== "OR" &&
      this.peek()?.type !== "RPAREN"
    ) {
      // Check if next thing looks like start of a new term
      const next = this.peek();
      if (
        next?.type === "FIELD" ||
        next?.type === "LPAREN" ||
        next?.type === "NOT" ||
        next?.type === "VALUE"
      ) {
        const right = this.parseNot();
        left = { type: "and", left, right };
      } else {
        break;
      }
    }

    return left;
  }

  private parseNot(): ASTNode {
    if (this.peek()?.type === "NOT") {
      this.consume(); // eat NOT
      const child = this.parseNot();
      return { type: "not", child };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode {
    const token = this.peek();

    if (!token) {
      return { type: "false" };
    }

    // Parenthesized expression
    if (token.type === "LPAREN") {
      this.consume(); // eat (
      const inner = this.parseOr();
      if (this.peek()?.type === "RPAREN") {
        this.consume(); // eat )
      }
      return inner;
    }

    // Field : value(s)
    if (token.type === "FIELD") {
      this.consume(); // eat FIELD
      const field = token.value;
      this.lastField = field; // remember for context

      // Expect COLON
      if (this.peek()?.type === "COLON") {
        this.consume(); // eat :
      }

      // Now parse the value(s)
      return this.parseFieldValues(field);
    }

    // Bare VALUE (use last field as context, or skip)
    if (token.type === "VALUE") {
      this.consume();
      if (this.lastField) {
        return { type: "match", field: this.lastField, pattern: token.value };
      }
      // No context field - this is likely an error in the rule, skip
      return { type: "false" };
    }

    // Unexpected token, skip
    this.consume();
    return { type: "false" };
  }

  private parseFieldValues(field: string): ASTNode {
    const token = this.peek();

    // Parenthesized list of values: field : (val1 or val2 and val3)
    if (token?.type === "LPAREN") {
      this.consume(); // eat (

      // Parse values with OR/AND inside parens
      let result = this.parseValueListOr(field);

      if (this.peek()?.type === "RPAREN") {
        this.consume(); // eat )
      }

      return result;
    }

    // Single value
    if (token?.type === "VALUE") {
      this.consume();
      return { type: "match", field, pattern: token.value };
    }

    // No value found
    return { type: "false" };
  }

  private parseValueListOr(field: string): ASTNode {
    let left = this.parseValueListAnd(field);

    while (this.peek()?.type === "OR") {
      this.consume(); // eat OR
      const right = this.parseValueListAnd(field);
      left = { type: "or", left, right };
    }

    return left;
  }

  private parseValueListAnd(field: string): ASTNode {
    let left = this.parseValueListPrimary(field);

    while (this.peek()?.type === "AND") {
      this.consume(); // eat AND
      const right = this.parseValueListPrimary(field);
      left = { type: "and", left, right };
    }

    return left;
  }

  private parseValueListPrimary(field: string): ASTNode {
    const token = this.peek();

    if (token?.type === "VALUE") {
      this.consume();
      return { type: "match", field, pattern: token.value };
    }

    if (token?.type === "LPAREN") {
      this.consume();
      const inner = this.parseValueListOr(field);
      if (this.peek()?.type === "RPAREN") {
        this.consume();
      }
      return inner;
    }

    // Might be a field:value inside the parens (shouldn't happen often)
    if (token?.type === "FIELD") {
      // Actually this is a new field comparison, parse it as such
      return this.parsePrimary();
    }

    return { type: "false" };
  }
}

// ============================================================================
// AST EVALUATOR - Converts AST to a predicate function
// ============================================================================
function evaluateAST(ast: ASTNode, row: Record<string, any>): boolean {
  switch (ast.type) {
    case "true":
      return true;
    case "false":
      return false;
    case "match":
      return wcMatch(getField(row, ast.field), ast.pattern);
    case "and":
      return evaluateAST(ast.left, row) && evaluateAST(ast.right, row);
    case "or":
      return evaluateAST(ast.left, row) || evaluateAST(ast.right, row);
    case "not":
      return !evaluateAST(ast.child, row);
    default:
      return false;
  }
}

// ============================================================================
// MAIN EXPORT - buildPredicate
// ============================================================================
export function buildPredicate(raw: string): (row: Record<string, any>) => boolean {
  try {
    // Handle empty or whitespace-only rules
    if (!raw || !raw.trim()) {
      return () => false;
    }

    const tokens = tokenize(raw);

    if (tokens.length === 0) {
      return () => false;
    }

    const parser = new Parser(tokens);
    const ast = parser.parse();

    // Debug: uncomment to see parsed AST
    // console.log("Rule:", raw.slice(0, 80) + "...");
    // console.log("AST:", JSON.stringify(ast, null, 2));

    return (row: Record<string, any>) => {
      try {
        return evaluateAST(ast, row);
      } catch (e) {
        console.warn("Rule evaluation error:", e, "for rule:", raw.slice(0, 100));
        return false;
      }
    };
  } catch (e) {
    console.warn("buildPredicate error:", e, "raw rule:", raw.slice(0, 100));
    return () => false;
  }
}

// ============================================================================
// UTILITY - For debugging, returns the AST without evaluating
// ============================================================================
export function parseRuleToAST(raw: string): ASTNode {
  const tokens = tokenize(raw);
  const parser = new Parser(tokens);
  return parser.parse();
}