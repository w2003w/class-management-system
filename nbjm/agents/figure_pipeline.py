from pydantic import BaseModel
from PIL import Image
import base64
import json
import re
import os


class FigureCriticOut(BaseModel):
    score: int = 0
    issues: list[str] = []
    suggestions: list[str] = []
    approved: bool = False


class FigureAnalysisOut(BaseModel):
    analysis: str = ""


class FigureArtifact(BaseModel):
    path: str = ""
    purpose: str = ""
    caption: str = ""
    quality_score: int = 0
    quality_issues: list[str] = []
    analysis: str = ""


class FigurePipeline:
    CRITIC_SYSTEM_PROMPT = """你是顶刊（Nature/Science系）论文图表评审。基于图像与其目的，按5个维度各0-10评分，
并取最低维分数作为最终score（≥8视为可用，approved=True）。

## 评分维度

(1) **archetype（图形态）**：图的形态（quantitative grid/schematic/image+quant/asymmetric）与目的是否匹配；多余面板要扣分；

(2) **evidence（证据力）**：图能否一句话支撑一个明确结论；信息密度过低（如只一根线无对比）或过载都扣分；

(3) **integrity（完整性）**：title、坐标轴标签+单位、legend、误差棒/n/统计标注是否齐全且可追溯；

(4) **typography（排版）**：字号≥7pt可读、字体一致、无截断；右上脊柱建议关闭；网格不喧宾夺主；

(5) **export（输出质量）**：DPI看上去≥300、配色克制（≤3个色系、避免彩虹）、白底（除非图像类必须深底）。

## 输出要求
- score: 取5个维度的最低分（0-10分）
- issues: 必须分别点名是哪一维度出的问题，例如 `[integrity] 缺少y轴单位`（最多5条）
- suggestions: 改进建议（最多3条）
- approved: score≥8为True，否则为False"""

    CRITIC_PROMPT_TEMPLATE = """# 图表评审任务

## 图的目的
{{purpose}}

## 图的元信息
{{metadata}}

请对这张图表进行质量评审，输出JSON：{"score": int, "issues": [str], "suggestions": [str], "approved": bool}。
issues形如 `[archetype] ...` / `[evidence] ...` / `[integrity] ...` / `[typography] ...` / `[export] ...`。"""

    ANALYST_SYSTEM_PROMPT = """你是国赛论文图说撰写者。给定一张图与它对应的数据/参数信息，
写一段100-200字的中文专业解读，覆盖：趋势、关键拐点、对模型结论的支撑。

要求：
- 明确趋势方向（递增/递减/波动/稳定）
- 指出关键数值和拐点位置
- 解释图表对模型结论的支撑作用
- 不要复述坐标轴标签
- 语言专业但不晦涩"""

    ANALYST_PROMPT_TEMPLATE = """# 图说写作任务

## 图的目的
{{purpose}}

## 数据上下文
{{context}}

请为这张图表写一段图说（100-200字），输出JSON：{"analysis": str}"""

    def __init__(self, llm_client, model_name="qwen-plus"):
        self.llm_client = llm_client
        self.model_name = model_name
        self.MAX_CRITIC_RETRIES = 1

    def _parse_json(self, json_str):
        json_str = json_str.replace("```json", "").replace("```", "").strip()
        json_str = re.sub(r"[\x00-\x1F\x7F]", "", json_str)
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            return None

    def inspect_image(self, path):
        try:
            with Image.open(path) as img:
                width, height = img.size
                dpi = img.info.get('dpi', (96, 96))
                if isinstance(dpi, tuple):
                    dpi = int(round(sum(dpi) / len(dpi)))
                else:
                    dpi = int(round(dpi))
                return {"width": width, "height": height, "dpi": dpi}
        except Exception:
            return {"width": 0, "height": 0, "dpi": 0}

    def encode_image_to_data_url(self, path):
        try:
            with open(path, "rb") as f:
                encoded = base64.b64encode(f.read()).decode()
                return f"data:image/png;base64,{encoded}"
        except Exception:
            return ""

    async def critic_image(self, path, purpose):
        info = self.inspect_image(path)
        metadata = f"{info['width']}x{info['height']}px, dpi={info['dpi']}"
        url = self.encode_image_to_data_url(path)

        prompt = self.CRITIC_PROMPT_TEMPLATE.replace("{{purpose}}", purpose)
        prompt = prompt.replace("{{metadata}}", metadata)

        for _ in range(self.MAX_CRITIC_RETRIES + 1):
            messages = [
                {"role": "system", "content": self.CRITIC_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ]

            try:
                response = self.llm_client.chat.completions.create(
                    model=self.model_name,
                    messages=messages,
                    temperature=0.3
                )

                result = response.choices[0].message.content
                critic_data = self._parse_json(result)

                if critic_data:
                    out = FigureCriticOut(
                        score=critic_data.get('score', 0),
                        issues=critic_data.get('issues', []),
                        suggestions=critic_data.get('suggestions', []),
                        approved=critic_data.get('approved', False)
                    )
                    if out.approved:
                        return out
                    return out
            except Exception:
                pass

        return FigureCriticOut(score=0, approved=False)

    async def analyze_image(self, path, purpose, context=""):
        prompt = self.ANALYST_PROMPT_TEMPLATE.replace("{{purpose}}", purpose)
        prompt = prompt.replace("{{context}}", context)

        messages = [
            {"role": "system", "content": self.ANALYST_SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]

        response = self.llm_client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=0.4
        )

        result = response.choices[0].message.content
        analysis_data = self._parse_json(result)

        if analysis_data:
            return FigureAnalysisOut(analysis=analysis_data.get('analysis', ''))
        return FigureAnalysisOut(analysis=f"{purpose}（无图说）")

    async def process_images(self, artifact_paths, purposes=None, contexts=None):
        figures = []

        if not artifact_paths:
            return figures

        if purposes is None:
            purposes = ["图表"] * len(artifact_paths)
        if contexts is None:
            contexts = [""] * len(artifact_paths)

        for i, path in enumerate(artifact_paths):
            if path.lower().endswith(".png") and os.path.exists(path):
                purpose = purposes[i] if i < len(purposes) else "图表"
                context = contexts[i] if i < len(contexts) else ""

                print(f"🔍 评审图片：{os.path.basename(path)}")

                critic = await self.critic_image(path, purpose)
                analysis = await self.analyze_image(path, purpose, context)

                figures.append(FigureArtifact(
                    path=path,
                    purpose=purpose,
                    caption=analysis.analysis[:60],
                    quality_score=critic.score,
                    quality_issues=list(critic.issues),
                    analysis=analysis.analysis
                ))

        return figures

    async def process_code_artifacts(self, code_artifacts):
        figures = []

        if not code_artifacts:
            return figures

        import os
        for artifact in code_artifacts:
            if not artifact.get('success'):
                continue

            purpose = artifact.get('purpose', '图表')
            stdout = artifact.get('stdout', '')[:500]
            artifact_paths = artifact.get('artifact_paths', [])

            for path in artifact_paths:
                if path.lower().endswith(".png") and os.path.exists(path):
                    print(f"🔍 评审图片：{os.path.basename(path)}")

                    critic = await self.critic_image(path, purpose)
                    analysis = await self.analyze_image(path, purpose, stdout)

                    figures.append(FigureArtifact(
                        path=path,
                        purpose=purpose,
                        caption=analysis.analysis[:60],
                        quality_score=critic.score,
                        quality_issues=list(critic.issues),
                        analysis=analysis.analysis
                    ))

        return figures

    def format_figures_summary(self, figures):
        lines = []
        lines.append("## 图表质量评估报告")
        lines.append("")

        if not figures:
            lines.append("暂无图表")
            return "\n".join(lines)

        total_score = sum(f.quality_score for f in figures)
        avg_score = round(total_score / len(figures), 2) if figures else 0

        lines.append(f"共 {len(figures)} 张图表，平均评分：{avg_score}/10")
        lines.append("")

        for i, fig in enumerate(figures, 1):
            lines.append(f"### 图 {i}：{fig.purpose}")
            lines.append(f"- 评分：{fig.quality_score}/10")
            lines.append(f"- 题注：{fig.caption}")
            if fig.quality_issues:
                lines.append(f"- 问题：{'; '.join(fig.quality_issues)}")
            lines.append("")

        return "\n".join(lines)