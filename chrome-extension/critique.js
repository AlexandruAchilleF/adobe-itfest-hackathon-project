// Generat din src/lib/critique.ts; nu-l edita de mână. Rulează: npm run ext:critique
(function() {
	// src/lib/accessibility.ts
	function hexToRgb(hex) {
		let h = hex.replace("#", "").trim();
		if (h.length === 3) h = h.split("").map((c) => c + c).join("");
		const n = Number.parseInt(h.slice(0, 6), 16);
		if (Number.isNaN(n)) return [
			0,
			0,
			0
		];
		return [
			n >> 16 & 255,
			n >> 8 & 255,
			n & 255
		];
	}
	const toLinear = (c) => {
		const s = c / 255;
		return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4;
	};
	function relativeLuminance([r, g, b]) {
		return .2126 * toLinear(r) + .7152 * toLinear(g) + .0722 * toLinear(b);
	}
	function contrastRatio(a, b) {
		const la = relativeLuminance(hexToRgb(a));
		const lb = relativeLuminance(hexToRgb(b));
		const [hi, lo] = la > lb ? [la, lb] : [lb, la];
		return Math.round((hi + .05) / (lo + .05) * 100) / 100;
	}
	/** Nivel WCAG. Text mare = ≥ 24px normal sau ≥ 18.66px bold (la 1x). */
	function wcagLevel(ratio, largeText = false) {
		if (ratio >= (largeText ? 4.5 : 7)) return "AAA";
		if (ratio >= (largeText ? 3 : 4.5)) return "AA";
		return "fail";
	}
	/** O imagine e „mare” dacă are ambele laturi de cel puțin atât și o arie de cel puțin LARGE_IMAGE_AREA. */
	const LARGE_IMAGE_SIDE = 100;
	const LARGE_IMAGE_AREA = 22500;
	const LEVEL_RANK = {
		important: 0,
		"de-imbunatatit": 1,
		marunt: 2
	};
	const RULE_RANK = {
		"fara-nume": 0,
		"contrast-slab": 1,
		"buton-fals": 2,
		"pagina-fara-titlu": 3,
		"link-vag": 4,
		"titlu-nemarcat": 5,
		"text-mic": 6,
		"imagine-fara-descriere": 7,
		"fara-descriere": 8,
		"fara-date-structurate": 9,
		"fara-limba": 10,
		"mai-multe-titluri": 11
	};
	/** Citește o culoare CSS în formă hex, rgb() sau rgba(). Orice altceva (transparent, var(), nume) dă null. */
	function parseColor(input) {
		if (typeof input !== "string") return null;
		const s = input.trim().toLowerCase();
		if (!s) return null;
		if (s.startsWith("#")) {
			let h = s.slice(1);
			if (!/^[0-9a-f]+$/.test(h)) return null;
			if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("");
			if (h.length !== 6 && h.length !== 8) return null;
			const n = (i) => Number.parseInt(h.slice(i, i + 2), 16);
			return [
				n(0),
				n(2),
				n(4),
				h.length === 8 ? n(6) / 255 : 1
			];
		}
		const m = s.match(/^rgba?\(\s*([^)]*)\)$/);
		if (!m) return null;
		const parts = m[1].split(/[\s,/]+/).filter(Boolean);
		if (parts.length !== 3 && parts.length !== 4) return null;
		const num = (p, max) => {
			const pct = p.endsWith("%");
			const v = Number.parseFloat(pct ? p.slice(0, -1) : p);
			if (!Number.isFinite(v)) return NaN;
			return Math.max(0, Math.min(max, pct ? v / 100 * max : v));
		};
		const rgb = parts.slice(0, 3).map((p) => num(p, 255));
		const a = parts.length === 4 ? num(parts[3], 1) : 1;
		if (rgb.some(Number.isNaN) || Number.isNaN(a)) return null;
		return [
			Math.round(rgb[0]),
			Math.round(rgb[1]),
			Math.round(rgb[2]),
			a
		];
	}
	const hex2 = (n) => Math.round(n).toString(16).padStart(2, "0");
	const toHex = ([r, g, b]) => `#${hex2(r)}${hex2(g)}${hex2(b)}`;
	/** Contrastul textului pe fundal; null dacă una din culori nu se poate folosi. */
	function textContrast(color, background) {
		const fg = parseColor(color);
		const bg = parseColor(background);
		if (!fg || !bg) return null;
		if (bg[3] < .99 || fg[3] <= .01) return null;
		const a = fg[3];
		const mixed = [
			0,
			1,
			2
		].map((i) => fg[i] * a + bg[i] * (1 - a));
		const fgHex = toHex(mixed);
		const bgHex = toHex(bg);
		const lum = (c) => .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
		return {
			ratio: contrastRatio(fgHex, bgHex),
			fg: fgHex,
			bg: bgHex,
			textIsLighter: lum(mixed) > lum(bg)
		};
	}
	const clean = (s) => typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "";
	/** Textul elementului, scurtat la cel mult 40 de caractere, între „”. */
	function quote(text) {
		const t = clean(text);
		return `„${t.length > 40 ? `${t.slice(0, 39).trimEnd()}…` : t}”`;
	}
	/** Fără diacritice, litere mici, fără semne la capete. */
	function normalize(s) {
		return clean(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "").replace(/\s+/g, " ");
	}
	const VAGUE_LINKS = new Set([
		"click aici",
		"clic aici",
		"apasa aici",
		"aici",
		"mai mult",
		"mai multe",
		"vezi mai mult",
		"vezi mai multe",
		"citeste mai mult",
		"citeste mai multe",
		"afla mai mult",
		"afla mai multe",
		"link",
		"detalii",
		"click",
		"click here",
		"here",
		"more",
		"read more",
		"learn more"
	]);
	function isVagueLinkText(text) {
		return VAGUE_LINKS.has(normalize(text));
	}
	const isActionEl = (e) => e.isLink || e.isButtonLike || e.tag === "button" || e.role === "button" || e.role === "link";
	const isNamedControl = (e) => e.isLink || e.tag === "button" || e.role === "button" || e.role === "link";
	const isFakeButton = (e) => e.isButtonLike && e.role !== "button" && e.role !== "link";
	/** Cum îi spunem elementului în titlu: „Butonul „X””, „Linkul „X””, „Textul „X””. */
	function subject(e, text) {
		if (e.isLink || e.role === "link") return `Linkul ${quote(text)}`;
		if (e.tag === "button" || e.role === "button" || e.isButtonLike) return `Butonul ${quote(text)}`;
		return `Textul ${quote(text)}`;
	}
	const FAKE_BUTTON_AGENT = "Asistenții AI care comandă sau rezervă în numele clienților nu-și dau seama că e un buton. Cere un buton real, accesibil și din tastatură.";
	function ruleContrast(e) {
		const text = clean(e.text);
		if (!text || e.isImage) return null;
		const c = textContrast(e.color, e.background);
		if (!c) return null;
		const weight = Number.isFinite(e.fontWeight) ? e.fontWeight : 400;
		const large = e.fontSizePx >= 24 || e.fontSizePx >= 18.66 && weight >= 700;
		if (wcagLevel(c.ratio, large) !== "fail") return null;
		const action = isActionEl(e);
		const important = action && e.inFirstScreen;
		const fakeButton = isFakeButton(e);
		const fix = action ? c.textIsLighter ? "Închide culoarea butonului, ca scrisul să se vadă clar." : "Folosește scris mai închis pe un fundal deschis." : c.textIsLighter ? "Închide fundalul, ca scrisul deschis să se vadă clar." : "Închide culoarea scrisului.";
		return {
			el: e,
			level: important ? "important" : "de-imbunatatit",
			ruleId: "contrast-slab",
			title: action ? `${subject(e, text)} abia se vede` : `${subject(e, text)} se citește greu`,
			body: action ? important ? "E printre primele lucruri pe care le vede omul, dar scrisul se pierde pe fundal. Mulți oameni nu-l vor observa." : "Scrisul se pierde pe fundal. Mulți oameni nu-l vor observa." : "Culoarea scrisului e prea apropiată de cea a fundalului. Pe telefon, în soare, aproape nu se vede.",
			fix,
			agent: fakeButton ? FAKE_BUTTON_AGENT : "Asistenții AI care se uită la pagină ca un om, din imagine, pot rata și ei ce abia se vede.",
			evidence: {
				contrast: c.ratio,
				needed: large ? 3 : 4.5,
				fontSizePx: e.fontSizePx,
				fontWeight: weight,
				color: c.fg,
				background: c.bg,
				...fakeButton ? { fakeButton: 1 } : {}
			}
		};
	}
	function ruleNoName(e) {
		if (!isNamedControl(e) || e.isImage) return null;
		if (clean(e.accessibleName) || clean(e.text)) return null;
		const isLink = e.isLink || e.role === "link";
		return {
			el: e,
			level: e.inFirstScreen ? "important" : "de-imbunatatit",
			ruleId: "fara-nume",
			title: isLink ? "Un link n-are nume" : "Un buton n-are nume",
			body: `Probabil se vede doar o iconiță. Cine folosește un cititor de ecran aude doar „${isLink ? "link" : "buton"}”, fără să afle ce face.`,
			fix: "Dă-i un nume care spune ce face, de exemplu „Caută”.",
			agent: `Asistenții AI nu folosesc un ${isLink ? "link" : "buton"} fără nume: nu știu ce face, așa că îl ocolesc.`,
			evidence: {
				tag: e.tag,
				w: Math.round(e.box.w),
				h: Math.round(e.box.h)
			}
		};
	}
	function ruleFakeButton(e) {
		if (!isFakeButton(e)) return null;
		const text = clean(e.text) || clean(e.accessibleName);
		return {
			el: e,
			level: "de-imbunatatit",
			ruleId: "buton-fals",
			title: text ? `${quote(text)} nu e un buton real` : "Un buton nu poate fi folosit din tastatură",
			body: "Merge cu mouse-ul, dar cine folosește tastatura sau un cititor de ecran nu ajunge la el.",
			fix: "Cere un buton real, accesibil și din tastatură.",
			agent: "Asistenții AI care fac lucruri în numele clienților nu-și dau seama că se poate apăsa, așa că îl ocolesc.",
			evidence: { tag: e.tag }
		};
	}
	function ruleVagueLink(e) {
		if (!(e.isLink || e.role === "link")) return null;
		const text = clean(e.text) || clean(e.accessibleName);
		if (!text || !isVagueLinkText(text)) return null;
		return {
			el: e,
			level: "de-imbunatatit",
			ruleId: "link-vag",
			title: `${quote(text)} nu spune unde ajungi`,
			body: "Omul trebuie să ghicească ce găsește dacă apasă.",
			fix: "Spune unde duce linkul, de exemplu „Vezi prețurile”.",
			agent: `Asistenții AI aleg linkurile după ce scrie pe ele. Pe ${quote(text)} nu-l vor alege niciodată.`,
			evidence: {
				text: normalize(text),
				href: e.href ?? ""
			}
		};
	}
	function ruleImage(e) {
		if (!e.isImage || e.alt !== null || clean(e.accessibleName)) return null;
		const { w, h } = e.box;
		if (!(w >= LARGE_IMAGE_SIDE && h >= LARGE_IMAGE_SIDE && w * h >= LARGE_IMAGE_AREA)) return null;
		return {
			el: e,
			level: "marunt",
			ruleId: "imagine-fara-descriere",
			title: "Poza mare n-are descriere",
			body: "Cine nu vede poza, sau un motor de căutare, nu află ce arată.",
			fix: "Adaugă o descriere scurtă a imaginii.",
			agent: "Un asistent AI nu poate citi poza, doar descrierea ei. Fără ea, nu știe ce vinzi.",
			evidence: {
				w: Math.round(w),
				h: Math.round(h)
			}
		};
	}
	function ruleSmallText(e) {
		const text = clean(e.text);
		if (!text || e.isImage || !Number.isFinite(e.fontSizePx) || e.fontSizePx <= 0 || e.fontSizePx >= 12) return null;
		return {
			el: e,
			level: isActionEl(e) ? "de-imbunatatit" : "marunt",
			ruleId: "text-mic",
			title: `${subject(e, text)} e scris prea mic`,
			body: "Se citește greu, mai ales pe telefon și de către cei care nu mai văd bine.",
			fix: "Fă-l măcar cât restul textului de pe pagină.",
			agent: "Asistenții AI care se uită la pagină din imagine pot citi greșit un scris atât de mic.",
			evidence: {
				fontSizePx: e.fontSizePx,
				min: 12
			}
		};
	}
	function ruleHeadingLike(e) {
		const text = clean(e.text);
		if (!e.isHeadingLike || !text) return null;
		return {
			el: e,
			level: "de-imbunatatit",
			ruleId: "titlu-nemarcat",
			title: `${quote(text)} nu e marcat ca titlu`,
			body: "Pentru ochi e titlu, dar pentru cititoarele de ecran și pentru motoarele de căutare e doar un text mare.",
			fix: "Cere să fie marcat ca subtitlu al secțiunii.",
			agent: "Asistenții AI se orientează după titluri. Pe acesta nu-l văd, așa că nu știu unde începe partea asta din pagină.",
			evidence: { fontSizePx: e.fontSizePx }
		};
	}
	const ELEMENT_RULES = [
		ruleNoName,
		ruleContrast,
		ruleFakeButton,
		ruleVagueLink,
		ruleHeadingLike,
		ruleSmallText,
		ruleImage
	];
	function pageRules(page, els) {
		const out = [];
		const h1 = Number.isFinite(page.h1Count) ? page.h1Count : 0;
		if (h1 === 0) {
			let best = null;
			for (const e of els) {
				if (!e.isHeadingLike || !e.inFirstScreen || !clean(e.text)) continue;
				if (!best || e.fontSizePx > best.fontSizePx || e.fontSizePx === best.fontSizePx && e.box.y < best.box.y) best = e;
			}
			out.push({
				el: best,
				level: "de-imbunatatit",
				ruleId: "pagina-fara-titlu",
				title: best ? `${quote(best.text)} nu e marcat ca titlul paginii` : "Pagina n-are un titlu principal",
				body: best ? "Arată ca titlul paginii, dar pagina nu are niciun titlu marcat ca principal." : "Nimic nu e marcat ca titlul principal, așa că nu e clar dintr-o privire despre ce e pagina.",
				fix: best ? "Cere să fie marcat ca titlul paginii." : "Adaugă un titlu principal care spune ce oferi.",
				agent: "Pentru asistenții AI, titlul principal spune despre ce e pagina. Fără el, nu știu sigur ce oferi.",
				evidence: {
					h1Count: 0,
					...best ? { fontSizePx: best.fontSizePx } : {}
				}
			});
		} else if (h1 > 1) out.push({
			el: null,
			level: "marunt",
			ruleId: "mai-multe-titluri",
			title: "Pagina are mai multe titluri principale",
			body: "Mai multe texte sunt marcate ca titlul paginii, așa că nu e clar care e cel adevărat.",
			fix: "Păstrează un titlu principal; transformă restul în subtitluri.",
			agent: "Asistenții AI nu știu pe care să-l creadă când rezumă pagina.",
			evidence: { h1Count: h1 }
		});
		if (!clean(page.metaDescription)) out.push({
			el: null,
			level: "de-imbunatatit",
			ruleId: "fara-descriere",
			title: "Pagina n-are o descriere",
			body: "În Google apare ce prinde motorul de căutare din pagină, nu ce ai vrea tu să spui.",
			fix: "Adaugă o descriere scurtă a ofertei în setările paginii.",
			agent: "Asistenții AI citesc descrierea ca să afle repede despre ce e pagina. Fără ea, ghicesc din bucăți.",
			evidence: { length: 0 }
		});
		if (!Array.isArray(page.jsonLdTypes) || page.jsonLdTypes.length === 0) out.push({
			el: null,
			level: "de-imbunatatit",
			ruleId: "fara-date-structurate",
			title: "Lipsesc datele structurate ale afacerii",
			body: "Oamenii găsesc informațiile citind pagina, dar ele nu sunt puse și într-o formă standard, pe care o înțeleg calculatoarele.",
			fix: "Adaugă adresa și programul verificate în format standard. Pot ajuta și căutarea cu AI.",
			agent: "Asistenții AI nu găsesc direct programul, adresa, prețurile. Când cineva întreabă „e deschis acum?”, nu pot răspunde sigur.",
			evidence: { types: 0 }
		});
		if (!clean(page.lang)) out.push({
			el: null,
			level: "marunt",
			ruleId: "fara-limba",
			title: "Pagina nu spune în ce limbă e",
			body: "Cititoarele de ecran pot citi textul românesc cu accent englezesc, greu de înțeles.",
			fix: "Setează limba paginii.",
			agent: "Asistenții AI pot traduce sau rezuma greșit dacă nu știu limba paginii.",
			evidence: { lang: "" }
		});
		return out;
	}
	const isVisible = (e) => !!e && !!e.box && Number.isFinite(e.box.w) && Number.isFinite(e.box.h) && e.box.w > 0 && e.box.h > 0;
	const graver = (a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || RULE_RANK[a.ruleId] - RULE_RANK[b.ruleId];
	function compareOrder(a, b) {
		const lv = LEVEL_RANK[a.level] - LEVEL_RANK[b.level];
		if (lv) return lv;
		if (!a.el || !b.el) {
			if (a.el) return -1;
			if (b.el) return 1;
			return RULE_RANK[a.ruleId] - RULE_RANK[b.ruleId];
		}
		const fs = Number(b.el.inFirstScreen) - Number(a.el.inFirstScreen);
		if (fs) return fs;
		return a.el.box.y - b.el.box.y || a.el.box.x - b.el.box.x || RULE_RANK[a.ruleId] - RULE_RANK[b.ruleId];
	}
	/**
	* Criticile paginii, cel mult 8, ordonate: important, de îmbunătățit, mărunt.
	* Cel mult una pe element (cea mai gravă) și cel mult 2 din aceeași regulă.
	* `viewport` e păstrat pentru reguli care țin de ecran; acum folosim `inFirstScreen` dat de content.js.
	*/
	function critiquePage(page, els, viewport) {
		const list = Array.isArray(els) ? els : [];
		const pageDrafts = pageRules(page ?? {}, list.filter(isVisible));
		const best = new Map();
		const consider = (d) => {
			if (!d.el) return;
			const prev = best.get(d.el.id);
			if (!prev || graver(d, prev) < 0) best.set(d.el.id, d);
		};
		for (const d of pageDrafts) consider(d);
		for (const e of list) {
			if (!isVisible(e)) continue;
			for (const rule of ELEMENT_RULES) {
				const d = rule(e);
				if (d) consider(d);
			}
		}
		const drafts = [...best.values(), ...pageDrafts.filter((d) => !d.el)].sort(compareOrder);
		const perRule = new Map();
		const out = [];
		for (const d of drafts) {
			if (out.length >= 8) break;
			const n = perRule.get(d.ruleId) ?? 0;
			if (n >= 2) continue;
			perRule.set(d.ruleId, n + 1);
			const { el, ...rest } = d;
			out.push({
				elementId: el ? el.id : null,
				...rest
			});
		}
		return out;
	}
	const lowerFirst = (s) => s ? s[0].toLocaleLowerCase("ro") + s.slice(1) : s;
	/** Fraza de final: câte lucruri și cu ce să înceapă. */
	function summarySentence(crits) {
		const n = Array.isArray(crits) ? crits.length : 0;
		if (n === 0) return "N-am găsit nimic grav pe pagina asta.";
		const first = lowerFirst(crits[0].title);
		if (n === 1) return `Am găsit un lucru de reparat: ${first}.`;
		return `Am găsit ${n} ${n % 100 === 0 || n % 100 >= 20 ? "de " : ""}lucruri de reparat. Începe cu ${crits[0].level === "important" ? "cel mai important" : "primul"}: ${first}.`;
	}
	// \0spire-critique-entry
	globalThis.SpireCritique = {
		critiquePage,
		summarySentence
	};
})();
