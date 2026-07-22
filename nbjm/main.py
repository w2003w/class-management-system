import asyncio
import argparse
import json
import os

from config import settings
from llm.providers import load_providers, get_provider
from agents import Coordinator
from tools.code_executor import run_python_code
from tools.data_processor import parse_file
from tools.paper_generator import generate_paper
from tools.qa_auditor import generate_qa_report

def parse_args():
    parser = argparse.ArgumentParser(description="数学建模智能体")
    parser.add_argument("--problem", type=str, help="赛题文件路径")
    parser.add_argument("--text", type=str, help="赛题文本内容")
    parser.add_argument("--provider", type=str, default=settings.DEFAULT_PROVIDER, help="LLM提供商")
    parser.add_argument("--output", type=str, default=settings.OUTPUT_DIR, help="输出目录")
    parser.add_argument("--mode", type=str, choices=['full', 'analyze', 'recommend', 'code', 'paper'], default='full', help="运行模式")
    return parser.parse_args()

def init_coordinator(provider_name):
    provider = get_provider(provider_name)
    if not provider or not provider.available:
        print(f"❌ 提供商 {provider_name} 不可用")
        return None
    client = provider.create_client()
    if not client:
        print(f"❌ 无法创建 {provider_name} 客户端")
        return None
    return Coordinator(client)

def load_problem(problem_path):
    if not os.path.exists(problem_path):
        print(f"❌ 文件不存在: {problem_path}")
        return None
    return parse_file(problem_path)

async def main():
    args = parse_args()
    
    if args.problem:
        problem_text = load_problem(args.problem)
        if not problem_text:
            return
    elif args.text:
        problem_text = args.text
    else:
        print("❌ 请提供 --problem 或 --text 参数")
        return
    
    os.makedirs(args.output, exist_ok=True)
    
    coordinator = init_coordinator(args.provider)
    if not coordinator:
        return
    
    print(f"🔧 使用提供商: {args.provider}")
    print(f"📂 输出目录: {args.output}")
    print()
    
    if args.mode == 'full' or args.mode == 'analyze':
        print("🔍 步骤1：问题分析...")
        analysis_result = await coordinator.analyze_problem(problem_text)
        print("✅ 问题分析完成")
        
        with open(os.path.join(args.output, 'problem_analysis.json'), 'w', encoding='utf-8') as f:
            f.write(analysis_result)
        
        print(f"📄 分析结果已保存到: {os.path.join(args.output, 'problem_analysis.json')}")
        print()
    
    else:
        analysis_result = None
        analysis_file = os.path.join(args.output, 'problem_analysis.json')
        if os.path.exists(analysis_file):
            with open(analysis_file, 'r', encoding='utf-8') as f:
                analysis_result = f.read()
    
    if args.mode == 'full' or args.mode == 'recommend':
        if not analysis_result:
            print("❌ 缺少问题分析结果")
            return
        
        print("🧠 步骤2：模型推荐...")
        recommendation_result = await coordinator.recommend_models(analysis_result)
        print("✅ 模型推荐完成")
        
        with open(os.path.join(args.output, 'model_recommendations.json'), 'w', encoding='utf-8') as f:
            f.write(recommendation_result)
        
        print(f"📄 推荐结果已保存到: {os.path.join(args.output, 'model_recommendations.json')}")
        print()
    
    else:
        recommendation_result = None
        rec_file = os.path.join(args.output, 'model_recommendations.json')
        if os.path.exists(rec_file):
            with open(rec_file, 'r', encoding='utf-8') as f:
                recommendation_result = f.read()
    
    if args.mode == 'full' or args.mode == 'code':
        if not analysis_result or not recommendation_result:
            print("❌ 缺少分析结果或推荐结果")
            return
        
        print("💻 步骤3：代码生成...")
        code_result = await coordinator.generate_code(analysis_result, recommendation_result)
        print("✅ 代码生成完成")
        
        with open(os.path.join(args.output, 'code_generation.json'), 'w', encoding='utf-8') as f:
            f.write(code_result)
        
        print(f"📄 代码已保存到: {os.path.join(args.output, 'code_generation.json')}")
        print()
    
    else:
        code_result = None
        code_file = os.path.join(args.output, 'code_generation.json')
        if os.path.exists(code_file):
            with open(code_file, 'r', encoding='utf-8') as f:
                code_result = f.read()
    
    if args.mode == 'full' or args.mode == 'paper':
        if not analysis_result or not recommendation_result or not code_result:
            print("❌ 缺少必要的前置结果")
            return
        
        print("📝 步骤4：论文写作...")
        paper_result = await coordinator.write_paper(analysis_result, recommendation_result, code_result)
        print("✅ 论文写作完成")
        
        with open(os.path.join(args.output, 'paper_result.json'), 'w', encoding='utf-8') as f:
            f.write(paper_result)
        
        print(f"📄 论文结果已保存到: {os.path.join(args.output, 'paper_result.json')}")
        
        try:
            paper_data = json.loads(paper_result.replace("```json", "").replace("```", "").strip())
            output_path = generate_paper(
                paper_data.get('title', '数学建模论文'),
                paper_data.get('abstract', ''),
                paper_data.get('sections', []),
                format='docx',
                output_dir=args.output
            )
            print(f"📄 Word论文已保存到: {output_path}")
        except:
            print("⚠️ Word论文生成失败")
        
        print()
    
    print("🎉 流程完成！")

if __name__ == "__main__":
    asyncio.run(main())