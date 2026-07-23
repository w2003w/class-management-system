import json
import re
import os
import tempfile
import pandas as pd

from .problem_analyzer import ProblemAnalyzer
from .model_recommender import ModelRecommender
from .code_generator import CodeGenerator
from .paper_writer import PaperWriter
from .paper_learner import PaperLearner
from .model_critic import ModelCritic
from .paper_critic import PaperCritic
from .sensitivity_analyzer import SensitivityAnalyzer
from .evaluation import PaperEvaluator
from .figure_pipeline import FigurePipeline
from knowledge.model_library import MODEL_LIBRARY
from knowledge.image_library import IMAGE_LIBRARY
from tools.table_assembler import assemble_tables, extract_numeric_results
from tools.latex_converter import markdown_to_latex
from tools.paper_generator import generate_paper, generate_paper_markdown, convert_markdown_to_docx


class Coordinator:
    def __init__(self, llm_client, model_name="qwen-plus"):
        self.llm_client = llm_client
        self.model_name = model_name
        self.problem_analyzer = ProblemAnalyzer(llm_client, model_name)
        self.model_recommender = ModelRecommender(llm_client, model_name)
        self.code_generator = CodeGenerator(llm_client, model_name)
        self.paper_writer = PaperWriter(llm_client, model_name)
        self.paper_learner = PaperLearner(llm_client, model_name)
        self.model_critic = ModelCritic(llm_client, model_name)
        self.paper_critic = PaperCritic(llm_client, model_name)
        self.sensitivity_analyzer = SensitivityAnalyzer(llm_client, model_name)
        self.paper_evaluator = PaperEvaluator(llm_client, model_name)
        self.figure_pipeline = FigurePipeline(llm_client, model_name)
        self.knowledge = None
        self.competition_name = None
        self.data_files = None
        self.data_file_names = []

    def set_knowledge(self, knowledge):
        self.knowledge = knowledge

    def set_competition(self, competition_name):
        self.competition_name = competition_name

    def set_data_files(self, data_files, data_file_names=None):
        self.data_files = data_files
        self.data_file_names = data_file_names or []

    def _clean_json(self, json_str):
        json_str = json_str.replace("```json", "").replace("```", "").strip()
        json_str = re.sub(r"[\x00-\x1F\x7F]", "", json_str)
        return json_str

    def _parse_json(self, json_str):
        try:
            cleaned = self._clean_json(json_str)
            return json.loads(cleaned)
        except json.JSONDecodeError:
            return None

    async def run_full_workflow(self, problem_text, data_files=None, max_revision_rounds=1):
        results = {}
        revision_round = 0

        while revision_round <= max_revision_rounds:
            print(f"\n{'='*60}")
            print(f"🎯 第 {revision_round + 1} 轮：完整工作流程")
            print(f"{'='*60}")

            print("🔍 步骤1：问题分析...")
            analysis_result = await self.problem_analyzer.analyze(problem_text, self.competition_name, self.knowledge)
            results['problem_analysis'] = analysis_result
            print("✅ 问题分析完成")

            print("🧠 步骤2：模型推荐...")
            recommendation_result = await self.model_recommender.recommend(analysis_result, self.competition_name, self.knowledge)
            results['model_recommendations'] = recommendation_result
            print("✅ 模型推荐完成")

            print("🔍 步骤3：模型评审...")
            model_critic_result = await self.model_critic.critic(analysis_result, recommendation_result)
            results['model_critic'] = model_critic_result
            print("✅ 模型评审完成")

            print("💻 步骤4：代码生成（含每个问题的敏感性分析）...")
            code_result = await self.code_generator.generate(analysis_result, recommendation_result, self.competition_name, self.knowledge)
            results['code_generation'] = code_result

            code_json = self._parse_json(code_result)
            if code_json and 'main_code' in code_json and code_json['main_code'].get('code'):
                main_code = code_json['main_code']['code']
                baseline_results = await self.code_generator.generate_baselines(problem_text, main_code)
                results['baseline_codes'] = baseline_results
                print(f"✅ 代码生成完成（含{len(baseline_results)}个对照方案，每个问题末尾已嵌入敏感性分析代码）")
            else:
                print("✅ 代码生成完成（敏感性分析已嵌入每个问题代码末尾）")

            print("📊 步骤5：提取敏感性分析结果（从代码输出中自动提取）...")
            # 敏感性分析已在代码生成阶段嵌入每个问题代码末尾
            # 此步骤从代码运行输出中提取 SENSITIVITY_RESULT
            sensitivity_results = {"plan": "", "results": []}
            try:
                if code_json:
                    # 从模型推荐中提取敏感性参数清单作为计划
                    rec_json_parsed = self._parse_json(recommendation_result)
                    sens_plan_parts = []
                    if rec_json_parsed:
                        recs = rec_json_parsed.get('recommendations', [])
                        for rec in recs:
                            q_num = rec.get('question_number', '')
                            sens_params = rec.get('sensitivity_params', [])
                            if sens_params:
                                sens_plan_parts.append(f"问题{q_num}敏感性参数：{json.dumps(sens_params, ensure_ascii=False)}")
                        if rec_json_parsed.get('model_versions'):
                            for mv in rec_json_parsed['model_versions']:
                                if mv.get('stage') == 'final' and mv.get('sensitivity_params'):
                                    sens_plan_parts.append(f"Final模型：{json.dumps(mv['sensitivity_params'], ensure_ascii=False)}")
                    sensitivity_results['plan'] = "\n".join(sens_plan_parts) if sens_plan_parts else "敏感性分析已嵌入每个问题代码末尾"
                    
                    # 尝试从主代码中提取敏感性分析结果
                    if 'main_code' in code_json and code_json['main_code'].get('stdout'):
                        stdout = code_json['main_code']['stdout']
                        import re as re_sens
                        sens_matches = re_sens.findall(r'SENSITIVITY_RESULT: (.+)', stdout)
                        for match in sens_matches:
                            sensitivity_results['results'].append(match.strip())
                    results['sensitivity_analysis'] = json.dumps(sensitivity_results, ensure_ascii=False, indent=2)
            except Exception as e:
                print(f"⚠️ 敏感性结果提取跳过: {e}")
                results['sensitivity_analysis'] = json.dumps(sensitivity_results, ensure_ascii=False, indent=2)
            
            print("✅ 敏感性分析完成（结果已从各问题代码末尾提取）")

            print("📝 步骤6：论文写作...")
            sens_result_str = results['sensitivity_analysis']
            paper_result = await self.paper_writer.write(analysis_result, recommendation_result, code_result, sens_result_str, self.competition_name, self.knowledge)
            results['paper_writing'] = paper_result

            paper_json = self._parse_json(paper_result)
            if paper_json:
                model_variables = {}
                try:
                    rec_json = self._parse_json(recommendation_result)
                    if rec_json and 'recommendations' in rec_json:
                        for rec in rec_json['recommendations']:
                            if 'variables' in rec:
                                model_variables.update(rec['variables'])
                except Exception:
                    pass

                sensitivity_runs = []
                try:
                    sens_json = self._parse_json(sens_result_str)
                    if sens_json and 'results' in sens_json:
                        sensitivity_runs = sens_json['results']
                except Exception:
                    pass

                code_artifacts = []
                try:
                    if code_json and 'main_code' in code_json:
                        code_artifacts.append({
                            'purpose': code_json['main_code'].get('purpose', '主方案'),
                            'stdout': '',
                            'category': 'figure'
                        })
                    if 'baseline_codes' in results:
                        for bl in results['baseline_codes']:
                            bl_json = self._parse_json(bl['response'])
                            if bl_json:
                                code_artifacts.append({
                                    'purpose': bl_json.get('purpose', bl['name']),
                                    'stdout': '',
                                    'category': bl['category']
                                })
                except Exception:
                    pass

                if isinstance(paper_json, dict):
                    paper_sections = {}
                    if 'abstract' in paper_json:
                        paper_sections['abstract'] = paper_json['abstract']
                    if 'sections' in paper_json:
                        for section in paper_json['sections']:
                            heading = section.get('heading', '')
                            content = section.get('content', '')
                            if '问题重述' in heading:
                                paper_sections['problem_restatement'] = content
                            elif '模型假设' in heading:
                                paper_sections['assumptions'] = content
                            elif '符号说明' in heading:
                                paper_sections['notation'] = content
                            elif '模型建立' in heading:
                                paper_sections['model_section'] = content
                            elif '求解方法' in heading:
                                paper_sections['solution'] = content
                            elif '结果分析' in heading:
                                if 'solution' not in paper_sections:
                                    paper_sections['solution'] = content
                            elif '敏感性分析' in heading:
                                paper_sections['sensitivity'] = content
                            elif '结论' in heading:
                                paper_sections['conclusion'] = content

                    if paper_sections:
                        assembled = assemble_tables(
                            paper_sections,
                            model_variables=model_variables,
                            sensitivity_runs=sensitivity_runs,
                            code_artifacts=code_artifacts
                        )
                        results['paper_with_tables'] = assembled['paper']
                        results['table_warnings'] = assembled['warnings']

            print("✅ 论文写作完成")

            print("🔍 步骤7：图表质量评估...")
            figure_results = []
            if code_json and 'main_code' in code_json and code_json['main_code'].get('artifact_paths'):
                figure_results = await self.figure_pipeline.process_code_artifacts([code_json['main_code']])
            if 'baseline_codes' in results:
                for bl in results['baseline_codes']:
                    bl_json = self._parse_json(bl['response'])
                    if bl_json and bl_json.get('artifact_paths'):
                        figure_results.extend(await self.figure_pipeline.process_code_artifacts([bl_json]))
            results['figure_evaluation'] = figure_results
            print(f"✅ 图表质量评估完成（共{len(figure_results)}张图表）")

            print("🔍 步骤8：论文评估...")
            code_stdout = ""
            if code_json and 'main_code' in code_json:
                code_stdout = code_json['main_code'].get('stdout', '')[:2000]

            n_figures = len(figure_results)
            n_sensitivity = len(sensitivity_runs)

            paper_text = ""
            if isinstance(paper_json, dict):
                paper_text = paper_json.get('abstract', '')
                for section in paper_json.get('sections', []):
                    paper_text += "\n\n" + section.get('content', '')

            evaluation_report = await self.paper_evaluator.evaluate(paper_text, n_figures, n_sensitivity, code_stdout)
            results['evaluation_report'] = evaluation_report
            print(f"✅ 论文评估完成（总分：{evaluation_report.total_score}/100）")

            if revision_round < max_revision_rounds and evaluation_report.total_score < 70:
                print(f"🔄 论文评分低于70分，进行第 {revision_round + 2} 轮修订...")
                revision_round += 1

                revision_prompt = f"论文评估报告：\n{evaluation_report.format_report()}\n\n请根据评估报告中的问题进行针对性修订。"

                revised_paper_result = await self.paper_writer.write(
                    analysis_result, recommendation_result, code_result, sensitivity_result,
                    self.competition_name, self.knowledge, revision_prompt=revision_prompt
                )
                results[f'paper_writing_round_{revision_round}'] = revised_paper_result
                paper_result = revised_paper_result
                paper_json = self._parse_json(paper_result)
            else:
                print("✅ 工作流程完成")
                break

        return results

    async def analyze_problem(self, problem_text):
        data_info = self._get_data_info()
        return await self.problem_analyzer.analyze(problem_text, self.competition_name, self.knowledge, data_info)

    async def recommend_models(self, problem_analysis):
        data_info = self._get_data_info()
        return await self.model_recommender.recommend(problem_analysis, self.competition_name, self.knowledge, data_info)

    async def revise_models(self, problem_analysis, critic_result, previous_recommendations=None, revision_count=0):
        data_info = self._get_data_info()
        
        revision_prompt = ""
        
        try:
            clean_result = critic_result.replace("```json", "").replace("```", "").strip()
            critic_data = json.loads(clean_result)
            
            issues = critic_data.get('issues', [])
            suggestions = critic_data.get('suggestions', [])
            score = critic_data.get('score', 0)
            
            if previous_recommendations:
                try:
                    clean_rec = previous_recommendations.replace("```json", "").replace("```", "").strip()
                    rec_data = json.loads(clean_rec)
                    
                    revision_prompt += "## 上一版模型推荐（需修改）\n"
                    recommendations = rec_data.get('recommendations', [])
                    model_versions = rec_data.get('model_versions', [])
                    
                    if model_versions:
                        for mv in model_versions:
                            stage = mv.get('stage', '')
                            model_name = mv.get('model_name', '')
                            description = mv.get('description', '')[:100]
                            equations = mv.get('equations', [])[:3]
                            eqs_text = ", ".join(eq[:50] for eq in equations)
                            revision_prompt += f"- [{stage}] {model_name}: {description}（公式：{eqs_text}）\n"
                    
                    if recommendations:
                        revision_prompt += "\n### 各问题推荐\n"
                        for rec in recommendations:
                            q_num = rec.get('question_number', '')
                            baseline = rec.get('baseline_model', '')
                            advanced = ", ".join(rec.get('advanced_models', []))[:50]
                            desc = rec.get('model_description', '')[:80]
                            revision_prompt += f"- 问题{q_num}: 基线={baseline}, 改进={advanced}（{desc}）\n"
                except:
                    revision_prompt += f"## 上一版模型推荐\n{previous_recommendations[:500]}\n"
            
            if issues:
                revision_prompt += "\n## 🟥 评审问题清单（必须逐一解决）\n"
                for i, issue in enumerate(issues, 1):
                    if isinstance(issue, dict):
                        problem_text = issue.get('problem', '')
                        section = issue.get('section', '')
                        if section:
                            revision_prompt += f"{i}. [{section}] {problem_text}\n"
                        else:
                            revision_prompt += f"{i}. {problem_text}\n"
                    else:
                        revision_prompt += f"{i}. {str(issue)}\n"
            
            if suggestions:
                revision_prompt += "\n## 🟨 改进建议（建议采纳）\n"
                for i, suggestion in enumerate(suggestions, 1):
                    revision_prompt += f"{i}. {suggestion}\n"
            
            revision_prompt += f"\n## 📊 评审评分\n上一版模型评分: {score}/10（低于7分，必须修改）"
            revision_prompt += f"\n\n## 🔄 修改次数\n这是第 {revision_count + 1} 次修改尝试"
            
            revision_prompt += f"\n\n## 📝 评审原始反馈（供参考）\n{critic_result[:2000]}"
            
        except Exception as e:
            print(f"⚠️ 解析评审结果失败: {e}")
            revision_prompt = f"## 📝 评审反馈\n{critic_result[:3000]}"
            
            if previous_recommendations:
                revision_prompt += f"\n\n## 上一版模型推荐（需修改）\n{previous_recommendations[:800]}"
        
        print(f"[DEBUG] revision_prompt 前300字符: {revision_prompt[:300]}")
        
        return await self.model_recommender.recommend(
            problem_analysis, self.competition_name, self.knowledge, 
            data_info, revision_prompt=revision_prompt, revision_count=revision_count
        )

    async def auto_optimize_models(self, problem_analysis, max_retries=5, target_score=7, progress_callback=None):
        recommendations = await self.recommend_models(problem_analysis)
        
        if progress_callback:
            progress_callback(f"⏳ 第 1/{max_retries} 次评审：正在评审初始模型...")
        
        for retry in range(max_retries):
            critic_result = await self.critic_model(problem_analysis, recommendations)
            
            try:
                clean_result = critic_result.replace("```json", "").replace("```", "").strip()
                critic_data = json.loads(clean_result)
                score = critic_data.get('score', 0)
                
                print(f"🔍 第 {retry + 1} 次评审，评分: {score}/{target_score}")
                
                if score >= target_score:
                    if progress_callback:
                        progress_callback(f"✅ 第 {retry + 1}/{max_retries} 次评审通过！评分: {score}/{target_score}")
                    print("✅ 模型评审通过！")
                    result_dict = {
                        "recommendations": recommendations,
                        "critic_result": critic_result,
                        "score": score,
                        "attempts": retry + 1,
                        "success": True
                    }
                    print(f"[DEBUG] auto_optimize返回: {json.dumps(result_dict, ensure_ascii=False)[:500]}")
                    return json.dumps(result_dict, ensure_ascii=False)
                
                if retry < max_retries - 1:
                    if progress_callback:
                        progress_callback(f"❌ 第 {retry + 1}/{max_retries} 次评审未通过（评分: {score}/{target_score}），正在进行第 {retry + 2} 次优化...")
                    print(f"🔄 评分未达标，正在第 {retry + 2} 次修改...")
                    recommendations = await self.revise_models(
                        problem_analysis, critic_result, recommendations, retry
                    )
                else:
                    if progress_callback:
                        progress_callback(f"⚠️ 已达到最大重试次数（{max_retries}次），最终评分: {score}/{target_score}")
                    print("⚠️ 已达到最大重试次数，返回当前结果")
                    result_dict = {
                        "recommendations": recommendations,
                        "critic_result": critic_result,
                        "score": score,
                        "attempts": retry + 1,
                        "success": False
                    }
                    print(f"[DEBUG] auto_optimize返回: {json.dumps(result_dict, ensure_ascii=False)[:500]}")
                    return json.dumps(result_dict, ensure_ascii=False)
            except Exception as e:
                if progress_callback:
                    progress_callback(f"❌ 第 {retry + 1}/{max_retries} 次评审出错: {str(e)}")
                print(f"⚠️ 自动优化过程出错: {e}")
                result_dict = {
                    "recommendations": recommendations,
                    "critic_result": critic_result,
                    "score": 0,
                    "attempts": retry + 1,
                    "success": False
                }
                print(f"[DEBUG] auto_optimize返回: {json.dumps(result_dict, ensure_ascii=False)[:500]}")
                return json.dumps(result_dict, ensure_ascii=False)

    async def critic_model(self, problem_analysis, model_recommendations):
        return await self.model_critic.critic(problem_analysis, model_recommendations)

    async def generate_code(self, problem_analysis, model_recommendations, progress_callback=None):
        data_info = self._get_data_info()
        figure_purposes = []
        
        try:
            model_data = json.loads(model_recommendations)
            if model_data and 'model_versions' in model_data:
                for mv in model_data['model_versions']:
                    if mv.get('stage') == 'final' and mv.get('figure_purposes'):
                        figure_purposes.extend(mv.get('figure_purposes', []))
            if not figure_purposes:
                figure_purposes = ["主方案完整求解"]
        except:
            figure_purposes = ["主方案完整求解"]
        
        return await self.code_generator.generate_and_run_codes(
            problem_analysis, model_recommendations, 
            figure_purposes=figure_purposes,
            competition_name=self.competition_name,
            knowledge=self.knowledge,
            data_info=data_info,
            progress_callback=progress_callback,
            run_code=True
        )
    
    async def generate_code_only(self, problem_analysis, model_recommendations, progress_callback=None):
        data_info = self._get_data_info()
        figure_purposes = []
        
        try:
            model_data = json.loads(model_recommendations)
            if model_data and 'model_versions' in model_data:
                for mv in model_data['model_versions']:
                    if mv.get('stage') == 'final' and mv.get('figure_purposes'):
                        figure_purposes.extend(mv.get('figure_purposes', []))
            if not figure_purposes:
                figure_purposes = ["主方案完整求解"]
        except:
            figure_purposes = ["主方案完整求解"]
        
        return await self.code_generator.generate_and_run_codes(
            problem_analysis, model_recommendations, 
            figure_purposes=figure_purposes,
            competition_name=self.competition_name,
            knowledge=self.knowledge,
            data_info=data_info,
            progress_callback=progress_callback,
            run_code=False
        )

    async def generate_single_question_code(self, problem_analysis, model_recommendations, question_number, run_code=True, progress_callback=None):
        data_info = self._get_data_info()
        return await self.code_generator.generate_single_question_code(
            problem_analysis, model_recommendations, question_number,
            competition_name=self.competition_name,
            knowledge=self.knowledge,
            data_info=data_info,
            progress_callback=progress_callback,
            run_code=run_code
        )

    async def generate_baselines(self, problem_text, main_code):
        return await self.code_generator.generate_baselines(problem_text, main_code)

    async def analyze_sensitivity(self, model_recommendations, problem_analysis):
        return await self.sensitivity_analyzer.full_analysis(model_recommendations, problem_analysis)

    async def generate_sensitivity_code(self, model_recommendations, sensitivity_plan):
        return await self.sensitivity_analyzer.generate_code(model_recommendations, sensitivity_plan)

    async def write_paper(self, problem_analysis, model_recommendations, code_results, revision_prompt=None, uploaded_images=None, uploaded_results=None):
        data_info = self._get_data_info()
        return await self.paper_writer.write(problem_analysis, model_recommendations, code_results, None, self.competition_name, self.knowledge, data_info, revision_prompt, uploaded_images, uploaded_results)
    
    async def write_paper_section(self, section_name, problem_analysis, model_recommendations, code_results, 
                                  outline, previous_question_summary="", question1_summary="", 
                                  question2_summary="", all_questions_summary="", uploaded_images=None, 
                                  uploaded_results=None, question_number=None):
        data_info = self._get_data_info()
        return await self.paper_writer.write_section(
            section_name,
            problem_analysis,
            problem_analysis,
            model_recommendations,
            code_results,
            None,
            outline,
            knowledge=self.knowledge,
            competition_style=self.competition_name,
            uploaded_images=uploaded_images,
            uploaded_results=uploaded_results,
            previous_question_summary=previous_question_summary,
            question1_summary=question1_summary,
            question2_summary=question2_summary,
            all_questions_summary=all_questions_summary,
            question_number=question_number,
            prior_critic=None
        )

    async def critic_paper(self, paper_content, code_results="", n_figures=0, n_sensitivity=0):
        return await self.paper_critic.critic(paper_content, code_results, n_figures, n_sensitivity)

    async def evaluate_paper(self, paper_content, n_figures=0, n_sensitivity=0, code_stdout=""):
        return await self.paper_evaluator.evaluate(paper_content, n_figures, n_sensitivity, code_stdout)

    async def evaluate_figures(self, code_artifacts):
        return await self.figure_pipeline.process_code_artifacts(code_artifacts)

    def assemble_paper_tables(self, paper_json, model_recommendations=None, sensitivity_plan=None, code_results=None):
        model_variables = {}
        if model_recommendations:
            rec_json = self._parse_json(model_recommendations)
            if rec_json and 'recommendations' in rec_json:
                for rec in rec_json['recommendations']:
                    if 'variables' in rec:
                        model_variables.update(rec['variables'])

        sensitivity_runs = []
        if sensitivity_plan:
            plan_json = self._parse_json(sensitivity_plan)
            if plan_json and 'runs' in plan_json:
                sensitivity_runs = plan_json['runs']

        code_artifacts = []
        if code_results:
            code_json = self._parse_json(code_results)
            if code_json:
                if 'main_code' in code_json:
                    code_artifacts.append({
                        'purpose': code_json['main_code'].get('purpose', '主方案'),
                        'stdout': '',
                        'category': 'figure'
                    })
                if 'baseline_codes' in code_json:
                    for bl in code_json['baseline_codes']:
                        code_artifacts.append({
                            'purpose': bl.get('purpose', ''),
                            'stdout': '',
                            'category': bl.get('category', '')
                        })

        paper_sections = {}
        if isinstance(paper_json, dict):
            if 'abstract' in paper_json:
                paper_sections['abstract'] = paper_json['abstract']
            if 'sections' in paper_json:
                for section in paper_json['sections']:
                    heading = section.get('heading', '')
                    content = section.get('content', '')
                    if '问题重述' in heading:
                        paper_sections['problem_restatement'] = content
                    elif '模型假设' in heading:
                        paper_sections['assumptions'] = content
                    elif '符号说明' in heading:
                        paper_sections['notation'] = content
                    elif '模型建立' in heading:
                        paper_sections['model_section'] = content
                    elif '求解方法' in heading:
                        paper_sections['solution'] = content
                    elif '结果分析' in heading:
                        if 'solution' not in paper_sections:
                            paper_sections['solution'] = content
                    elif '敏感性分析' in heading:
                        paper_sections['sensitivity'] = content
                    elif '结论' in heading:
                        paper_sections['conclusion'] = content

        return assemble_tables(
            paper_sections,
            model_variables=model_variables,
            sensitivity_runs=sensitivity_runs,
            code_artifacts=code_artifacts
        )

    def convert_to_latex(self, paper_json):
        if not isinstance(paper_json, dict):
            return ""

        latex_parts = []
        if 'title' in paper_json:
            latex_parts.append(r"\title{" + paper_json['title'] + "}")

        if 'abstract' in paper_json:
            latex_parts.append(r"\begin{abstract}")
            latex_parts.append(markdown_to_latex(paper_json['abstract']))
            latex_parts.append(r"\end{abstract}")

        if 'sections' in paper_json:
            for section in paper_json['sections']:
                heading = section.get('heading', '')
                content = section.get('content', '')

                if '1.' in heading or '问题重述' in heading:
                    latex_parts.append(r"\section{问题重述}")
                elif '2.' in heading or '模型假设' in heading:
                    latex_parts.append(r"\section{模型假设}")
                elif '3.' in heading or '符号说明' in heading:
                    latex_parts.append(r"\section{符号说明}")
                elif '4.' in heading or '模型建立' in heading:
                    latex_parts.append(r"\section{模型建立}")
                elif '5.' in heading or '求解方法' in heading:
                    latex_parts.append(r"\section{求解方法与实现}")
                elif '6.' in heading or '结果分析' in heading:
                    latex_parts.append(r"\section{结果分析}")
                elif '7.' in heading or '敏感性分析' in heading:
                    latex_parts.append(r"\section{敏感性分析}")
                elif '8.' in heading or '结论' in heading:
                    latex_parts.append(r"\section{结论与建议}")
                elif '9.' in heading or '参考文献' in heading:
                    latex_parts.append(r"\section{参考文献}")
                else:
                    latex_parts.append(r"\section{" + heading + "}")

                latex_parts.append(markdown_to_latex(content))

                if 'tables' in section:
                    for table in section['tables']:
                        caption = table.get('caption', '')
                        headers = table.get('headers', [])
                        rows = table.get('rows', [])
                        if headers and rows:
                            ncols = len(headers)
                            col_spec = '|' + '|'.join(['c' for _ in headers]) + '|'
                            latex_parts.append(r"\begin{table}[h]")
                            latex_parts.append(r"\centering")
                            latex_parts.append(r"\caption{" + caption + "}")
                            latex_parts.append(r"\begin{tabular}{" + col_spec + "}")
                            latex_parts.append(r"\hline")
                            latex_parts.append(" & ".join(headers) + r" \\")
                            latex_parts.append(r"\hline")
                            for row in rows:
                                latex_parts.append(" & ".join(str(cell) for cell in row) + r" \\")
                            latex_parts.append(r"\hline")
                            latex_parts.append(r"\end{tabular}")
                            latex_parts.append(r"\end{table}")

                if 'images' in section:
                    for img in section['images']:
                        path = img.get('path', '')
                        caption = img.get('caption', '')
                        if path:
                            latex_parts.append(r"\begin{figure}[h]")
                            latex_parts.append(r"\centering")
                            latex_parts.append(r"\includegraphics[width=\linewidth]{" + path + "}")
                            latex_parts.append(r"\caption{" + caption + "}")
                            latex_parts.append(r"\end{figure}")

        return "\n\n".join(latex_parts)

    def _get_data_info(self):
        if not self.data_files:
            return ""

        data_info = "\n\n## 可用数据文件（请综合使用以下所有数据文件进行分析）\n"
        data_info += "**重要提示**：以下是用户上传的所有数据文件及其完整原始数据内容。请在分析时综合使用所有数据文件，不要遗漏任何一个文件中的数据：\n\n"

        for i, data_file in enumerate(self.data_files):
            # 优先使用原始文件名，兜底使用 os.path.basename
            if i < len(self.data_file_names) and self.data_file_names[i]:
                filename = self.data_file_names[i]
            else:
                filename = os.path.basename(data_file)
            ext = os.path.splitext(filename)[1].lower()
            data_info += f"### 文件{i+1}: {filename} ({ext})\n"

            try:
                if ext == '.csv':
                    df = pd.read_csv(data_file, encoding='utf-8')
                elif ext in ('.xls', '.xlsx'):
                    df = pd.read_excel(data_file)

                escaped_path = data_file.replace('\\', '\\\\')
                data_info += f"- 文件路径: r'{data_file}'  或  '{escaped_path}'\n"
                data_info += f"- 总行数: {df.shape[0]}, 总列数: {df.shape[1]}\n"
                data_info += f"- 列名: {list(df.columns)}\n"
                data_info += f"- 数据类型:\n"
                for col, dtype in dict(df.dtypes).items():
                    data_info += f"  - {col}: {dtype}\n"

                if df.shape[0] > 0:
                    data_info += "\n- 完整数据内容（原始数据，直接使用）:\n"
                    data_info += "```csv\n"
                    data_info += ",".join(df.columns) + "\n"

                    for _, row in df.iterrows():
                        row_values = []
                        for col in df.columns:
                            val = row[col]
                            if pd.isna(val):
                                row_values.append("")
                            else:
                                row_values.append(str(val))
                        data_info += ",".join(row_values) + "\n"

                    data_info += "```\n"

            except Exception as e:
                data_info += f"- 无法读取文件内容: {str(e)}\n"

            data_info += "\n"

        return data_info

    async def learn_from_paper(self, paper_content):
        return await self.paper_learner.learn(paper_content)

    def validate_models(self, recommendation_json):
        valid_models = set(MODEL_LIBRARY.keys())
        errors = []

        if 'recommendations' not in recommendation_json:
            return errors

        for rec in recommendation_json['recommendations']:
            baseline_model = rec.get('baseline_model', '')
            if baseline_model and baseline_model not in valid_models:
                errors.append(f"基线模型 '{baseline_model}' 不在模型库中")

            advanced_models = rec.get('advanced_models', [])
            for model in advanced_models:
                if model not in valid_models:
                    errors.append(f"改进模型 '{model}' 不在模型库中")

        return errors

    def validate_images(self, recommendation_json):
        valid_images = set(IMAGE_LIBRARY.keys())
        errors = []

        if 'recommendations' not in recommendation_json:
            return errors

        for rec in recommendation_json['recommendations']:
            recommended_images = rec.get('recommended_images', [])
            for img in recommended_images:
                if img not in valid_images:
                    errors.append(f"图表类型 '{img}' 不在图片库中")

        return errors

    def validate_code_models(self, code_json):
        valid_models = set(MODEL_LIBRARY.keys())
        errors = []

        if 'code_sections' not in code_json:
            return errors

        for section in code_json['code_sections']:
            model_name = section.get('model_name', '')
            if model_name and model_name not in valid_models:
                errors.append(f"代码中使用的模型 '{model_name}' 不在模型库中")

        return errors

    def generate_paper_files(self, paper_json, output_dir=None, format='markdown'):
        if not isinstance(paper_json, dict):
            return None

        title = paper_json.get('title', '数学建模竞赛论文')
        abstract = paper_json.get('abstract', '')
        sections = paper_json.get('sections', [])

        if output_dir is None:
            output_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'output')
        os.makedirs(output_dir, exist_ok=True)

        return generate_paper(title, abstract, sections, format=format, output_dir=output_dir)

    def generate_markdown_paper(self, paper_json, output_dir=None):
        if not isinstance(paper_json, dict):
            return None

        title = paper_json.get('title', '数学建模竞赛论文')
        abstract = paper_json.get('abstract', '')
        sections = paper_json.get('sections', [])

        md_content = generate_paper_markdown(title, abstract, sections)

        if output_dir is None:
            output_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'output')
        os.makedirs(output_dir, exist_ok=True)

        md_output_path = os.path.join(output_dir, f'{title}_论文.md')
        with open(md_output_path, 'w', encoding='utf-8') as f:
            f.write(md_content)

        return md_output_path

    def convert_paper_to_docx(self, md_file_path, output_docx_path=None):
        return convert_markdown_to_docx(md_file_path, output_docx_path)

    def format_full_report(self, results):
        report_lines = []
        report_lines.append("# 数学建模论文生成报告")
        report_lines.append("")

        report_lines.append("## 1. 问题分析")
        report_lines.append("")
        if 'problem_analysis' in results:
            analysis_json = self._parse_json(results['problem_analysis'])
            if analysis_json:
                report_lines.append(f"- 问题类型: {analysis_json.get('problem_type', '未知')}")
                report_lines.append(f"- 核心目标: {analysis_json.get('core_objective', '未知')}")
                report_lines.append(f"- 约束条件: {len(analysis_json.get('constraints', []))} 条")
                report_lines.append(f"- 关键变量: {len(analysis_json.get('key_variables', []))} 个")
            else:
                report_lines.append(results['problem_analysis'][:500])
        report_lines.append("")

        report_lines.append("## 2. 模型推荐")
        report_lines.append("")
        if 'model_recommendations' in results:
            rec_json = self._parse_json(results['model_recommendations'])
            if rec_json and 'recommendations' in rec_json:
                for i, rec in enumerate(rec_json['recommendations'], 1):
                    report_lines.append(f"### 阶段 {i}: {rec.get('stage', '')}")
                    report_lines.append(f"- 基线模型: {rec.get('baseline_model', '')}")
                    report_lines.append(f"- 改进模型: {', '.join(rec.get('advanced_models', []))}")
                    report_lines.append(f"- 推荐图表: {', '.join(rec.get('recommended_images', []))}")
        report_lines.append("")

        report_lines.append("## 3. 代码生成")
        report_lines.append("")
        if 'code_generation' in results:
            code_json = self._parse_json(results['code_generation'])
            if code_json and 'main_code' in code_json:
                main_code = code_json['main_code']
                report_lines.append(f"- 主方案: {main_code.get('purpose', '')}")
                report_lines.append(f"- 状态: {'成功' if main_code.get('success') else '失败'}")
                if 'artifact_paths' in main_code:
                    report_lines.append(f"- 生成图表: {len(main_code['artifact_paths'])} 张")
            if 'baseline_codes' in results:
                report_lines.append(f"- 对照方案: {len(results['baseline_codes'])} 个")
        report_lines.append("")

        report_lines.append("## 4. 敏感性分析")
        report_lines.append("")
        if 'sensitivity_analysis' in results:
            sens_json = self._parse_json(results['sensitivity_analysis'])
            if sens_json:
                report_lines.append(f"- 状态: {'成功' if sens_json.get('success') else '失败'}")
                report_lines.append(f"- 参数数量: {len(sens_json.get('results', []))}")
                if 'interpretations' in sens_json:
                    for i, interp in enumerate(sens_json['interpretations'], 1):
                        report_lines.append(f"- 解读 {i}: {interp[:100]}...")
        report_lines.append("")

        report_lines.append("## 5. 图表质量评估")
        report_lines.append("")
        if 'figure_evaluation' in results:
            figures = results['figure_evaluation']
            if figures:
                total_score = sum(f.quality_score for f in figures)
                avg_score = round(total_score / len(figures), 2) if figures else 0
                report_lines.append(f"- 图表数量: {len(figures)}")
                report_lines.append(f"- 平均评分: {avg_score}/10")
                for i, fig in enumerate(figures, 1):
                    report_lines.append(f"- 图 {i}: {fig.purpose} (评分: {fig.quality_score}/10)")
            else:
                report_lines.append("- 暂无图表")
        report_lines.append("")

        report_lines.append("## 6. 论文评估")
        report_lines.append("")
        if 'evaluation_report' in results:
            eval_report = results['evaluation_report']
            report_lines.append(f"- 总分: {eval_report.total_score}/100")
            report_lines.append(f"- 加权总分: {eval_report.weighted_total}/100")
            report_lines.append("")
            report_lines.append("### 维度评分")
            report_lines.append(f"- 假设合理性: {eval_report.dimension_scores['assumption']}/100")
            report_lines.append(f"- 建模创新性: {eval_report.dimension_scores['innovation']}/100")
            report_lines.append(f"- 结果正确性: {eval_report.dimension_scores['correctness']}/100")
            report_lines.append(f"- 写作清晰性: {eval_report.dimension_scores['clarity']}/100")
            report_lines.append(f"- 综合深度: {eval_report.dimension_scores['depth']}/100")
            report_lines.append("")
            if eval_report.comments:
                report_lines.append("### 评审意见")
                for comment in eval_report.comments:
                    report_lines.append(f"- {comment}")
        report_lines.append("")

        report_lines.append("---")
        report_lines.append("*生成时间: " + pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S") + "*")

        return "\n".join(report_lines)