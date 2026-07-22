import re

_UNICODE_MATH_MAP = {
    "α": r"\alpha", "β": r"\beta", "γ": r"\gamma", "δ": r"\delta",
    "ε": r"\epsilon", "ζ": r"\zeta", "η": r"\eta", "θ": r"\theta",
    "ι": r"\iota", "κ": r"\kappa", "λ": r"\lambda", "μ": r"\mu",
    "ν": r"\nu", "ξ": r"\xi", "π": r"\pi", "ρ": r"\rho",
    "σ": r"\sigma", "τ": r"\tau", "υ": r"\upsilon", "φ": r"\phi",
    "χ": r"\chi", "ψ": r"\psi", "ω": r"\omega",
    "Γ": r"\Gamma", "Δ": r"\Delta", "Θ": r"\Theta", "Λ": r"\Lambda",
    "Π": r"\Pi", "Σ": r"\Sigma", "Φ": r"\Phi", "Ψ": r"\Psi", "Ω": r"\Omega",
    "≥": r"\geq", "≤": r"\leq", "≠": r"\neq", "≈": r"\approx",
    "±": r"\pm", "∓": r"\mp", "×": r"\times", "÷": r"\div", "·": r"\cdot",
    "∈": r"\in", "∉": r"\notin", "⊂": r"\subset", "⊆": r"\subseteq",
    "∪": r"\cup", "∩": r"\cap", "∅": r"\emptyset",
    "∀": r"\forall", "∃": r"\exists",
    "∑": r"\sum", "∏": r"\prod", "∫": r"\int",
    "∞": r"\infty", "∂": r"\partial", "∇": r"\nabla",
    "→": r"\to", "←": r"\leftarrow", "↔": r"\leftrightarrow",
    "²": r"^2", "³": r"^3", "¹": r"^1", "⁰": r"^0",
}


def _wrap_unicode_math(s: str) -> str:
    if not s:
        return s
    parts = s.split("$")
    sub_re = re.compile(r"([_^](?:\{[^}]+\}|[A-Za-z0-9]+))+")

    for i in range(0, len(parts), 2):
        seg = parts[i]
        out: list[str] = []
        j = 0
        while j < len(seg):
            ch = seg[j]
            if ch not in _UNICODE_MATH_MAP:
                out.append(ch)
                j += 1
                continue
            run_end = j
            while run_end < len(seg) and seg[run_end] in _UNICODE_MATH_MAP:
                run_end += 1
                while run_end < len(seg) and seg[run_end] in ("_", "^"):
                    sm = sub_re.match(seg, run_end)
                    if sm and sm.start() == run_end:
                        run_end = sm.end()
                    else:
                        run_end += 1
            token = seg[j:run_end]
            converted: list[str] = []
            pos = 0
            while pos < len(token):
                c = token[pos]
                cmd = _UNICODE_MATH_MAP.get(c)
                if cmd is not None:
                    converted.append(cmd)
                    pos += 1
                    sm = sub_re.match(token, pos)
                    if sm and sm.start() == pos:
                        converted.append(sm.group(0))
                        pos = sm.end()
                else:
                    converted.append(c)
                    pos += 1
            out.append("$" + "".join(converted) + "$")
            j = run_end
        parts[i] = "".join(out)
    return "$".join(parts)


_KNOWN_MATH_CMDS = frozenset({
    "leq", "geq", "neq", "leqslant", "geqslant", "approx", "sim", "propto",
    "equiv", "in", "notin", "subset", "supset", "cup", "cap",
    "subseteq", "supseteq", "subsetneq", "supsetneq",
    "cdot", "cdotp", "times", "div", "pm", "mp", "ast", "star", "circ",
    "ll", "gg",
    "sum", "prod", "int", "iint", "iiint", "oint", "bigcup", "bigcap",
    "lim", "sup", "inf", "max", "min", "arg",
    "alpha", "beta", "gamma", "delta", "epsilon", "varepsilon", "zeta",
    "eta", "theta", "vartheta", "iota", "kappa", "lambda", "mu", "nu",
    "xi", "omicron", "pi", "varpi", "rho", "varrho", "sigma", "varsigma",
    "tau", "upsilon", "phi", "varphi", "chi", "psi", "omega",
    "Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma", "Upsilon",
    "Phi", "Psi", "Omega",
    "to", "leftarrow", "rightarrow", "leftrightarrow",
    "Leftarrow", "Rightarrow", "Leftrightarrow",
    "longrightarrow", "Longrightarrow", "longleftarrow", "Longleftarrow",
    "mapsto", "hookrightarrow", "hookleftarrow",
    "infty", "partial", "nabla", "forall", "exists", "emptyset", "hbar",
    "ell", "Re", "Im", "aleph", "cdots", "ldots", "vdots", "ddots",
    "square", "blacksquare", "qed",
    "hat", "bar", "tilde", "vec", "dot", "ddot", "overline", "underline",
    "widehat", "widetilde", "mathbb", "mathbf", "mathcal", "mathrm",
    "boldsymbol", "text", "textrm", "textbf", "textit",
    "frac", "sqrt", "binom", "dfrac", "tfrac",
    "left", "right", "bigl", "bigr", "Bigl", "Bigr", "big", "Big",
    "sin", "cos", "tan", "cot", "sec", "csc", "log", "ln", "exp",
    "sinh", "cosh", "tanh", "det", "gcd", "deg", "dim", "ker",
})

_MATH_CMD_WORD_RE = re.compile(r"\\([A-Za-z]+)")


def _split_known_prefix(word: str) -> str | None:
    for n in range(len(word) - 1, 0, -1):
        if word[:n] in _KNOWN_MATH_CMDS:
            return word[:n]
    return None


def _pad_math_commands(s: str) -> str:
    if not s:
        return s

    def _sub(m: re.Match) -> str:
        word = m.group(1)
        if word in _KNOWN_MATH_CMDS:
            return m.group(0)
        prefix = _split_known_prefix(word)
        if prefix is None:
            return m.group(0)
        rest = word[len(prefix):]
        return f"\\{prefix}\\,{rest}"

    math_re = re.compile(
        r"(\\\[.*?\\\]|\\\(.*?\\\)|\\begin\{equation\*?\}.*?\\end\{equation\*?\})",
        re.DOTALL,
    )
    outer = math_re.split(s)
    for k in range(len(outer)):
        is_block = outer[k].startswith(r"\[") or outer[k].startswith(r"\(") or outer[k].startswith(r"\begin{equation")
        if is_block:
            outer[k] = _MATH_CMD_WORD_RE.sub(_sub, outer[k])
        else:
            parts = outer[k].split("$")
            for i in range(1, len(parts), 2):
                parts[i] = _MATH_CMD_WORD_RE.sub(_sub, parts[i])
            outer[k] = "$".join(parts)
    return "".join(outer)


_HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$", re.MULTILINE)
_HEADING_LEVELS = {
    1: r"\section", 2: r"\subsection", 3: r"\subsubsection",
    4: r"\paragraph", 5: r"\subparagraph", 6: r"\subparagraph",
}


def _md_headings_to_latex(s: str) -> str:
    if not s:
        return s

    def _sub(m: re.Match) -> str:
        level = len(m.group(1))
        cmd = _HEADING_LEVELS[level]
        return f"{cmd}{{{m.group(2)}}}"

    return _HEADING_RE.sub(_sub, s)


_BACKTICK_RE = re.compile(r"`([^`\n]+?)`")


def _md_inline_code_to_math(s: str) -> str:
    if not s:
        return s

    def _sub(m: re.Match) -> str:
        content = m.group(1)
        for ch, cmd in _UNICODE_MATH_MAP.items():
            if ch in content:
                content = content.replace(ch, cmd)
        return f"${content}$"

    return _BACKTICK_RE.sub(_sub, s)


_UNICODE_MATH_CHARS = "".join(_UNICODE_MATH_MAP.keys())
_NAKED_SUB_RE = re.compile(
    r"(?<![\\$\w{])"
    r"([A-Za-z" + re.escape(_UNICODE_MATH_CHARS) + r"][A-Za-z0-9]*"
    r"(?:_(?:\{[^}]+\}|[A-Za-z0-9]+))"
    r"(?:\^(?:\{[^}]+\}|[A-Za-z0-9]+))?"
    r")"
    r"(?![\w./])"
)


def _wrap_naked_subscripts(s: str) -> str:
    if not s:
        return s

    def _sub(m: re.Match) -> str:
        content = m.group(1)
        for ch, cmd in _UNICODE_MATH_MAP.items():
            if ch in content:
                content = content.replace(ch, cmd)
        return f"${content}$"

    def _process_text(t: str) -> str:
        parts = t.split("$")
        for i in range(0, len(parts), 2):
            parts[i] = _NAKED_SUB_RE.sub(_sub, parts[i])
        return "$".join(parts)

    display_re = re.compile(
        r"(\\\[.*?\\\]|\\\(.*?\\\)|\\begin\{equation\*?\}.*?\\end\{equation\*?\})",
        re.DOTALL,
    )
    out = []
    last = 0
    for m in display_re.finditer(s):
        out.append(_process_text(s[last:m.start()]))
        out.append(m.group(0))
        last = m.end()
    out.append(_process_text(s[last:]))
    return "".join(out)


_BOLD_RE = re.compile(r"\*\*(\S(?:[^\*\n]*?\S)?)\*\*")


def _md_bold_to_latex(s: str) -> str:
    if not s:
        return s
    return _BOLD_RE.sub(r"\\textbf{\1}", s)


_BULLET_RE = re.compile(r"^[ \t]*[-*+]\s+(.+)$", re.MULTILINE)


def _md_bullets_to_latex(s: str) -> str:
    if not s or "\n" not in s and not s.startswith(("-", "*", "+")):
        return s
    lines = s.split("\n")
    out = []
    in_list = False
    for line in lines:
        m = _BULLET_RE.match(line)
        if m:
            if not in_list:
                out.append(r"\begin{itemize}")
                in_list = True
            out.append(r"\item " + m.group(1))
        else:
            if in_list:
                out.append(r"\end{itemize}")
                in_list = False
            out.append(line)
    if in_list:
        out.append(r"\end{itemize}")
    return "\n".join(out)


def _md_table_to_latex(s: str) -> str:
    def _escape_cell_amps(cell: str) -> str:
        parts = cell.split("$")
        for i in range(0, len(parts), 2):
            parts[i] = re.sub(r"(?<!\\)&", r"\&", parts[i])
        return "$".join(parts)

    if not s or "|" not in s:
        return s
    lines = s.split("\n")
    out = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.lstrip().startswith("|") and i + 1 < len(lines):
            sep = lines[i + 1].strip()
            if sep.startswith("|") and set(sep) <= set("|-: "):
                header_cells = [c.strip() for c in line.strip().strip("|").split("|")]
                header_cells = [_escape_cell_amps(c) for c in header_cells]
                ncols = len(header_cells)
                sep_cells = [c.strip() for c in sep.strip().strip("|").split("|")]
                has_align_colons = any(":" in sc for sc in sep_cells)
                if has_align_colons:
                    col_spec = "".join(
                        "c" if sc.startswith(":") and sc.endswith(":") else
                        "r" if sc.endswith(":") else
                        "l" if sc.startswith(":") else "l"
                        for sc in sep_cells
                    )
                else:
                    col_spec = "X" * ncols
                col_spec = (col_spec + "X" * ncols)[:ncols]
                tbl = [r"\begin{tabularx}{\linewidth}{" + col_spec + r"}",
                       r"\toprule",
                       " & ".join(header_cells) + r" \\",
                       r"\midrule"]
                j = i + 2
                while j < len(lines) and lines[j].lstrip().startswith("|"):
                    cells = [c.strip() for c in lines[j].strip().strip("|").split("|")]
                    cells = [_escape_cell_amps(c) for c in cells]
                    cells = (cells + [""] * ncols)[:ncols]
                    tbl.append(" & ".join(cells) + r" \\")
                    j += 1
                tbl.append(r"\bottomrule")
                tbl.append(r"\end{tabularx}")
                out.append("")
                out.extend(tbl)
                out.append("")
                i = j
                continue
        out.append(line)
        i += 1
    return "\n".join(out)


def _escape_remaining_underscores(s: str) -> str:
    if not s:
        return s

    protected: list[tuple[int, int, str]] = []

    _env_re = re.compile(
        r"\\begin\{(equation|align|gather|multline|split|aligned|gathered|cases|"
        r"matrix|pmatrix|bmatrix|vmatrix|smallmatrix|array|subarray|tabularx)"
        r"\*?\}.*?\\end\{\1\*?\}",
        re.DOTALL,
    )
    for m in _env_re.finditer(s):
        content = m.group(0)
        env_name = m.group(1)
        if env_name == "tabularx":
            segs = content.split("$")
            for i in range(0, len(segs), 2):
                for ch in "_%#":
                    segs[i] = re.sub(rf"(?<!\\){re.escape(ch)}", rf"\{ch}", segs[i])
            content = "$".join(segs)
        protected.append((m.start(), m.end(), content))

    _display_re = re.compile(r"\\\[.*?\\\]|\\\(.*?\\\)", re.DOTALL)
    for m in _display_re.finditer(s):
        if not any(p[0] <= m.start() < p[1] for p in protected):
            protected.append((m.start(), m.end(), m.group(0)))

    protected.sort()
    merged: list[tuple[int, int, str]] = []
    for start, end, content in protected:
        if merged and start < merged[-1][1]:
            prev_start, prev_end, prev_content = merged.pop()
            merged.append((prev_start, max(prev_end, end), prev_content + content[prev_end - start:]))
        else:
            merged.append((start, end, content))

    result: list[str] = []
    pos = 0
    for start, end, content in merged:
        if pos < start:
            text = s[pos:start]
            segs = text.split("$")
            for j in range(0, len(segs), 2):
                segs[j] = re.sub(r"(?<!\\)_", r"\_", segs[j])
                segs[j] = re.sub(r"(?<!\\)%", r"\%", segs[j])
                segs[j] = re.sub(r"(?<!\\)&", r"\&", segs[j])
                segs[j] = re.sub(r"(?<!\\)#", r"\#", segs[j])
            result.append("$".join(segs))
        result.append(content)
        pos = end

    if pos < len(s):
        text = s[pos:]
        segs = text.split("$")
        for j in range(0, len(segs), 2):
            segs[j] = re.sub(r"(?<!\\)_", r"\_", segs[j])
            segs[j] = re.sub(r"(?<!\\)%", r"\%", segs[j])
            segs[j] = re.sub(r"(?<!\\)&", r"\&", segs[j])
            segs[j] = re.sub(r"(?<!\\)#", r"\#", segs[j])
        result.append("$".join(segs))

    return "".join(result)


_LONG_MATH_INDICATORS = ("=", r"\leq", r"\geq", r"\sum", r"\prod", r"\int", r"\le ", r"\ge ", "\\le}", "\\ge}")


def _promote_inline_equations(s: str) -> str:
    if not s or "$" not in s:
        return s

    def _is_long_equation(content: str) -> bool:
        if len(content) < 10:
            return False
        return any(ind in content for ind in _LONG_MATH_INDICATORS)

    _TABLE_SPLIT_RE = re.compile(
        r"(\\begin\{tabularx\}.*?\\end\{tabularx\})",
        re.DOTALL,
    )
    segments = _TABLE_SPLIT_RE.split(s)
    result = []
    for seg_idx, seg in enumerate(segments):
        if seg_idx % 2 == 1:
            result.append(seg)
            continue
        out = []
        i = 0
        while i < len(seg):
            if seg[i] == "$":
                end = seg.find("$", i + 1)
                if end == -1:
                    out.append(seg[i:])
                    break
                content = seg[i + 1:end]
                after = seg[end + 1:end + 2]
                before = seg[max(0, i - 1):i]
                sep_chars = set("。，；：、 \n\t")
                before_ok = before == "" or before in sep_chars
                after_ok = after == "" or after in sep_chars
                if _is_long_equation(content) and before_ok and after_ok:
                    eat = end + 1
                    while eat < len(seg) and seg[eat] in "。，；：、 \t":
                        eat += 1
                    out.append("\n\\begin{equation}\n" + content + "\n\\end{equation}\n")
                    i = eat
                    continue
                out.append(seg[i:end + 1])
                i = end + 1
            else:
                out.append(seg[i])
                i += 1
        result.append("".join(out))
    return "".join(result)


def markdown_to_latex(s: str) -> str:
    s = _md_table_to_latex(s)
    s = _md_headings_to_latex(s)
    s = _md_bold_to_latex(s)
    s = _md_bullets_to_latex(s)
    s = _md_inline_code_to_math(s)
    s = _wrap_naked_subscripts(s)
    s = _wrap_unicode_math(s)
    s = _promote_inline_equations(s)
    s = _pad_math_commands(s)
    s = _escape_remaining_underscores(s)
    return s


def latex_escape(s: str) -> str:
    return s.replace("%", r"\%") \
        .replace("#", r"\#") \
        .replace("&", r"\&") \
        .replace("$", r"\$")


def latex_path(p: str) -> str:
    return r"\detokenize{" + p.replace("\\", "/") + "}"