from pydantic import BaseModel


class EvaluationReport(BaseModel):
    dimension_scores: dict = {"assumption": 0, "innovation": 0, "correctness": 0, "clarity": 0, "depth": 0}
    total_score: int = 0
    weighted_total: float = 0.0
    comments: list[str] = []


class PaperEvaluator:
    SYSTEM_PROMPT = """你是国赛阅卷打分官。请独立、严格地按下列维度打分（每项0-100分，整数）：
assumption_reasonableness（假设合理性）、modeling_creativity（建模创造性）、
result_correctness（结果正确性）、writing_clarity（文字清晰度）、
extra_depth（加分项：分析深度/敏感性/创新点）。

## 评分标准

### 假设合理性（20%权重）
- 假设是否合理、有依据、与题目条件一致
- 是否标注敏感性（sensitivity_relevant）
- 假设之间是否矛盾
- 是否存在未说明的隐式假设

### 建模创造性（25%权重）
- 模型是否有新意、方法是否恰当
- 是否体现递进改进（basic→improved→final）
- 是否引入了跨学科方法或混合模型
- 是否有模型推导链（动机→形式化→参数估计→约束→变换→求解）

### 结果正确性（25%权重）
- 求解结果是否正确、数字是否可追溯
- 是否有验证方案和对照实验
- 是否与代码输出一致（关键数字与stdout匹配）
- 是否存在编造数据的迹象

### 写作清晰性（20%权重）
- 结构是否清晰、表达是否专业
- 是否符合学术规范（LaTeX公式格式、禁用词使用）
- 是否有可证伪的论点
- 是否存在内部流程痕迹泄露（PaperCritic、issue等词）

### 综合深度（10%权重）
- 敏感性分析是否到位（参数选择合理、解读深入）
- 结论是否有洞察和管理建议
- 是否有对照实验（无调度、简单预测、贪婪启发式）
- 图表是否被正文引用并解读

**加权总分计算**：
overall = round(
    0.2*assumption_reasonableness + 0.25*modeling_creativity + 
    0.25*result_correctness + 0.2*writing_clarity + 0.1*extra_depth, 2)

**关键事实核查**：若下文给出「代码运行真实输出」区块，请把它当作唯一可靠的数字事实源。
用语义判断正文中的关键定量结论（成本、占比、敏感度幅度、性能指标等）是否与stdout相符。
明显与stdout不符的数字视为编造，必须在comments中注明。

请认真给出comments，但不要重复PaperCritic已经说过的内容。"""

    PROMPT_TEMPLATE = """# 论文评估任务

## 论文摘要
{{abstract}}

## 主体（截断）
模型：{{model_section}}

求解：{{solution}}

敏感性：{{sensitivity}}

结论：{{conclusion}}

## 客观信号
- 图表数：{{n_figures}}
- 敏感性run数：{{n_sensitivity}}

{{stdout_block}}

{{warn_summary}}

## 输出格式
{"assumption": int, "innovation": int, "correctness": int, "clarity": int, "depth": int, "comments": [str]}

注意：
- 每项0-100分，整数
- comments列出主要评审意见（最多5条）
- 必须检查正文数字与代码输出是否一致"""

    def __init__(self, llm_client, model_name="qwen-plus"):
        self.llm_client = llm_client
        self.model_name = model_name
        self.WEIGHTS = {
            "assumption": 0.20,
            "innovation": 0.25,
            "correctness": 0.25,
            "clarity": 0.20,
            "depth": 0.10,
        }

    def _parse_json(self, json_str):
        import json
        import re
        json_str = json_str.replace("```json", "").replace("```", "").strip()
        json_str = re.sub(r"[\x00-\x1F\x7F]", "", json_str)
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            return None

    async def evaluate(self, paper_content, n_figures=0, n_sensitivity=0, 
                       code_stdout="", table_warnings=None):
        stdout_block = ""
        if code_stdout.strip():
            stdout_block = (
                "\n## 代码运行真实输出（事实源；用于核对正文数字）\n"
                f"```\n{code_stdout[:4000]}\n```\n"
            )

        prompt = self.PROMPT_TEMPLATE.replace("{{paper_content}}", paper_content[:15000])
        prompt = prompt.replace("{{n_figures}}", str(n_figures))
        prompt = prompt.replace("{{n_sensitivity}}", str(n_sensitivity))
        prompt = prompt.replace("{{stdout_block}}", stdout_block)

        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]

        response = self.llm_client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=0.3
        )

        result = response.choices[0].message.content
        eval_data = self._parse_json(result)

        if eval_data:
            dimension_scores = {
                "assumption": eval_data.get('assumption', 0),
                "innovation": eval_data.get('innovation', 0),
                "correctness": eval_data.get('correctness', 0),
                "clarity": eval_data.get('clarity', 0),
                "depth": eval_data.get('depth', 0),
            }

            total_score = sum(dimension_scores.values()) // 5
            weighted_total = sum(
                dimension_scores[k] * w for k, w in self.WEIGHTS.items()
            )
            weighted_total = round(weighted_total, 2)

            report = EvaluationReport(
                dimension_scores=dimension_scores,
                total_score=total_score,
                weighted_total=weighted_total,
                comments=eval_data.get('comments', [])
            )
            return report
        else:
            return EvaluationReport()

    def format_report(self, report: EvaluationReport = None) -> str:
        if report is None:
            report = self

        lines = []
        lines.append("## 论文评估报告")
        lines.append("")
        lines.append(f"| 评分维度 | 得分 | 权重 |")
        lines.append(f"|----------|------|------|")
        lines.append(f"| 假设合理性 | {report.dimension_scores['assumption']}/100 | 20% |")
        lines.append(f"| 建模创新性 | {report.dimension_scores['innovation']}/100 | 25% |")
        lines.append(f"| 结果正确性 | {report.dimension_scores['correctness']}/100 | 25% |")
        lines.append(f"| 写作清晰性 | {report.dimension_scores['clarity']}/100 | 20% |")
        lines.append(f"| 综合深度 | {report.dimension_scores['depth']}/100 | 10% |")
        lines.append("")
        lines.append(f"### 总分：{report.total_score}/100")
        lines.append(f"### 加权总分：{report.weighted_total}/100")
        lines.append("")

        if report.comments:
            lines.append("### 评审意见")
            for i, comment in enumerate(report.comments, 1):
                lines.append(f"{i}. {comment}")

        return "\n".join(lines)