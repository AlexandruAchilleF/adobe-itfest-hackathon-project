import addOnSandboxSdk from "add-on-sdk-document-sandbox";
import { colorUtils, editor } from "express-document-sdk";

const { runtime } = addOnSandboxSdk.instance;

// Desenează un Design (schema din src/lib/design.ts) pe pagina curentă,
// scalat la lățimea paginii.
runtime.exposeApi({
  drawDesign(design) {
    const parent = editor.context.insertionParent;
    const page = editor.context.currentPage;
    const scale = Math.min(page.width / design.width, page.height / design.height);
    // culori invalide (ex: generate greșit) → gri, ca un singur element să nu oprească tot desenul
    const safe = (hex) => (/^#[0-9a-f]{6}$/i.test(hex) ? hex : "#888888");
    const fill = (hex) => editor.makeColorFill(colorUtils.fromHex(safe(hex))); // VERIFICĂ: colorUtils.fromHex

    for (const el of design.elements) {
      try {
      if (el.type === "rect") {
        const node = editor.createRectangle();
        node.width = el.width * scale;
        node.height = el.height * scale;
        node.translation = { x: el.x * scale, y: el.y * scale };
        node.fill = fill(el.fill);
        parent.children.append(node);
      } else if (el.type === "circle") {
        const node = editor.createEllipse();
        node.rx = el.radius * scale;
        node.ry = el.radius * scale;
        node.translation = { x: (el.x - el.radius) * scale, y: (el.y - el.radius) * scale };
        node.fill = fill(el.fill);
        parent.children.append(node);
      } else if (el.type === "line") {
        const node = editor.createLine();
        node.setEndPoints(el.x1 * scale, el.y1 * scale, el.x2 * scale, el.y2 * scale); // VERIFICĂ
        node.stroke = editor.makeStroke({ color: colorUtils.fromHex(safe(el.stroke)), width: el.strokeWidth * scale }); // VERIFICĂ
        parent.children.append(node);
      } else if (el.type === "text") {
        const node = editor.createText(el.text);
        parent.children.append(node);
        node.translation = { x: el.x * scale, y: el.y * scale };
        node.fullContent.applyCharacterStyles({ fontSize: el.fontSize * scale, color: colorUtils.fromHex(safe(el.fill)) }); // VERIFICĂ
      }
      } catch (err) {
        console.error(`[add-on] nu am putut desena elementul ${el.id}:`, err);
      }
    }
  },
});
