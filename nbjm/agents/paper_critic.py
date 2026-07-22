class PaperCritic:
    SYSTEM_PROMPT = """你是国赛资深评委。请审阅一份建模论文初稿。要点：
（1）摘要是否凸显方法和结论；（2）假设是否被正文承接；
（3）模型与求解是否一致、可复现；（4）是否有敏感性分析；
（5）图表是否被正文引用并解读；（6）整体行文是否专业。
总评0-10，>=8 approved。

关键事实核查：若下文给出『代码运行真实输出』区块，请把它当作唯一可靠的数字事实源。
用语义判断正文中的关键定量结论（成本、占比、敏感度幅度、性能指标等）是否与stdout相符。
明显与stdout不符的数字视为编造，把它逐条列入issues并把approved设为False。
合理四舍五入不算编造，不要因此扣分。"""
    
    def __init__(self, llm_client, model_name="qwen-plus"):
        self.llm_client = llm_client
        self.model_name = model_name
    
    async def critic(self, paper_content, code_results="", n_figures=0, n_sensitivity=0):
        try:
            import json
            paper_data = json.loads(paper_content)
            sections = paper_data.get('sections', [])
        except:
            sections = []
        
        body_text = ""
        for sec in sections:
            heading = sec.get('heading', '')
            content = sec.get('content', '')[:1000]
            body_text += f"## {heading}\n{content}\n\n"
        
        stdout_block = ""
        if code_results and code_results.strip():
            stdout_block = f"\n# 代码运行真实输出（事实源；用于核对正文数字）\n```\n{code_results[:4000]}\n```\n"
        
        user_content = f"""# 章节素材\n{body_text}\n\n# 客观信号\n- 图表数：{n_figures}\n- 敏感性run数：{n_sensitivity}\n{stdout_block}\n\n请输出JSON：{{"target":"paper","score":int,"issues":[{{"section":"abstract|problem_restatement|assumptions|notation|model_section|solution|sensitivity|conclusion|references|general","problem":str}}, ...],"suggestions":[str],"approved":bool}}。"""
        
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