from tools.code_executor import run_python, extract_numeric_results
import re
import json
import os
import tempfile
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt


class SensitivityAnalyzer:
    PLAN_SYSTEM = """你是国赛评委关心的敏感性分析专家。请基于已有的最终模型和已确认假设，
选出1-3个最值得做敏感性分析的参数。优先选标记了sensitivity_relevant=True的假设里出现的参数。"""

    PLAN_PROMPT = """# 敏感性分析计划任务

## 最终模型
{{model_description}}

方程：
{{equations}}

## 假设
{{assumptions}}

请输出JSON：{"runs": [{"parameter": str, "values": [float, ...], "metric": str, "rationale": str}], ...}，
每个run的values至少5个点，跨度合理（涵盖参数典型范围的±30%~50%）。"""

    CODE_SYSTEM = """你是建模队工程师。根据敏感性分析计划，写一段独立可运行的Python，
对每个run计算metric随parameter变化的曲线，并保存PNG到当前目录。

约束：
- 只用numpy/scipy/matplotlib；
- 为每个run单独保存一张*.png；
- 中文字体设置：开头加 `matplotlib.rcParams['font.sans-serif']=['Microsoft YaHei','SimHei','DejaVu Sans']; matplotlib.rcParams['axes.unicode_minus']=False`；

**IRON RULE：代码开头必须显式import所有用到的库**——
`import numpy as np; import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt`，
不得依赖外部已导入的变量或隐式导入。缺import会直接导致NameError；

**结果输出要求**：
用print输出 `RESULT: parameter=<名称字面量> values=<list> results=<list>` 行（每个run一行），
**parameter必须是字符串字面量（如 `parameter=alpha`），不要写 `parameter={alpha}` 这种把变量值代入的写法**，
values/results用Python列表的repr（例如 `[0.1, 0.2, 0.3]`），方便正则解析。

## 绘图质量要求
(1) 每张图只论证一个参数的敏感性，title写 `Sensitivity of <metric> to <parameter>`；
(2) 必备：title、x轴=parameter名+单位、y轴=metric名+单位、legend（如多曲线）；
(3) 发表级rcParams：savefig dpi≥300、font.size≥10、axes.linewidth=0.8、关闭右上脊柱；
(4) 配色克制：单参数曲线用一种主色；网格alpha≤0.3。"""

    CODE_PROMPT = """# 敏感性分析代码生成任务

## 最终模型
{{model_description}}

方程：
{{equations}}

## 敏感性分析计划
{{plan}}

{{prev_failure}}

请输出JSON：{"code": str}。"""

    INTERPRET_SYSTEM = """你是国赛主笔。根据敏感性分析的数值结果，写出每个参数的解读（趋势+含义+对结论的影响），
每条80-150字，避免空话。

解读要求：
- 明确趋势：递增/递减/先增后减/无显著变化
- 量化影响：敏感性幅度（如"参数增加10%，指标变化5%"）
- 管理含义：对实际决策的指导意义
- 与题目关联：敏感性结果如何验证或修正模型结论"""

    INTERPRET_PROMPT = """# 敏感性分析解读任务

## 数值结果
{{results}}

请输出JSON：{"interpretations": [str, ...]}，长度与上面行数一致。"""

    def __init__(self, llm_client, model_name="qwen-plus"):
        self.llm_client = llm_client
        self.model_name = model_name
        self.MAX_CODE_RETRIES = 1

    def _parse_json(self, json_str):
        if not json_str:
            return None
        try:
            cleaned = json_str.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
            cleaned = re.sub(r"[\x00-\x1F\x7F]", "", cleaned)
            match = re.search(r'\{.*\}', cleaned, re.DOTALL)
            if match:
                cleaned = match.group(0)
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            print(f"[DEBUG] JSON解析失败: {e}")
            print(f"[DEBUG] 原始内容前500字符: {json_str[:500]}")
            return None

    async def plan(self, model_recommendations, problem_analysis):
        model_json = self._parse_json(model_recommendations)
        problem_json = self._parse_json(problem_analysis)

        model_description = ""
        equations = []
        assumptions = ""

        print(f"[DEBUG] model_json keys: {list(model_json.keys()) if model_json else None}")
        
        if model_json and 'model_versions' in model_json:
            final_model = next((r for r in reversed(model_json['model_versions'])
                                if r.get('stage') == 'final'), None)
            if not final_model and model_json['model_versions']:
                final_model = model_json['model_versions'][-1]
            if final_model:
                model_description = final_model.get('description', '')
                equations = final_model.get('equations', [])
        elif model_json and 'recommendations' in model_json:
            final_model = next((r for r in reversed(model_json['recommendations'])
                                if r.get('stage') == 'final'), None)
            if not final_model and model_json['recommendations']:
                final_model = model_json['recommendations'][-1]
            if final_model:
                model_description = final_model.get('description', '')
                equations = final_model.get('equations', [])

        print(f"[DEBUG] model_description长度: {len(model_description)}")
        print(f"[DEBUG] equations数量: {len(equations)}")
        
        print(f"[DEBUG] problem_json keys: {list(problem_json.keys()) if problem_json else None}")
        
        if problem_json and 'assumptions' in problem_json:
            assumptions = "\n".join(
                f"- [{'敏感' if a.get('sensitivity_relevant') else '常规'}] {a.get('statement', '')}"
                for a in problem_json['assumptions']
            )
        elif problem_json:
            for key in problem_json:
                if isinstance(problem_json[key], list):
                    for item in problem_json[key]:
                        if isinstance(item, dict) and 'assumption' in item:
                            assumptions += f"- [常规] {item['assumption']}\n"

        print(f"[DEBUG] assumptions长度: {len(assumptions)}")

        eqs_str = "\n".join(f"- {e}" for e in equations)

        prompt = self.PLAN_PROMPT.replace("{{model_description}}", model_description)
        prompt = prompt.replace("{{equations}}", eqs_str)
        prompt = prompt.replace("{{assumptions}}", assumptions)

        messages = [
            {"role": "system", "content": self.PLAN_SYSTEM},
            {"role": "user", "content": prompt}
        ]

        response = self.llm_client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=0.4
        )

        result = response.choices[0].message.content
        print(f"[DEBUG] LLM返回规划内容前500字符:\n{result[:500]}")
        return result

    async def generate_code(self, model_recommendations, plan, prev_error=None, prev_error_kind=""):
        model_json = self._parse_json(model_recommendations)
        model_description = ""
        equations = []

        if model_json and 'model_versions' in model_json:
            final_model = next((r for r in reversed(model_json['model_versions'])
                                if r.get('stage') == 'final'), None)
            if not final_model and model_json['model_versions']:
                final_model = model_json['model_versions'][-1]
            if final_model:
                model_description = final_model.get('description', '')
                equations = final_model.get('equations', [])
        elif model_json and 'recommendations' in model_json:
            final_model = next((r for r in reversed(model_json['recommendations'])
                                if r.get('stage') == 'final'), None)
            if not final_model and model_json['recommendations']:
                final_model = model_json['recommendations'][-1]
            if final_model:
                model_description = final_model.get('description', '')
                equations = final_model.get('equations', [])

        eqs_str = "\n".join(equations) if isinstance(equations, list) else str(equations)

        plan_json = self._parse_json(plan)
        plan_desc = ""
        if plan_json and 'runs' in plan_json:
            plan_desc = "\n".join(
                f"- parameter={r['parameter']}, values={r['values']}, metric={r['metric']}"
                for r in plan_json['runs']
            )

        fb = ""
        if prev_error:
            if prev_error_kind == "timeout":
                fb = (
                    "\n# 上次扫参超时\n"
                    f"标记：{prev_error[:200]}\n"
                    "请**大幅缩小扫参规模**（示例：每个参数的values缩到3-5个点、"
                    "内层仿真步数减半），保证5分钟内跑完；扫参逻辑不必改。\n"
                )
            else:
                fb = (
                    f"\n# 上次运行失败（runtime）\n"
                    f"stderr节选：\n{prev_error[:1000]}\n请修正后重试。\n"
                )

        prompt = self.CODE_PROMPT.replace("{{model_description}}", model_description)
        prompt = prompt.replace("{{equations}}", eqs_str)
        prompt = prompt.replace("{{plan}}", plan_desc)
        prompt = prompt.replace("{{prev_failure}}", fb)

        messages = [
            {"role": "system", "content": self.CODE_SYSTEM},
            {"role": "user", "content": prompt}
        ]

        response = self.llm_client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=0.4
        )

        return response.choices[0].message.content

    async def run_code(self, code, workdir=None, timeout=300):

        if workdir is None:
            workdir = tempfile.mkdtemp(prefix="sensitivity_")
        else:
            workdir = os.path.abspath(workdir)

        prev_err = None
        prev_kind = ""

        for attempt in range(self.MAX_CODE_RETRIES + 1):
            result = run_python(code, workdir=workdir, timeout=timeout)

            if result.success:
                return {
                    "success": True,
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "artifact_paths": result.artifact_paths,
                    "error_kind": "",
                    "attempt": attempt + 1,
                    "results": extract_numeric_results(result.stdout)
                }

            prev_err = result.stderr
            prev_kind = result.error_kind

        return {
            "success": False,
            "stdout": result.stdout if result else "",
            "stderr": result.stderr if result else "",
            "artifact_paths": result.artifact_paths if result else [],
            "error_kind": result.error_kind if result else "",
            "attempt": self.MAX_CODE_RETRIES + 1,
            "results": {}
        }

    def _extract_sensitivity_results(self, stdout):
        results = []
        result_pattern = re.compile(
            r"RESULT:\s*parameter=(\S+)\s+values=(\[[^\]]+\])\s+results=(\[[^\]]+\])",
            re.MULTILINE
        )
        for match in result_pattern.finditer(stdout):
            param = match.group(1)
            try:
                values = eval(match.group(2))
                metrics = eval(match.group(3))
                results.append({
                    "parameter": param,
                    "values": values,
                    "results": metrics
                })
            except:
                results.append({
                    "parameter": param,
                    "values": [],
                    "results": []
                })
        return results

    async def interpret(self, plan, code_results):
        plan_json = self._parse_json(plan)
        results_json = self._parse_json(code_results)

        rows = []
        plan_runs = []
        if plan_json and 'runs' in plan_json:
            plan_runs = plan_json['runs']
            for r in plan_runs:
                parameter = r.get('parameter', '')
                values = r.get('values', [])
                metric = r.get('metric', '')
                rows.append(f"- 计划: {parameter} ∈ {values}, 观测指标: {metric}")

        actual_results = []
        if results_json:
            if 'results' in results_json and isinstance(results_json['results'], list):
                for r in results_json['results']:
                    param = r.get('parameter', '')
                    metrics = r.get('metrics', '')
                    rows.append(f"- 实际: {param} → {metrics}")
                    actual_results.append(r)
            elif 'stdout' in results_json:
                parsed_results = self._extract_sensitivity_results(results_json['stdout'])
                for r in parsed_results:
                    param = r.get('parameter', '')
                    values = r.get('values', [])
                    metrics = r.get('results', [])
                    rows.append(f"- 实际: {param} ∈ {values} → 结果={metrics}")
                    actual_results.append(r)
                if not parsed_results:
                    rows.append(f"- stdout内容: {results_json['stdout'][:500]}")

        for i, run in enumerate(plan_runs):
            param = run.get('parameter', '')
            metric = run.get('metric', '')
            rationale = run.get('rationale', '')
            found = None
            for ar in actual_results:
                if ar.get('parameter') == param:
                    found = ar
                    break
            if found:
                values = found.get('values', [])
                results = found.get('results', [])
                if len(values) == len(results):
                    data_pairs = ", ".join(f"{v}→{r}" for v, r in zip(values, results))
                    rows.append(f"\n### {param} 敏感性分析结果")
                    rows.append(f"- 指标: {metric}")
                    rows.append(f"- 分析理由: {rationale}")
                    rows.append(f"- 数据点: {data_pairs}")
                    if len(values) >= 2 and results:
                        first_val, last_val = values[0], values[-1]
                        first_res, last_res = results[0], results[-1]
                        if isinstance(first_res, (int, float)) and isinstance(last_res, (int, float)):
                            diff = last_res - first_res
                            pct_change = (diff / first_res * 100) if first_res != 0 else 0
                            rows.append(f"- 变化趋势: {first_res:.4f} → {last_res:.4f}")
                            rows.append(f"- 绝对变化: {diff:.4f}")
                            rows.append(f"- 相对变化: {pct_change:.2f}%")
                else:
                    rows.append(f"\n### {param} 敏感性分析结果")
                    rows.append(f"- 指标: {metric}")
                    rows.append(f"- 分析理由: {rationale}")
                    rows.append(f"- 数值: {results}")

        results_text = "\n".join(rows)
        if not rows:
            results_text = "暂无敏感性分析数值结果"

        prompt = self.INTERPRET_PROMPT.replace("{{results}}", results_text)

        messages = [
            {"role": "system", "content": self.INTERPRET_SYSTEM},
            {"role": "user", "content": prompt}
        ]

        response = self.llm_client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=0.3
        )

        return response.choices[0].message.content

    async def full_analysis(self, model_recommendations, problem_analysis):

        print("📊 步骤1：规划敏感性分析参数...")
        plan_result = await self.plan(model_recommendations, problem_analysis)
        plan_json = self._parse_json(plan_result)

        print(f"[DEBUG] plan_json: {plan_json}")
        print(f"[DEBUG] plan_json类型: {type(plan_json)}")
        if plan_json:
            print(f"[DEBUG] plan_json keys: {list(plan_json.keys())}")

        if not plan_json or 'runs' not in plan_json:
            error_msg = f"敏感性分析计划生成失败，LLM返回内容前500字符: {plan_result[:500]}"
            print(f"[DEBUG] {error_msg}")
            return json.dumps({
                "success": False,
                "error": error_msg,
                "plan": plan_result,
                "code": "",
                "results": [],
                "interpretations": []
            }, ensure_ascii=False)

        print("📊 步骤2：生成敏感性分析代码...")
        code_result = await self.generate_code(model_recommendations, plan_result)
        code_json = self._parse_json(code_result)

        if not code_json or 'code' not in code_json:
            return json.dumps({
                "success": False,
                "error": "敏感性分析代码生成失败",
                "plan": plan_result,
                "code": "",
                "results": [],
                "interpretations": []
            }, ensure_ascii=False)

        workdir = tempfile.mkdtemp(prefix="sensitivity_analysis_")
        print("📊 步骤3：运行敏感性分析代码...")
        run_result = await self.run_code(code_json['code'], workdir=workdir)

        results = []
        parsed_results = []
        if run_result['success']:
            stdout = run_result.get('stdout', '')
            parsed_results = self._extract_sensitivity_results(stdout)
            if parsed_results:
                for r in parsed_results:
                    results.append({
                        "parameter": r.get('parameter', ''),
                        "values": r.get('values', []),
                        "results": r.get('results', []),
                        "metrics": dict(zip(r.get('values', []), r.get('results', [])))
                    })
            elif run_result['results']:
                for param, metrics in run_result['results'].items():
                    results.append({
                        "parameter": param,
                        "metrics": metrics
                    })
            else:
                results.append({"parameter": "unknown", "metrics": stdout[:500]})

        print("📊 步骤4：解读敏感性分析结果...")
        run_result_for_interpret = {
            "success": run_result['success'],
            "stdout": run_result.get('stdout', ''),
            "results": parsed_results if parsed_results else run_result.get('results', {}),
            "stderr": run_result.get('stderr', '')
        }
        interpret_result = await self.interpret(plan_result, json.dumps(run_result_for_interpret))
        interpret_json = self._parse_json(interpret_result)

        interpretations = []
        if interpret_json and 'interpretations' in interpret_json:
            interpretations = interpret_json['interpretations']

        final_result = {
            "success": run_result['success'],
            "plan": plan_result,
            "code": code_json['code'],
            "code_results": run_result,
            "results": results,
            "interpretations": interpretations,
            "artifact_paths": run_result.get('artifact_paths', [])
        }

        print("✅ 敏感性分析完成")
        return json.dumps(final_result, ensure_ascii=False, indent=2)