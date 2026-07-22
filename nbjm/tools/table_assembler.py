import re

_BASELINE_NAMES = {
    "no_schedule": "无调度",
    "simple_pred": "简单平均预测",
    "greedy": "贪婪启发式",
    "ours": "本文方案",
}

_CJK = r"\u4e00-\u9fff"
_FORBIDDEN_PATTERNS = [
    (re.compile(r"papercritic", re.IGNORECASE), "[内部评审]"),
    (re.compile(rf"(?<=[{_CJK}])claim", re.IGNORECASE), "结论"),
    (re.compile(rf"claim(?=[{_CJK}])", re.IGNORECASE), "结论"),
    (re.compile(rf"(?<=[{_CJK}])evidence", re.IGNORECASE), "依据"),
    (re.compile(rf"evidence(?=[{_CJK}])", re.IGNORECASE), "依据"),
    (re.compile(rf"(?<=[{_CJK}])reasoning", re.IGNORECASE), "推理"),
    (re.compile(rf"reasoning(?=[{_CJK}])", re.IGNORECASE), "推理"),
    (re.compile(r"代码\s*\[\s*\d+\s*\]"), "代码"),
    (re.compile(rf"(?<=[{_CJK}])issue(?!s)", re.IGNORECASE), "问题"),
    (re.compile(rf"issue(?=[{_CJK}])", re.IGNORECASE), "问题"),
    (re.compile(r"回应\s*[:：]"), "处理:"),
    (re.compile(r"回应"), "处理"),
    (re.compile(r"超时"), "运行"),
    (re.compile(r"占位"), "--"),
    (re.compile(r"李华"), "队员A"),
    (re.compile(r"张三"), "队员A"),
    (re.compile(r"王五"), "队员B"),
]

_UNIT_RE = re.compile(r"^(.*?)\s*[（(]([^()（）]+)[)）]\s*$")

_RESULT_LINE_RE = re.compile(
    r"^RESULT:\s*(?:baseline|scenario|method|config|parameter)=(\S+)\s+(.+)$",
    re.MULTILINE,
)
_RESULT_PAIR_RE = re.compile(r"(\w+)=(-?\d+\.?\d*(?:[eE][+-]?\d+)?)")


def extract_numeric_results(stdout: str) -> dict[str, dict[str, float]]:
    results: dict[str, dict[str, float]] = {}
    for m in _RESULT_LINE_RE.finditer(stdout):
        identifier = m.group(1)
        pairs_str = m.group(2)
        metrics: dict[str, float] = {}
        for pm in _RESULT_PAIR_RE.finditer(pairs_str):
            metrics[pm.group(1)] = float(pm.group(2))
        if metrics:
            results[identifier] = metrics
    return results


def _clean_forbidden_words(text: str, section: str) -> tuple[str, list[str]]:
    if not text:
        return text, []
    warnings: list[str] = []
    for pattern, replacement in _FORBIDDEN_PATTERNS:
        if pattern.search(text):
            text = pattern.sub(replacement, text)
            warnings.append(f"[{section}] {pattern.pattern} → {replacement}")
    return text, warnings


def _sanitize_table_cell(text: str) -> str:
    if not text:
        return text
    text = text.replace("\\", "")
    text = text.replace("$", "")
    text = text.replace("&", r"\&")
    text = text.replace("%", r"\%")
    text = text.replace("#", r"\#")
    text = text.replace("_", r"\_")
    text = text.replace("{", r"\{")
    text = text.replace("}", r"\}")
    return text


def _generate_variable_table(variables: dict[str, str]) -> str:
    if not variables:
        return ""
    lines = ["| 符号 | 含义 | 单位 |", "|---|---|---|"]
    for name, desc in variables.items():
        m = _UNIT_RE.match(desc)
        if m:
            meaning, unit = m.group(1).strip(), m.group(2).strip()
        else:
            meaning, unit = desc.strip(), "—"
        lines.append(f"| {_sanitize_table_cell(name)} | {_sanitize_table_cell(meaning)} | {_sanitize_table_cell(unit)} |")
    return "\n".join(lines)


def _sensitivity_rating(results: list[float]) -> str:
    if not results or len(results) < 2:
        return "—"
    mean = sum(results) / len(results)
    if mean == 0:
        return "—"
    ratio = (max(results) - min(results)) / abs(mean)
    if ratio > 0.30:
        return "高"
    if ratio > 0.10:
        return "中"
    return "低"


def _generate_sensitivity_table(runs: list) -> str:
    if not runs:
        return ""
    lines = ["| 参数 | 取值范围 | 指标 | 指标变化范围 | 敏感性评级 |",
             "|---|---|---|---|---|"]
    for r in runs:
        vals = f"[{r['values'][0]}, {r['values'][-1]}]" if r['values'] else "—"
        res = f"[{min(r['results']):.4g}, {max(r['results']):.4g}]" if r['results'] else "—"
        rating = _sensitivity_rating(r['results'])
        lines.append(f"| {r['parameter']} | {vals} | {r['metric']} | {res} | {rating} |")
    return "\n".join(lines)


def _generate_comparison_table(artifacts: list) -> str:
    rows: list[dict[str, str]] = []
    for a in artifacts:
        results = extract_numeric_results(a.get('stdout', '')) if a.get('stdout') else {}
        if not results:
            if a.get('category', '').startswith("baseline:"):
                cat_key = a['category'].split(":", 1)[1]
                name = _BASELINE_NAMES.get(cat_key, cat_key)
                rows.append({"方案": name, "状态": "运行失败"})
            continue
        for identifier, metrics in results.items():
            name = _BASELINE_NAMES.get(identifier, identifier)
            row = {"方案": name}
            row.update({k: str(v) for k, v in metrics.items()})
            rows.append(row)

    if not rows:
        return ""

    all_metrics: list[str] = []
    seen = set()
    for r in rows:
        for k in r:
            if k not in seen and k != "方案":
                seen.add(k)
                all_metrics.append(k)

    if not all_metrics:
        all_metrics = ["状态"]

    header = "| 方案 | " + " | ".join(all_metrics) + " |"
    sep = "|---|" + "|".join(["---" for _ in all_metrics]) + "|"
    lines = [header, sep]
    for r in rows:
        cells = [r.get("方案", "—")]
        for m in all_metrics:
            cells.append(r.get(m, "—"))
        lines.append("| " + " | ".join(cells) + " |")
    return "\n".join(lines)


def _generate_code_result_table(code_results: dict) -> str:
    tables = []
    
    main_code = code_results.get('main_code', {})
    if main_code:
        stdout = main_code.get('stdout', '')
        results = extract_numeric_results(stdout)
        if results:
            lines = ["| 方案 | " + " | ".join(list(list(results.values())[0].keys())) + " |",
                     "|---|" + "|".join(["---" for _ in list(results.values())[0].keys()]) + "|"]
            for identifier, metrics in results.items():
                name = _BASELINE_NAMES.get(identifier, identifier)
                cells = [name]
                cells.extend([str(v) for v in metrics.values()])
                lines.append("| " + " | ".join(cells) + " |")
            tables.append("### 主方案结果表\n\n" + "\n".join(lines))
    
    figure_artifacts = code_results.get('figure_artifacts', [])
    if figure_artifacts:
        success_count = sum(1 for a in figure_artifacts if a.get('success'))
        fail_count = len(figure_artifacts) - success_count
        lines = ["| 图表任务 | 状态 | 生成图片 |", "|---|---|---|"]
        for a in figure_artifacts:
            purpose = a.get('purpose', '未知')
            status = "✅ 成功" if a.get('success') else "❌ 失败"
            artifacts = ", ".join(a.get('artifact_paths', [])) if a.get('artifact_paths') else "无"
            lines.append(f"| {purpose} | {status} | {artifacts} |")
        tables.append(f"### 图表生成状态表\n\n" + "\n".join(lines))
    
    baseline_codes = code_results.get('baseline_codes', [])
    if baseline_codes:
        rows = []
        for b in baseline_codes:
            name = b.get('name', '未知')
            category = b.get('category', '')
            response = b.get('response', '')
            code_data = parse_json_safe(response)
            if code_data and 'code' in code_data:
                rows.append({"方案": name, "状态": "已生成"})
            else:
                rows.append({"方案": name, "状态": "生成失败"})
        
        if rows:
            lines = ["| 对照方案 | 状态 |", "|---|---|"]
            for r in rows:
                lines.append(f"| {r['方案']} | {r['状态']} |")
            tables.append("### 对照方案生成状态表\n\n" + "\n".join(lines))
    
    return "\n\n".join(tables)


def parse_json_safe(text):
    import json
    import re
    if not text:
        return None
    try:
        cleaned = text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        match = re.search(r'\{.*\}', cleaned, re.DOTALL)
        if match:
            cleaned = match.group(0)
        return json.loads(cleaned)
    except:
        return None


def _inject_table(section_text: str, title: str, table_md: str) -> str:
    if not table_md:
        return section_text
    heading = f"## {title}"
    if heading in section_text:
        return section_text
    if section_text and not section_text.endswith("\n"):
        section_text += "\n"
    return f"{section_text}\n{heading}\n\n{table_md}\n"


_SECTION_FIELDS = [
    "abstract", "problem_restatement", "assumptions", "notation",
    "model_section", "solution", "sensitivity", "conclusion",
]


def assemble_tables(paper_sections: dict, model_variables: dict = None, 
                    sensitivity_runs: list = None, code_artifacts: list = None,
                    code_results: dict = None) -> dict:
    paper = paper_sections.copy()
    warnings: list[str] = []

    if model_variables:
        var_table = _generate_variable_table(model_variables)
        if 'notation' in paper:
            paper['notation'] = _inject_table(paper['notation'], "模型变量表", var_table)

    if sensitivity_runs:
        sens_table = _generate_sensitivity_table(sensitivity_runs)
        if 'sensitivity' in paper:
            paper['sensitivity'] = _inject_table(paper['sensitivity'], "敏感性结果汇总表", sens_table)

    if code_artifacts:
        comp_table = _generate_comparison_table(code_artifacts)
        if 'solution' in paper:
            paper['solution'] = _inject_table(paper['solution'], "各方案结果对比表", comp_table)
    
    if code_results:
        code_table = _generate_code_result_table(code_results)
        if code_table:
            if 'solution' in paper:
                paper['solution'] = _inject_table(paper['solution'], "代码运行结果表", code_table)

    for field in _SECTION_FIELDS:
        if field in paper and paper[field]:
            cleaned, w = _clean_forbidden_words(paper[field], field)
            paper[field] = cleaned
            warnings.extend(w)

    return {"paper": paper, "warnings": warnings}