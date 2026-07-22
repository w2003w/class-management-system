import json

class ModelCritic:
    SYSTEM_PROMPT = """你是国赛评委。请就给定模型给出0-10的整数总评分（>=7视为通过），
并列出至多5个issues与至多5个suggestions。

## 评分一致性要求
- **同一内容必须给出相同评分**：如果同一模型推荐内容，第二次评审时评分必须与第一次相同
- **评分必须有明确依据**：每个评分项必须对应具体的理由
- **避免主观随意性**：严格按照下方评分标准打分，不得随意增减分数
- **最小评分单位**：每个维度评分精确到整数

## 评审标准（必须严格执行，总分10分）

### 1. 假设合理性（2分）
- 2分：所有假设与题目条件完全一致，且被模型显式承接和利用
- 1分：部分假设与题目条件不一致，或未被模型充分利用
- 0分：存在严重不合理的假设，或假设与模型矛盾

### 2. 模型正确性（3分）
- 3分：方程量纲一致，数学推导正确，模型可计算且数值稳定
- 2分：存在少量方程错误或推导不完整，但模型仍可计算
- 1分：方程存在明显错误，但模型基本框架正确
- 0分：方程量纲不一致，模型不可计算，或完全偏题

### 3. 模型创新性（2分）
- 2分：使用了恰当的模型，考虑了问题的特殊性（时序性、非线性、不确定性），有明显改进空间
- 1分：模型基本恰当，但未充分考虑问题特殊性
- 0分：模型过于简单或过于复杂，与问题不匹配

### 4. 验证完整性（2分）
- 2分：提供了完整的验证方案，考虑了风险点，有敏感性分析的可行性
- 1分：有基本的验证方案，但不够完整
- 0分：没有验证方案，未考虑风险点

### 5. 写作清晰性（1分）
- 1分：模型描述清晰，公式规范，变量定义完整
- 0分：模型描述模糊，公式不规范，变量定义缺失

## 评分示例
- **优秀（9-10分）**：所有标准都达到最高要求，模型完整且正确
- **良好（7-8分）**：大部分标准达到要求，存在少量可改进之处
- **中等（5-6分）**：基本标准达到要求，但存在明显缺陷
- **较差（0-4分）**：存在严重问题，模型无法使用

## approved判定规则
- approved=True：评分>=7分，或不存在严重问题
- approved=False：评分<7分，或存在严重问题（假设与模型矛盾、方程量纲不一致、模型不可计算、完全偏题）

## 评审要求
1. 必须对每个问题的模型分别给出评审意见
2. 在issues中必须明确指出具体问题所在（如"问题1的basic模型使用线性回归，但数据具有明显的时序特征，应改用ARIMA或LSTM"）
3. 在suggestions中必须给出具体的修改方向（如"建议将问题1的模型从线性回归改为ARIMA模型"）
4. 如果模型过于简单，必须明确指出应该使用什么更合适的模型
5. 如果模型假设不合理，必须指出如何修改假设
6. 如果方程有误，必须指出错误所在并给出修正建议
7. 评分必须严格按照上述标准，不得随意打分

改进建议（如『可用更优模型』『假设可放宽』）不影响approved，只写进suggestions。"""
    
    def __init__(self, llm_client, model_name="qwen-plus"):
        self.llm_client = llm_client
        self.model_name = model_name
    
    async def critic(self, problem_analysis, model_recommendations):
        try:
            analysis_data = json.loads(problem_analysis)
            assumptions = analysis_data.get('assumptions', [])
            questions = analysis_data.get('questions', [])
        except:
            assumptions = []
            questions = []
        
        asum_text = "\n".join(f"- {a['statement']}（依据：{a.get('rationale', '')}）" for a in assumptions) if assumptions else "（暂无）"
        
        questions_text = "\n".join(f"- 问题{i+1}: {q.get('description', '')[:200]}" for i, q in enumerate(questions)) if questions else "（暂无）"
        
        try:
            model_data = json.loads(model_recommendations)
            model_versions = model_data.get('model_versions', [])
            recommendations = model_data.get('recommendations', [])
        except:
            model_versions = []
            recommendations = []
        
        model_text = ""
        for mv in model_versions:
            stage = mv.get('stage', 'unknown')
            model_name = mv.get('model_name', 'unknown')
            description = mv.get('description', '')
            equations = mv.get('equations', [])
            eqs_text = "\n".join(f"  - {eq}" for eq in equations)
            model_text += f"### [{stage}] {model_name}\n描述：{description}\n方程：\n{eqs_text}\n\n"
        
        rec_text = ""
        for rec in recommendations:
            q_num = rec.get('question_number', 'unknown')
            task_type = rec.get('task_type', '')
            baseline = rec.get('baseline_model', '')
            advanced = ", ".join(rec.get('advanced_models', []))
            desc = rec.get('model_description', '')
            rec_text += f"### 问题{q_num}模型推荐\n任务类型：{task_type}\n基线模型：{baseline}\n改进模型：{advanced}\n选择理由：{desc}\n\n"
        
        if not model_text:
            model_text = "（暂无模型版本）"
        if not rec_text:
            rec_text = "（暂无问题推荐）"
        
        user_content = f"""# 题目分析\n{problem_analysis}\n\n# 问题列表\n{questions_text}\n\n# 假设\n{asum_text}\n\n# 模型版本演进\n{model_text}\n\n# 各问题模型推荐\n{rec_text}\n\n请输出JSON：{{"target":"modeler","score":int,"issues":[{{"section":"general","problem":str}}, ...],"suggestions":[str],"approved":bool}}"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": user_content}
        ]
        
        response = self.llm_client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=0.3
        )
        
        return response.choices[0].message.content