import { describe, expect, it } from "bun:test";
import { renderToString } from "react-dom/server";
import MermaidMarkdown from "../web/components/MermaidMarkdown.tsx";

describe("MermaidMarkdown", () => {
	it("renders angle-bracket type strings without throwing", () => {
		const source =
			"Implemented contracts: getDishesByMenu(String menuId) -> Result<List<MenuItem>>";

		expect(() => renderToString(<MermaidMarkdown source={source} />)).not.toThrow();

		const html = renderToString(<MermaidMarkdown source={source} />);
		expect(html).toContain("Result&lt;List&lt;MenuItem&gt;&gt;");
	});

	it("keeps markdown rendering functional for normal content", () => {
		const source = "## Heading\n\nRegular **markdown** content.";
		const html = renderToString(<MermaidMarkdown source={source} />);

		expect(html).toContain("Heading");
		expect(html).toContain("<strong>markdown</strong>");
	});

	it("preserves non-http autolinks and email autolinks", () => {
		const source = "Links: <ftp://example.com/file> and <foo@example.com>";
		const html = renderToString(<MermaidMarkdown source={source} />);

		expect(html).toContain('href="ftp://example.com/file"');
		expect(html).toContain('href="mailto:foo@example.com"');
	});

	it("renders inline LaTeX math with KaTeX", () => {
		const source = "Speedup is $S = \\frac{1}{(1-p) + p/n}$ per Amdahl's law.";
		const html = renderToString(<MermaidMarkdown source={source} />);

		expect(html).toContain('class="katex"');
		// The raw LaTeX delimiters must not survive in the output.
		expect(html).not.toContain("$S =");
	});

	it("renders a single-line $$…$$ formula as a KaTeX display block", () => {
		const source = "$$S_{max} = \\frac{1}{1-p}$$";
		const html = renderToString(<MermaidMarkdown source={source} />);

		expect(html).toContain("katex-display");
	});

	it("renders a multi-line $$ block as a KaTeX display block", () => {
		const source = "Before\n\n$$\nS = \\frac{1}{1-p}\n$$\n\nAfter";
		const html = renderToString(<MermaidMarkdown source={source} />);

		expect(html).toContain("katex-display");
	});

	it("does not treat $ inside inline code as math", () => {
		const source = "Use `$HOME` and `$notmath$` verbatim.";
		const html = renderToString(<MermaidMarkdown source={source} />);

		expect(html).toContain("<code>$HOME</code>");
		expect(html).toContain("<code>$notmath$</code>");
		expect(html).not.toContain('class="katex"');
	});

	it("renders markdown images with the zoomable lightbox class", () => {
		const source = "![screenshot](attachments/TASK-1/img.png)";
		const html = renderToString(<MermaidMarkdown source={source} />);

		expect(html).toContain('src="attachments/TASK-1/img.png"');
		expect(html).toContain('alt="screenshot"');
		expect(html).toContain("bl-markdown-img");
	});

	it("turns single newlines into hard line breaks", () => {
		const source = "First line.\nSecond line.";
		const html = renderToString(<MermaidMarkdown source={source} />);

		const breakCount = (html.match(/<br[^>]*\/?>/g) || []).length;
		expect(breakCount).toBeGreaterThanOrEqual(1);
		expect(html).toContain("First line.");
		expect(html).toContain("Second line.");
	});

	it("does not inject line breaks inside fenced code blocks", () => {
		const source = "```js\nconst a = 1;\nconst b = 2;\n```";
		const html = renderToString(<MermaidMarkdown source={source} />);

		expect(html).toContain("<pre");
		expect(html).toContain("<code");
		// The code block keeps its newlines as a multi-line <pre>/<code>, no <br>.
		expect(html).not.toContain("<br");
		expect(html).toContain("const a = 1;");
		expect(html).toContain("const b = 2;");
	});
});
