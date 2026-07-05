import { useCallback, useEffect, useRef, useState } from "react";
import MDEditor from "@uiw/react-md-editor";
import { rehypeMathPlugins, remarkMathPlugins } from "../lib/markdown-math";
import { renderMermaidIn } from "../utils/mermaid";
// KaTeX stylesheet is bundled (fonts are inlined as data URIs at build time) so math
// renders fully offline, without any CDN request.
import "katex/dist/katex.min.css";

interface Props {
	source: string;
}

interface LightboxImage {
	src: string;
	alt: string;
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
	const closeButtonRef = useRef<HTMLButtonElement | null>(null);
	const safeSource = sanitizeMarkdownSource(source);
	const [lightbox, setLightbox] = useState<LightboxImage | null>(null);

	const closeLightbox = useCallback(() => setLightbox(null), []);

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

	// Close the lightbox on Escape and move focus to the close button when it opens.
	useEffect(() => {
		if (!lightbox) return;
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.stopPropagation();
				closeLightbox();
			}
		};
		document.addEventListener("keydown", handleKeyDown, true);
		closeButtonRef.current?.focus();
		return () => document.removeEventListener("keydown", handleKeyDown, true);
	}, [lightbox, closeLightbox]);

	// Override the markdown image renderer so attached images can be opened in a
	// lightbox. Mermaid diagrams are rendered as inline SVG (not <img>), so they
	// are unaffected.
	const markdownComponents = {
		img: ({ src, alt, ...rest }: React.ImgHTMLAttributes<HTMLImageElement>) => {
			const resolvedSrc = typeof src === "string" ? src : "";
			const resolvedAlt = alt ?? "";
			return (
				// biome-ignore lint/a11y/useKeyWithClickEvents: keyboard users can open the full image via the rendered link/markup; the click handler is a progressive enhancement for pointer users.
				<img
					{...rest}
					src={resolvedSrc}
					alt={resolvedAlt}
					className="bl-markdown-img"
					onClick={() => {
						if (resolvedSrc) setLightbox({ src: resolvedSrc, alt: resolvedAlt });
					}}
				/>
			);
		},
	};

	return (
		<div ref={ref} className="wmde-markdown">
			<MDEditor.Markdown
				source={safeSource}
				components={markdownComponents}
				remarkPlugins={[remarkHardBreaks, ...remarkMathPlugins]}
				rehypePlugins={rehypeMathPlugins}
			/>
			{lightbox && (
				<div
					className="bl-lightbox-overlay"
					role="dialog"
					aria-modal="true"
					aria-label={lightbox.alt || "Image preview"}
					onClick={closeLightbox}
				>
					<button
						type="button"
						ref={closeButtonRef}
						className="bl-lightbox-close"
						aria-label="Close image preview"
						onClick={closeLightbox}
					>
						×
					</button>
					<img
						className="bl-lightbox-img"
						src={lightbox.src}
						alt={lightbox.alt}
						onClick={(event) => event.stopPropagation()}
					/>
				</div>
			)}
		</div>
	);
}
