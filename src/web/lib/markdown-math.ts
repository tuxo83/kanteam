import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import type { PluggableList } from "unified";

// Minimal mdast shapes touched by the display-math transform below. We avoid a
// hard dependency on `@types/mdast`/`unist-util-visit` and only describe the few
// fields we read and update.
interface MathAwareNode {
	type: string;
	position?: { start?: { offset?: number }; end?: { offset?: number } };
	data?: { hProperties?: Record<string, unknown> };
	children?: MathAwareNode[];
}

interface SourceFile {
	value?: unknown;
}

/**
 * `remark-math` only treats `$$…$$` as a display block when it spans multiple
 * lines; a single-line `$$…$$` is parsed as inline math. Authors (and GitHub)
 * routinely write a display formula as one `$$…$$` line in its own paragraph, so
 * promote that shape to KaTeX display mode by tagging the generated element with
 * the `math-display` class that `rehype-katex` looks for. Inline `$…$`, math in
 * the middle of a sentence and `$` inside code are left untouched.
 */
export function remarkDisplayMathOnOwnLine() {
	return (tree: MathAwareNode, file: SourceFile): void => {
		const source = typeof file.value === "string" ? file.value : "";

		const visit = (node: MathAwareNode): void => {
			if (node.type === "paragraph" && node.children?.length === 1) {
				const child = node.children[0];
				if (child?.type === "inlineMath") {
					const start = child.position?.start?.offset;
					const end = child.position?.end?.offset;
					if (typeof start === "number" && typeof end === "number") {
						const raw = source.slice(start, end);
						if (raw.startsWith("$$") && raw.endsWith("$$")) {
							if (!child.data) {
								child.data = {};
							}
							child.data.hProperties = {
								...child.data.hProperties,
								className: ["language-math", "math-display"],
							};
						}
					}
				}
			}

			if (node.children) {
				for (const child of node.children) {
					visit(child);
				}
			}
		};

		visit(tree);
	};
}

// Enable LaTeX math in Markdown: `$…$` inline and `$$…$$` block. These are merged
// with the Markdown editor's built-in remark/rehype plugins, so GFM, tables, code
// highlighting, images and links keep working. `remark-math` deliberately ignores
// `$` inside inline code and fenced code blocks.
export const remarkMathPlugins: PluggableList = [remarkMath, remarkDisplayMathOnOwnLine];
export const rehypeMathPlugins: PluggableList = [rehypeKatex];
