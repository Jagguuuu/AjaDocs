function escapeText(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/([*_`\[])/g, "\\$1");
}

function inline(node) {
  return Array.from(node.childNodes)
    .map((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        return escapeText(child.textContent);
      }
      if (child.nodeType !== Node.ELEMENT_NODE) {
        return "";
      }
      const tag = child.tagName.toLowerCase();
      const inner = inline(child);
      if (tag === "strong" || tag === "b") {
        return `**${inner}**`;
      }
      if (tag === "em" || tag === "i") {
        return `*${inner}*`;
      }
      if (tag === "u") {
        return `<u>${inner}</u>`;
      }
      if (tag === "br") {
        return "  \n";
      }
      if (tag === "code") {
        return `\`${child.textContent || ""}\``;
      }
      return inner;
    })
    .join("");
}

function convertList(listNode, ordered, depth = 0) {
  const items = Array.from(listNode.children).filter((child) => child.tagName.toLowerCase() === "li");
  return items
    .map((item, index) => {
      const indent = "  ".repeat(depth);
      const marker = ordered ? `${index + 1}. ` : "- ";
      let text = "";
      let nested = "";
      Array.from(item.childNodes).forEach((child) => {
        if (child.nodeType !== Node.ELEMENT_NODE) {
          if (child.nodeType === Node.TEXT_NODE) {
            text += escapeText(child.textContent);
          }
          return;
        }
        const tag = child.tagName.toLowerCase();
        if (tag === "ul") {
          nested += convertList(child, false, depth + 1);
        } else if (tag === "ol") {
          nested += convertList(child, true, depth + 1);
        } else if (tag === "p") {
          text += inline(child);
        } else {
          text += inline(child);
        }
      });
      return `${indent}${marker}${text.trim()}\n${nested}`;
    })
    .join("");
}

function convertBlocks(parent) {
  return Array.from(parent.childNodes)
    .map((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return "";
      }
      const tag = node.tagName.toLowerCase();
      if (tag === "h1") {
        return `# ${inline(node).trim()}\n\n`;
      }
      if (tag === "h2") {
        return `## ${inline(node).trim()}\n\n`;
      }
      if (tag === "h3") {
        return `### ${inline(node).trim()}\n\n`;
      }
      if (tag === "p") {
        const text = inline(node).trim();
        return text ? `${text}\n\n` : "";
      }
      if (tag === "ul") {
        return `${convertList(node, false)}\n`;
      }
      if (tag === "ol") {
        return `${convertList(node, true)}\n`;
      }
      if (tag === "blockquote") {
        return `${inline(node)
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n")}\n\n`;
      }
      return convertBlocks(node);
    })
    .join("");
}

export function htmlToMarkdown(html) {
  if (!html) {
    return "";
  }
  const documentNode = new DOMParser().parseFromString(html, "text/html");
  return convertBlocks(documentNode.body).replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
