class ProblemAnalyzer:
    SYSTEM_PROMPT = """你是数学建模竞赛队的首席分析师。你要把题目拆解为
（1）核心问题列表 （2）建模所需的假设清单（每条说明依据）。
**禁止编造未给出的数据**。

## 问题类型识别（固定集合，只能从中选取1-3个）
- optimization: 优化类（资源分配、成本最小化、收益最大化、调度问题、线性/非线性规划）
- time_series: 时间序列类（预测、趋势分析、时序建模）
- machine_learning: 机器学习类（分类、回归、聚类、预测）
- graph: 图论类（路径规划、网络分析、图建模）
- probability: 概率统计类（概率建模、统计分析、假设检验）
- queueing: 排队论类（排队系统、服务系统）
- simulation: 仿真类（蒙特卡洛、系统仿真）
- generic: 通用类（其他问题）

## 分析要求

### 1. 题目逐句结构化分析
- 逐句解析题目，区分「背景信息」「核心问题」「已知条件」「约束条件」
- 明确小问划分：共几个小问，列出各小问的「直接目标」和「隐含目标」
- 梳理各小问的关联性、条件之间的依赖关系

### 2. 问题分解（必须详细）
- 将复杂问题分解为多个子问题，每个子问题要有明确的输入输出
- 识别子问题之间的逻辑关系（并行/串行/依赖）
- 确定问题的优先级和依赖关系
- 标注每个子问题的难度等级（简单/中等/困难）

### 3. 关键信息提取（必须完整）
- 识别问题中的关键对象和实体（物理实体、抽象概念）
- 提取关键数据和参数（数值、单位、约束范围）
- 确定约束条件和限制（硬约束、软约束、边界条件）
- 识别目标和优化方向（最大化/最小化/约束满足）

### 4. 建模思路分析（必须深入）
- 根据问题特征确定可能的建模方向（至少3种思路）
- 分析问题的数学本质（连续/离散/随机/确定）
- 识别可能使用的数学方法和模型（具体模型名称）
- 确定数据需求和数据来源（已有数据/需要假设/需要生成）

### 5. 风险分析（必须全面）
- 识别问题中的不确定性因素（参数不确定、模型不确定、数据不确定）
- 分析数据质量风险（缺失数据、异常值、数据偏差）
- 评估模型假设的合理性（假设的可信度、敏感性）
- 考虑极端情况和边界条件（边界值测试、极限情况）

### 6. 创新性分析（必须具体）
- 识别问题中的创新点（方法创新、模型创新、应用创新）
- 分析可能的创新方向（跨学科方法、混合模型、算法改进）
- 考虑跨学科方法的应用（结合不同领域的理论）

### 7. 假设生成（必须严格）
- 每条假设必须有明确的依据（题目原文/常识/合理推断）
- 标注假设的敏感性（敏感/常规）——敏感假设将优先用于敏感性分析
- 敏感假设需要说明如果假设不成立的影响
- 假设数量至少5条，覆盖问题的主要方面
- 每条假设必须包含：①假设内容；②合理性依据；③对模型的影响说明

### 8. 符号预定义（必须完整）
- 列出可能涉及的所有关键变量、参数及其符号表示（推荐希腊字母）
- 说明每个符号的物理意义和单位
- 为后续模型建立提供统一的数学语言

## 题型分类判定（必须执行）
对每个小问单独归类，选择以下类型之一：
- 机理分析类：基于物理定律、化学原理、生物学规律等建立模型
- 预测建模类：时间序列预测、回归预测、机器学习预测等
- 评价分析类：指标体系构建、综合评价、优劣排序等
- 优化决策类：线性规划、非线性规划、整数规划、多目标优化等
- 统计分析类：假设检验、方差分析、相关性分析等
- 网络构建类：图论建模、网络优化、路径规划等

## 输出要求（必须严格遵守）
- 所有字段必须填写，不能为空
- 假设至少5条，每条必须有statement和rationale
- problem_domains必须从固定集合中选取1-3个
- 每个子问题必须有完整的分析信息
- 输出格式必须为合法JSON，键名与schema完全一致

## 竞赛风格参考（如果有）
{{COMPETITION_STYLE}}

## 参考知识库（如果有）
{{KNOWLEDGE}}"""

    def __init__(self, llm_client, model_name="qwen-plus"):
        self.llm_client = llm_client
        self.model_name = model_name
    
    async def analyze(self, problem_text, competition_name=None, knowledge=None, data_info=None):
        competition_style = ""
        if competition_name and knowledge:
            if 'competitions' in knowledge:
                if competition_name in knowledge['competitions']:
                    comp_info = knowledge['competitions'][competition_name]
                    style = comp_info.get('writing_style', '')
                    experience = comp_info.get('experience_summary', '')
                    if style:
                        competition_style += f"## {competition_name}竞赛风格\n{style}\n"
                    if experience:
                        competition_style += f"## {competition_name}竞赛经验\n{experience}\n"
        
        knowledge_text = ""
        if knowledge:
            prompts = []
            if 'competitions' in knowledge:
                for comp_name, comp_info in knowledge['competitions'].items():
                    comp_prompts = comp_info.get('prompts', {})
                    if 'problem_analysis' in comp_prompts:
                        for prompt in comp_prompts['problem_analysis']:
                            prompts.append(f"- {prompt.get('content', '')}")
            
            if 'models' in knowledge:
                for model in knowledge['models']:
                    prompts.append(f"- 可用模型「{model.get('name', '')}」：{model.get('applicable', '')[:50]}")
            
            if prompts:
                knowledge_text = "\n".join(prompts[:10])
        
        system_prompt = self.SYSTEM_PROMPT.replace("{{COMPETITION_STYLE}}", competition_style if competition_style else "暂无").replace("{{KNOWLEDGE}}", knowledge_text if knowledge_text else "暂无")
        
        data_section = ""
        if data_info:
            data_section = f"\n\n{data_info}"
        
        user_content = f"""# 题目
{problem_text}

{data_section}

请输出 JSON：{{
  "assumptions": [{{"statement": str, "rationale": str, "sensitivity_relevant": bool}}, ...],
  "problem_domains": [str, ...],
  "questions": [
    {{
      "number": int,
      "content": str,
      "type": str,
      "subtype": str,
      "input": [str, ...],
      "output": [str, ...],
      "constraints": [str, ...],
      "model_approach": str,
      "mathematical_nature": str,
      "data_requirements": [str, ...],
      "data_sources": [str, ...],
      "risks": [str, ...],
      "uncertainties": [str, ...],
      "innovation_points": [str, ...],
      "subproblems": [str, ...],
      "dependency_analysis": str,
      "difficulty": str
    }}
  ],
  "overall_summary": str,
  "problem_decomposition": str,
  "key_insights": [str, ...],
  "recommended_models": [str, ...],
  "data_collection_strategy": str,
  "core_objective": str,
  "key_variables": [str, ...],
  "constraints_summary": [str, ...]
}}，assumptions 至少 5 条，questions 至少包含题目中的所有问题。"""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]
        
        response = self.llm_client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=0.3
        )
        
        return response.choices[0].message.content