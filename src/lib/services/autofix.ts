import ZAI from 'z-ai-web-dev-sdk';

interface FixResult {
  fixed: boolean;
  level: number;
  output: string;
  fixesApplied: string[];
}

// Level 1: Common error patterns
const ERROR_PATTERNS: { pattern: RegExp; replacement: string; description: string }[] = [
  { pattern: /```(\w+)\n\s*\n/g, replacement: '```$1\n', description: 'Remove empty line after code fence opening' },
  { pattern: /\n\s*\n```/g, replacement: '\n```', description: 'Remove empty line before code fence closing' },
  { pattern: /import\s+\{\s*\}\s+from/g, replacement: 'import {} from', description: 'Fix empty import' },
  { pattern: /const\s+(\w+)\s*=\s*\1\s*;/g, replacement: '', description: 'Remove self-assignment' },
  { pattern: /function\s+(\w+)\s*\(\s*\)\s*\{\s*\}/g, replacement: 'function $1() { /* TODO */ }', description: 'Empty function body' },
  { pattern: /console\.log\([^)]*\);?\n?/g, replacement: '', description: 'Remove console.log statements' },
  { pattern: /\bvar\b/g, replacement: 'const', description: 'Replace var with const' },
  { pattern: /==\s*(?!=)/g, replacement: '===', description: 'Use strict equality' },
  { pattern: /!=\s*(?==)/g, replacement: '!==', description: 'Use strict inequality' },
  { pattern: /\{\s*\n\s*\n/g, replacement: '{\n', description: 'Remove extra blank line after opening brace' },
  { pattern: /\n\s*\n\s*\}/g, replacement: '\n}', description: 'Remove extra blank line before closing brace' },
  { pattern: /\bundefined\s*=\s*/g, replacement: '/* invalid */ ', description: 'Flag assignment to undefined' },
  { pattern: /,\s*,/g, replacement: ',', description: 'Remove double commas' },
  { pattern: /\[\s*,/g, replacement: '[', description: 'Remove leading comma in array' },
  { pattern: /,\s*\]/g, replacement: ']', description: 'Remove trailing comma at array end' },
  { pattern: /\{\s*,/g, replacement: '{', description: 'Remove leading comma in object' },
  { pattern: /;\s*;/g, replacement: ';', description: 'Remove double semicolons' },
  { pattern: /\bNaN\b\s*===\s*\bNaN\b/g, replacement: 'Number.isNaN(NaN)', description: 'Fix NaN comparison' },
  { pattern: /typeof\s+\w+\s*===?\s*["']undefined["']/g, replacement: 'typeof variable === "undefined"', description: 'Fix typeof check' },
  { pattern: /\.length\s*>\s*0/g, replacement: '.length > 0', description: 'Normalize length check' },
  { pattern: /return\s+undefined\s*;/g, replacement: 'return;', description: 'Simplify undefined return' },
];

class AutoFixEngine {
  /**
   * Level 1: Pattern-based fixes
   */
  level1_patternFix(input: string): { output: string; fixesApplied: string[] } {
    let output = input;
    const fixesApplied: string[] = [];

    for (const { pattern, replacement, description } of ERROR_PATTERNS) {
      const before = output;
      output = output.replace(pattern, replacement);
      if (output !== before) {
        fixesApplied.push(description);
      }
    }

    return { output, fixesApplied };
  }

  /**
   * Level 2: AST-based structural analysis
   */
  level2_astAnalysis(input: string): { output: string; fixesApplied: string[] } {
    const fixesApplied: string[] = [];
    let output = input;

    // Check for unbalanced braces
    const openBraces = (output.match(/\{/g) || []).length;
    const closeBraces = (output.match(/\}/g) || []).length;
    if (openBraces > closeBraces) {
      output += '\n' + '}'.repeat(openBraces - closeBraces);
      fixesApplied.push('Added missing closing braces');
    }

    // Check for unbalanced brackets
    const openBrackets = (output.match(/\[/g) || []).length;
    const closeBrackets = (output.match(/\]/g) || []).length;
    if (openBrackets > closeBrackets) {
      output += ']'.repeat(openBrackets - closeBrackets);
      fixesApplied.push('Added missing closing brackets');
    }

    // Check for unbalanced parentheses
    const openParens = (output.match(/\(/g) || []).length;
    const closeParens = (output.match(/\)/g) || []).length;
    if (openParens > closeParens) {
      output += ')'.repeat(openParens - closeParens);
      fixesApplied.push('Added missing closing parentheses');
    }

    // Check for unclosed code fences
    const codeFenceOpens = (output.match(/```/g) || []).length;
    if (codeFenceOpens % 2 !== 0) {
      output += '\n```';
      fixesApplied.push('Closed unclosed code fence');
    }

    // Check for unclosed string templates
    const backtickOpens = (output.match(/`/g) || []).length;
    if (backtickOpens % 2 !== 0) {
      output += '`';
      fixesApplied.push('Closed unclosed template literal');
    }

    return { output, fixesApplied };
  }

  /**
   * Level 3: LLM-based correction
   */
  async level3_llmFix(input: string, prompt: string): Promise<{ output: string; fixesApplied: string[] }> {
    const fixPrompt = `You are an expert code and content fixer. The following output was generated but has quality issues. Fix any errors, inconsistencies, or problems while preserving the intent.

ORIGINAL REQUEST:
${prompt}

OUTPUT TO FIX:
${input}

Provide the corrected version. Only output the fixed content, nothing else.`;

    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are an expert fixer. Output only the corrected content.' },
          { role: 'user', content: fixPrompt },
        ],
      });

      const fixed = completion.choices[0]?.message?.content || input;
      return {
        output: fixed,
        fixesApplied: fixed !== input ? ['LLM-based corrections applied'] : [],
      };
    } catch {
      return { output: input, fixesApplied: [] };
    }
  }

  /**
   * Run the full 3-level auto-fix cascade
   */
  async autoFix(input: string, prompt: string): Promise<FixResult> {
    // Level 1: Pattern-based
    const l1 = this.level1_patternFix(input);
    if (l1.fixesApplied.length > 0) {
      return {
        fixed: true,
        level: 1,
        output: l1.output,
        fixesApplied: l1.fixesApplied,
      };
    }

    // Level 2: AST-based
    const l2 = this.level2_astAnalysis(l1.output);
    if (l2.fixesApplied.length > 0) {
      return {
        fixed: true,
        level: 2,
        output: l2.output,
        fixesApplied: l2.fixesApplied,
      };
    }

    // Level 3: Only if the output seems problematic (has obvious issues)
    // For performance, we skip L3 unless there are clear structural issues
    if (this.hasObviousIssues(l2.output)) {
      const l3 = await this.level3_llmFix(l2.output, prompt);
      if (l3.fixesApplied.length > 0) {
        return {
          fixed: true,
          level: 3,
          output: l3.output,
          fixesApplied: l3.fixesApplied,
        };
      }
    }

    return {
      fixed: false,
      level: 0,
      output: l2.output,
      fixesApplied: [],
    };
  }

  private hasObviousIssues(text: string): boolean {
    // Check for common signs of problematic output
    const issues = [
      /ERROR:/i,
      /undefined is not a function/i,
      /Cannot read propert/i,
      /SyntaxError/i,
      /TODO:/i,
      /FIXME:/i,
      /PLACEHOLDER/i,
    ];
    return issues.some(pattern => pattern.test(text));
  }
}

export const autoFixEngine = new AutoFixEngine();
