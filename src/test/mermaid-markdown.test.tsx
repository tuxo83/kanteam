import { afterEach, describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";
import { renderToString } from "react-dom/server";
import MermaidMarkdown from "../web/components/MermaidMarkdown.tsx";

afterEach(() => {
	delete (globalThis as { window?: Window & typeof globalThis }).window;
	delete (globalThis as { document?: Document }).document;
	delete (globalThis as { navigator?: Navigator }).navigator;
});

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

	it("keeps hash-only markdown links on the current route when a base href is present", () => {
		const dom = new JSDOM("<!doctype html><html><head><base href='/'></head><body></body></html>", {
			url: "http://localhost/tasks/BACK-426?view=detail",
		});
		globalThis.window = dom.window as unknown as Window & typeof globalThis;
		globalThis.document = dom.window.document as Document;
		globalThis.navigator = dom.window.navigator as Navigator;

		const source = "# First Heading\n\n[First](#first-heading) [Second](#second-heading)\n\n## Second Heading";
		const html = renderToString(<MermaidMarkdown source={source} />);
		const renderedDocument = new JSDOM(html).window.document;
		const links = Array.from(renderedDocument.querySelectorAll("p a")).map((link) => link.getAttribute("href"));

		expect(renderedDocument.querySelector("#first-heading")).toBeTruthy();
		expect(renderedDocument.querySelector("#second-heading")).toBeTruthy();
		expect(links).toEqual([
			"/tasks/BACK-426?view=detail#first-heading",
			"/tasks/BACK-426?view=detail#second-heading",
		]);
	});
});
