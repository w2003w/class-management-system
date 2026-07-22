import re

def audit_paper(content):
    issues = []
    
    if not content:
        issues.append({"level": "error", "message": "论文内容为空"})
        return issues
    
    if "摘要" not in content:
        issues.append({"level": "warning", "message": "缺少摘要章节"})
    
    if "问题重述" not in content:
        issues.append({"level": "warning", "message": "缺少问题重述章节"})
    
    if "模型假设" not in content:
        issues.append({"level": "warning", "message": "缺少模型假设章节"})
    
    if "符号说明" not in content and "符号与变量" not in content:
        issues.append({"level": "warning", "message": "缺少符号说明章节"})
    
    if "模型建立" not in content:
        issues.append({"level": "error", "message": "缺少模型建立章节"})
    
    if "求解方法" not in content and "求解" not in content:
        issues.append({"level": "warning", "message": "缺少求解方法章节"})
    
    if "结果分析" not in content and "结果" not in content:
        issues.append({"level": "warning", "message": "缺少结果分析章节"})
    
    if "参考文献" not in content:
        issues.append({"level": "warning", "message": "缺少参考文献章节"})
    
    placeholder_patterns = [
        r'\[待补充\]', r'\[TODO\]', r'\[未完成\]', r'\[此处省略',
        r'xxx', r'XXX', r'待填写', r'待定'
    ]
    for pattern in placeholder_patterns:
        if re.search(pattern, content):
            issues.append({"level": "error", "message": f"存在占位符: {pattern}"})
            break
    
    formula_count = len(re.findall(r'\$\$.*?\$\$|\$.*?\$', content))
    if formula_count < 3:
        issues.append({"level": "warning", "message": f"公式数量较少（{formula_count}个），建议增加公式说明"})
    
    figure_count = len(re.findall(r'图\s*\d+|Figure\s*\d+', content))
    table_count = len(re.findall(r'表\s*\d+|Table\s*\d+', content))
    
    if figure_count == 0:
        issues.append({"level": "warning", "message": "未发现图表引用，建议添加图表"})
    if table_count == 0:
        issues.append({"level": "warning", "message": "未发现表格引用，建议添加表格"})
    
    word_count = len(content)
    if word_count < 3000:
        issues.append({"level": "warning", "message": f"论文字数较少（{word_count}字），建议扩充内容"})
    
    if len(issues) == 0:
        issues.append({"level": "success", "message": "论文审计通过，结构完整"})
    
    return issues

def generate_qa_report(content, output_path=None):
    issues = audit_paper(content)
    
    report = "📋 论文质量审计报告\n"
    report += "=" * 50 + "\n\n"
    
    error_count = sum(1 for i in issues if i["level"] == "error")
    warning_count = sum(1 for i in issues if i["level"] == "warning")
    
    report += f"📊 审计结果：{error_count} 个错误，{warning_count} 个警告\n\n"
    
    if error_count > 0:
        report += "❌ 错误项：\n"
        for issue in issues:
            if issue["level"] == "error":
                report += f"  - {issue['message']}\n"
        report += "\n"
    
    if warning_count > 0:
        report += "⚠️ 警告项：\n"
        for issue in issues:
            if issue["level"] == "warning":
                report += f"  - {issue['message']}\n"
        report += "\n"
    
    if all(i["level"] == "success" for i in issues):
        report += "✅ 所有检查项通过！\n"
    
    if output_path:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(report)
    
    return report, issues