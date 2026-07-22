from knowledge.model_library import MODEL_LIBRARY
from knowledge.image_library import IMAGE_LIBRARY
import json

class ModelRecommender:
    SYSTEM_PROMPT_PREFIX = """你是数学建模队的主建模手。请在给定假设下构建数学模型。
你必须按照 stage 渐进：basic（最简可解模型）→ improved（加入更多现实因素）→ final（综合性最强、可被敏感性分析的最终模型）。

## 推荐原则（必须严格遵守）
1. **模型创新优先**：优先推荐组合模型和自创超高级模型，鼓励跨领域模型融合
2. **模型选择约束**：基线模型从下方"可用模型库"中选择，改进模型和最终模型可以是组合模型或自创模型
3. **图表选择约束**：推荐的图表类型**必须**从下方"可用图表类型库"中选择，不能使用库中不存在的图表
4. **名称一致性**：模型名称和图表名称必须与库中完全一致，组合模型需明确说明构成
5. **可视化匹配**：根据推荐的模型选择最合适的可视化图表类型，确保图表与问题和数据相契合
6. **可行性考虑**：考虑数据可用性和计算复杂度
7. **验证要求**：给出验证方案和风险提示
8. **经验参考**：参考竞赛风格和已有经验

## 模型创新要求（强烈鼓励！）

### 组合模型
- 将多个模型进行串联或并联组合，形成更强大的模型系统
- 示例：Lasso回归 + Bootstrap重采样、随机森林 + 梯度提升、SVM + 核主成分分析
- 组合模型需说明各子模型的作用和组合方式

### 自创模型
- 根据问题特点，创建全新的数学模型或对现有模型进行创新性改进
- 示例：针对小样本问题的改进贝叶斯模型、针对时序数据的改进LSTM模型
- 自创模型需说明创新点和理论依据

### 为什么非它不可（必须在final阶段详细说明）
- **解决小样本过拟合**：使用正则化、交叉验证、Bootstrap重采样等方法
- **检验鲁棒性**：通过扰动分析、敏感性分析、稳健统计等方法
- **提高预测精度**：使用集成学习、特征工程、模型融合等方法
- **处理数据噪声**：使用滤波、平滑、异常值检测等方法
- **适应复杂约束**：使用混合整数规划、约束优化等方法

## 模型阶段演进要求

### basic阶段（最简可解模型）
- 只保留核心假设和核心变量
- 忽略次要因素和复杂约束
- 确保模型可在5分钟内求解完成
- 输出清晰的数学形式化描述

### improved阶段（加入现实因素）
- 引入basic阶段忽略的重要约束
- 考虑更复杂的变量关系
- 对比basic阶段的改进点
- 说明改进带来的影响

### final阶段（综合性最终模型）
- 整合所有关键因素
- 提供完整的数学形式化
- 必须包含可用于敏感性分析的参数
- 必须提供figure_purposes（6-12个图任务）
- **必须详细说明模型选择理由（为什么非它不可）**

## 模型选择黄金法则（基于MCM/ICM/CUMCM一等奖论文总结）

### 1. 机理分析类问题
- 适用模型：微分方程、偏微分方程、马尔可夫链、元胞自动机
- 关键要点：物理规律建模、参数敏感性分析、稳定性分析
- 图表推荐：相图、分岔图、灵敏度曲线、参数影响热力图

### 2. 预测建模类问题
- 适用模型：ARIMA、LSTM、Prophet、XGBoost、支持向量机
- 关键要点：数据预处理、特征工程、模型融合、误差分析
- 验证指标：MAPE（目标≤15%）、RMSE、R²（目标≥0.70）
- 图表推荐：实测vs预测散点图、误差分布直方图、预测区间图、特征重要性图

### 3. 评价分析类问题
- 适用模型：层次分析法(AHP)、熵权法、TOPSIS、灰色关联分析、模糊综合评价
- 关键要点：指标体系构建、权重确定、一致性检验、灵敏度分析
- 图表推荐：雷达图、权重热力图、评价结果排序图、指标相关性图

### 4. 优化决策类问题
- 适用模型：线性规划、非线性规划、整数规划、多目标优化、动态规划
- 关键要点：目标函数构建、约束条件推导、最优解验证、灵敏度分析
- 图表推荐：可行域图、帕累托前沿图、参数敏感性曲线、决策变量热力图

### 5. 统计分析类问题
- 适用模型：假设检验、方差分析、回归分析、聚类分析、因子分析
- 关键要点：数据分布检验、显著性分析、模型假设验证
- 图表推荐：QQ图、残差图、方差分析箱线图、聚类树状图

### 6. 网络构建类问题
- 适用模型：图论、最小生成树、最短路径、网络流、社区检测
- 关键要点：节点与边的定义、网络特性分析、优化策略设计
- 图表推荐：网络图可视化、中心性分析图、路径图、社区结构图

### 7. 模型验证必备要素
- **禁止「自己拟合自己验证」**：必须使用未参与建模的数据进行验证
- **验证指标**：MAPE（目标≤15%）、RMSE、最大相对误差（目标≤30%）、R²（目标≥0.70）
- **必须绘制「实测vs预测」散点图**（含对角线y=x）
- **验证不合格时必须分析原因并在论文中说明**

### 8. 敏感性分析必备要素
- 选择2-3个关键参数进行分析
- 连续参数默认±30%，比率类参数在[0,1]区间采样，离散参数列举所有取值
- 必须输出敏感性曲线或热力图
- 必须给出结论性断言：模型对哪些参数敏感，对哪些参数鲁棒

## 可用模型库
"""

    SYSTEM_PROMPT_MIDDLE = """

## 可用图表类型库
"""

    SYSTEM_PROMPT_SUFFIX = """

## 竞赛风格参考（如果有）
{{COMPETITION_STYLE}}

## 参考知识库（如果有）
以下是已学习的优秀论文知识，推荐时请参考其中的模型选择方法和经验：
{{KNOWLEDGE}}

## 模型推导要求（final阶段）
final阶段的模型需要包含完整的推导逻辑，包括：
1. 模型选择动机：为什么选择这个模型族？与其他模型族的对比优势
2. **为什么非它不可**：详细说明选择此模型的必要性（解决小样本过拟合、检验鲁棒性等）
3. 数学陈述：模型族的严格形式化（含下标、求和、条件、集合定义）
4. 参数估计：MLE/矩估计/贝叶斯方法及目标函数，包括损失函数形式
5. 约束推导：从模型性质推导出参数约束条件，包括正则化项
6. 等价变换：是否能化为标准型/状态空间形式，变换矩阵推导
7. 求解方法：解析解/数值方法/算法步骤，收敛性分析

## 公式完整性要求（所有阶段）
所有阶段的模型都必须包含：
1. **目标函数**：完整的优化目标公式（最大化/最小化）
2. **约束条件**：所有约束的数学表达式（等式约束、不等式约束）
3. **变量定义**：所有变量的数学定义和取值范围
4. **参数说明**：所有参数的含义和估计方法
5. **推导过程**：关键公式的推导步骤和中间结果
6. **原理解释**：模型背后的物理/经济/数学原理说明

## 图表推荐要求
每个问题的推荐图表必须与模型和数据高度契合，遵循以下原则：
1. **问题导向**：图表必须服务于问题分析和结论论证
2. **数据适配**：选择最适合当前数据类型的图表
3. **高级专业**：优先选择高级可视化类型（热力图、雷达图、3D图等）
4. **多角度展示**：从不同角度展示同一结论，增强说服力

## 输出格式（必须严格遵守）
返回JSON格式，模型名称和图表类型**必须**与上方可用库中的名称完全一致：
{
    "model_versions": [
        {
            "stage": "basic",
            "description": "模型定位与核心思路，>= 200字",
            "equations": ["LaTeX公式1", "LaTeX公式2"],
            "variables": {"变量名": "含义"},
            "notes": "与上一版的区别（basic阶段可为空）",
            "model_name": "从模型库中选择的模型名称"
        },
        {
            "stage": "improved",
            "description": "模型定位与核心思路，>= 200字",
            "equations": ["LaTeX公式1", "LaTeX公式2"],
            "variables": {"变量名": "含义"},
            "notes": "与basic版本的区别",
            "model_name": "从模型库中选择的模型名称"
        },
        {
            "stage": "final",
            "description": "模型定位与核心思路，>= 200字",
            "equations": ["LaTeX公式1", "LaTeX公式2"],
            "variables": {"变量名": "含义"},
            "notes": "与improved版本的区别",
            "model_name": "模型名称（可以是组合模型或自创模型）",
            "model_composition": "组合模型构成说明（如：Lasso回归 + Bootstrap重采样）",
            "why_this_model": "详细说明为什么选择此模型，包括：解决的问题（小样本过拟合等）、对比其他模型的优势、理论依据",
            "figure_purposes": ["需求时序图", "调度路径图", "成本构成饼图", "敏感性曲线", "相关性热力图", "误差分布直方图"],
            "derivation_steps": [
                {"title": "模型选择动机", "statement": "动机描述", "result": "结论"},
                {"title": "为什么非它不可", "statement": "必要性说明", "result": "选择理由"},
                {"title": "数学陈述", "statement": "形式化描述", "result": "数学公式"},
                {"title": "参数估计", "statement": "估计方法", "result": "估计方程"},
                {"title": "约束推导", "statement": "约束条件", "result": "约束公式"},
                {"title": "等价变换", "statement": "变换方法", "result": "变换结果"},
                {"title": "求解", "statement": "求解策略", "result": "求解结果"}
            ]
        }
    ],
    "recommendations": [
        {
            "question_number": 1,
            "task_type": "任务类型",
            "baseline_model": "基线模型名称（必须从模型库中选择）",
            "advanced_models": ["改进模型名称1", "改进模型名称2"],
            "final_model": "最终模型名称（可以是组合模型或自创模型）",
            "model_description": "详细的模型选择理由",
            "why_this_model": "为什么非它不可：解决的问题、对比优势、理论依据",
            "mathematical_formulation": "数学公式说明",
            "validation_plan": "详细的验证方案",
            "risk_points": ["风险点1", "风险点2"],
            "recommended_images": ["图表类型名称1", "图表类型名称2", "图表类型名称3", "图表类型名称4", "图表类型名称5", "图表类型名称6"],
            "image_description": ["图表1说明：与问题和数据的契合度", "图表2说明：与问题和数据的契合度"],
            "data_requirements": ["数据需求1", "数据需求2"],
            "implementation_steps": ["步骤1", "步骤2"]
        }
    ],
    "overall_recommendation": "总体推荐说明",
    "model_selection_strategy": "模型选择策略"
}"""
    
    def __init__(self, llm_client, model_name="qwen-plus"):
        self.llm_client = llm_client
        self.model_name = model_name
        self.revision_count = 0
        
        model_list = []
        for name, info in MODEL_LIBRARY.items():
            model_list.append(f"- {name} ({info['category']}): {info['description'][:80]}")
        self.model_library_text = "\n".join(model_list)
        
        image_list = []
        for name, info in IMAGE_LIBRARY.items():
            image_list.append(f"- {name} ({info['category']}): {info['description'][:60]}")
        self.image_library_text = "\n".join(image_list)
    
    async def recommend(self, problem_analysis, competition_name=None, knowledge=None, data_info=None, revision_prompt=None, revision_count=0):
        self.revision_count = revision_count
        competition_style = ""
        if competition_name and knowledge:
            if 'competitions' in knowledge:
                if competition_name in knowledge['competitions']:
                    comp_info = knowledge['competitions'][competition_name]
                    experience = comp_info.get('experience_summary', '')
                    if experience:
                        competition_style += f"## {competition_name}竞赛经验\n{experience}\n"
        
        knowledge_text = ""
        if knowledge:
            model_experiences = []
            prompt_experiences = []
            
            if 'competitions' in knowledge:
                for comp_name, comp_info in knowledge['competitions'].items():
                    comp_prompts = comp_info.get('prompts', {})
                    if 'model_selection' in comp_prompts:
                        for prompt in comp_prompts['model_selection']:
                            prompt_experiences.append(prompt.get('content', '')[:150])
            
            if 'models' in knowledge:
                for model in knowledge['models']:
                    if model.get('applicable'):
                        model_experiences.append(f"- 模型「{model.get('name', '')}」适用场景：{model.get('applicable')[:100]}")
            
            if model_experiences:
                knowledge_text += "### 模型使用经验\n" + "\n".join(model_experiences[:10]) + "\n"
            
            if prompt_experiences:
                knowledge_text += "### 模型选择提示词\n" + "\n".join(prompt_experiences[:5])
        
        prompt = self.SYSTEM_PROMPT_PREFIX + self.model_library_text + self.SYSTEM_PROMPT_MIDDLE + self.image_library_text + self.SYSTEM_PROMPT_SUFFIX.replace("{{COMPETITION_STYLE}}", competition_style if competition_style else "暂无").replace("{{KNOWLEDGE}}", knowledge_text if knowledge_text else "暂无")
        
        questions_text = ""
        questions = []
        try:
            clean_analysis = problem_analysis.replace("```json", "").replace("```", "").strip()
            analysis_data = json.loads(clean_analysis)
            questions = analysis_data.get('questions', [])
            if questions:
                questions_text = "# 问题列表\n"
                for q in questions:
                    q_num = q.get('number', '')
                    q_content = q.get('content', '')[:200]
                    q_type = q.get('type', '')
                    q_subtype = q.get('subtype', '')
                    questions_text += f"- 问题{q_num}（{q_type}/{q_subtype}）：{q_content}\n"
                questions_text += f"\n**强制要求**：必须为上述所有 {len(questions)} 个问题分别生成模型推荐，缺少任何一个问题的推荐都将视为失败！"
        except Exception as e:
            print(f"⚠️ 解析问题分析数据失败: {e}")
            questions_text = "# 问题列表\n从题目分析中识别出的所有问题，请全部生成模型推荐。"
            questions = []
        
        previous_model_text = ""
        if revision_prompt:
            previous_model_text = f"""

# ⚠️ 紧急修改通知：上一版模型评审严重不合格

## 🔴 评审失败详情
{revision_prompt}

# 🎯 修改指令（必须严格执行，否则继续失败）

**核心要求：**
1. ❗ 这是第 {self.revision_count + 1} 次修改尝试，之前的修改效果不佳
2. ❗ 必须**彻底重新设计**模型，不能只是小修小补
3. ❗ 必须**逐一解决**评审问题清单中的每个问题
4. ❗ 修改后的模型与上一版相比必须有**明显差异**

**修改策略：**
1. 认真阅读"上一版模型推荐"，找出问题根源
2. 针对每个评审问题，思考根本性的解决方案
3. 如果当前模型无法解决问题，**必须更换模型**（从模型库中选择）
4. 重新设计整个模型架构，确保所有问题都得到解决
5. 在notes字段中详细说明修改内容和原因

**评审问题优先级：**
- 🟥 严重问题（必须立即解决）：假设矛盾、方程错误、模型不可计算、偏题
- 🟧 重要问题（必须解决）：模型过于简单、缺乏创新性、验证不足
- 🟨 改进建议（建议采纳）：优化建议、更好的方法

**输出要求：**
- 必须输出完整的模型推荐JSON
- 在每个问题的notes字段中详细说明：
  - 上一版存在什么问题
  - 如何修改解决这个问题
  - 修改后的效果是什么
- 在model_description中说明模型改进的核心点

**警告：**
如果本次修改仍然无法解决评审问题，系统将继续强制修改，直到通过评审！"""
        
        if revision_prompt:
            user_content = f"""# 🔴 紧急修改任务：根据评审反馈重写模型

{previous_model_text}

# 📝 题目分析
{problem_analysis}

{questions_text}

# 当前阶段
final

# 已确认假设
（从题目分析中提取）

# 🔧 修改要求
1. 必须针对评审问题清单中的每个问题逐一修改
2. 修改后的模型必须与上一版有明显差异
3. 如果评审建议更换模型，必须从模型库中选择替代模型
4. 在notes字段中详细说明每个修改点和原因
5. 输出完整的模型推荐JSON，包含所有问题"""
        else:
            user_content = f"""# 题目分析
{problem_analysis}

{questions_text}

# 当前阶段
final

# 已确认假设
（从题目分析中提取）"""
        
        if data_info:
            user_content += data_info
        
        print(f"[DEBUG] revision_prompt存在: {revision_prompt is not None}")
        print(f"[DEBUG] revision_count: {revision_count}")
        print(f"[DEBUG] temperature: {0.7 if revision_prompt else 0.3}")
        print(f"[DEBUG] user_content前500字符:\n{user_content[:500]}")
        print(f"[DEBUG] user_content长度: {len(user_content)}")
        
        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": user_content}
        ]
        
        temperature = 0.7 if revision_prompt else 0.3
        
        response = self.llm_client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=temperature
        )
        
        result = response.choices[0].message.content
        
        try:
            result_data = json.loads(result.replace("```json", "").replace("```", "").strip())
            clean_analysis = problem_analysis.replace("```json", "").replace("```", "").strip()
            analysis_data = json.loads(clean_analysis)
            expected_count = len(analysis_data.get('questions', []))
            actual_count = len(result_data.get('recommendations', []))
            
            if actual_count < expected_count:
                print(f"⚠️ 发现模型推荐不完整：期望{expected_count}个问题，实际{actual_count}个，正在补充...")
                
                missing_questions = []
                rec_numbers = {rec.get('question_number') for rec in result_data.get('recommendations', [])}
                for q in analysis_data.get('questions', []):
                    if q.get('number') not in rec_numbers:
                        missing_questions.append(q)
                
                if missing_questions:
                    missing_text = "# 缺失的问题\n"
                    for q in missing_questions:
                        q_num = q.get('number', '')
                        q_content = q.get('content', '')[:200]
                        q_type = q.get('type', '')
                        q_subtype = q.get('subtype', '')
                        missing_text += f"- 问题{q_num}（{q_type}/{q_subtype}）：{q_content}\n"
                    
                    follow_up_prompt = f"""你之前的推荐遗漏了部分问题。请为以下缺失的问题生成模型推荐：
{missing_text}

请返回JSON格式（只包含recommendations列表）：
{{
    "recommendations": [
        {{
            "question_number": int,
            "task_type": str,
            "baseline_model": str,
            "advanced_models": [str, ...],
            "model_description": str,
            "mathematical_formulation": str,
            "validation_plan": str,
            "risk_points": [str, ...],
            "recommended_images": [str, ...],
            "image_description": str,
            "data_requirements": [str, ...],
            "implementation_steps": [str, ...]
        }}
    ]
}}"""
                    
                    messages = [
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": follow_up_prompt}
                    ]
                    
                    follow_up_response = self.llm_client.chat.completions.create(
                        model=self.model_name,
                        messages=messages,
                        temperature=0.3
                    )
                    
                    try:
                        follow_up_data = json.loads(follow_up_response.choices[0].message.content)
                        result_data['recommendations'].extend(follow_up_data.get('recommendations', []))
                        result = json.dumps(result_data, ensure_ascii=False, indent=2)
                    except:
                        pass
        except:
            pass
        
        return result