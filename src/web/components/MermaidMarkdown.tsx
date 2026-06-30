import { useEffect, useRef } from "react";
import MDEditor from "@uiw/react-md-editor";
import { renderMermaidIn } from "../utils/mermaid";

interface Props {
	source: string;
}

const URI_AUTOLINK_PREFIX_REGEX = /^<[A-Za-z][A-Za-z0-9+.-]{1,31}:[^<>\u0000-\u0020]*>/;
const EMAIL_AUTOLINK_PREFIX_REGEX = /^<[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z0-9-]+>/;

// Treat single newlines as hard line breaks (like GitHub issues / Slack), so
// ticket text written one sentence per line is not collapsed into one block.
// Dependency-free remark (mdast) plugin: split `text` nodes on newlines into
// `break` nodes. Non-text nodes (code, inlineCode, table cells) are untouched.
function remarkHardBreaks() {
	const transform = (node: any) => {
		if (!node || !Array.isArray(node.children)) return;
		const out: any[] = [];
		for (const child of node.children) {
			if (child && child.type === "text" && typeof child.value === "string" && /\r\n|\r|\n/.test(child.value)) {
				const parts = child.value.split(/\r\n|\r|\n/);
				parts.forEach((part: string, i: number) => {
					if (i > 0) out.push({ type: "break" });
					if (part.length > 0) out.push({ type: "text", value: part });
				});
			} else {
				transform(child);
				out.push(child);
			}
		}
		node.children = out;
	};
	return (tree: any) => transform(tree);
}

function sanitizeMarkdownSource(source: string): string {
	return source.replace(/<(?=[A-Za-z])/g, (match, offset, fullText) => {
		const remaining = fullText.slice(offset);
		if (URI_AUTOLINK_PREFIX_REGEX.test(remaining) || EMAIL_AUTOLINK_PREFIX_REGEX.test(remaining)) {
			return match;
		}
		return "&lt;";
	});
}

export default function MermaidMarkdown({ source }: Props) {
	const ref = useRef<HTMLDivElement | null>(null);
	const safeSource = sanitizeMarkdownSource(source);

	useEffect(() => {
		if (!ref.current) return;

		// Render mermaid diagrams after the markdown has been rendered
		// Use requestAnimationFrame to ensure MDEditor has finished rendering
		const frameId = requestAnimationFrame(() => {
			if (ref.current) {
				void renderMermaidIn(ref.current);
			}
		});

		return () => cancelAnimationFrame(frameId);
	}, [safeSource]);

	return (
		<div ref={ref} className="wmde-markdown">
			<MDEditor.Markdown source={safeSource} remarkPlugins={[remarkHardBreaks]} />
		</div>
	);
}
