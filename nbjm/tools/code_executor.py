import io
import os
import re
import sys
import json
import base64
import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

_last_execution_figures = []


def get_last_figures():
    return _last_execution_figures


@dataclass
class RunResult:
    success: bool
    stdout: str = ""
    stderr: str = ""
    artifact_paths: list[str] = field(default_factory=list)
    error_kind: str = ""
    figures: list[str] = field(default_factory=list)


def _minimal_env() -> dict[str, str]:
    keys = [
        "PATH", "PYTHONPATH", "PYTHONHOME", "SystemRoot", "TEMP", "TMP", "LANG", "LC_ALL",
        "USERPROFILE", "HOMEDRIVE", "HOMEPATH", "HOME",
    ]
    env = {k: os.environ[k] for k in keys if k in os.environ}
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONUTF8"] = "1"
    return env


_REQUIRED_IMPORTS = {
    "numpy": {
        "pattern": r"(?<!import )(?:(?<!from )np\.)|numpy\.",
        "import_code": "import numpy as np",
        "marker": "import numpy",
    },
    "pandas": {
        "pattern": r"(?<!import )(?:(?<!from )pd\.)|pandas\.",
        "import_code": "import pandas as pd",
        "marker": "import pandas",
    },
    "matplotlib": {
        "pattern": r"(?<!import )(?:(?<!from )matplotlib\.)|plt\.",
        "import_code": "import matplotlib\nmatplotlib.use('Agg')\nimport matplotlib.pyplot as plt\nimport matplotlib.font_manager as fm\nimport os\nfont_path = os.path.join(os.environ.get('WINDIR', 'C:/Windows'), 'Fonts', 'simhei.ttf')\nif os.path.exists(font_path):\n    font_prop = fm.FontProperties(fname=font_path)\n    plt.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'DejaVu Sans', 'Arial Unicode MS']\nelse:\n    plt.rcParams['font.sans-serif'] = ['Microsoft YaHei', 'SimHei', 'DejaVu Sans', 'Arial Unicode MS']\nplt.rcParams['axes.unicode_minus'] = False\nplt.rcParams['font.size'] = 10\nplt.rcParams['axes.labelsize'] = 12\nplt.rcParams['axes.titlesize'] = 14\nplt.rcParams['xtick.labelsize'] = 10\nplt.rcParams['ytick.labelsize'] = 10\nplt.rcParams['legend.fontsize'] = 10",
        "marker": "import matplotlib",
    },
    "seaborn": {
        "pattern": r"(?<!import )(?:(?<!from )sns\.)|seaborn\.",
        "import_code": "import seaborn as sns",
        "marker": "import seaborn",
    },
    "scipy": {
        "pattern": r"(?<!import )(?:(?<!from )scipy\.)",
        "import_code": "import scipy",
        "marker": "import scipy",
    },
    "sklearn": {
        "pattern": r"(?<!import )(?:(?<!from )sklearn\.)",
        "import_code": "import sklearn",
        "marker": "import sklearn",
    },
}


def _fix_latex_escapes(code: str) -> str:
    latex_pattern = r"'([^']*\\[a-zA-Z][^']*)'"
    def fix_match(match):
        content = match.group(1)
        if any(seq in content for seq in ['\\alpha', '\\beta', '\\gamma', '\\delta', '\\epsilon', '\\zeta', 
                                           '\\eta', '\\theta', '\\iota', '\\kappa', '\\lambda', '\\mu', 
                                           '\\nu', '\\xi', '\\pi', '\\rho', '\\sigma', '\\tau', 
                                           '\\upsilon', '\\phi', '\\chi', '\\psi', '\\omega',
                                           '\\sum', '\\prod', '\\int', '\\frac', '\\sqrt', '\\cdot',
                                           '\\times', '\\div', '\\pm', '\\mp', '\\leq', '\\geq',
                                           '\\neq', '\\approx', '\\equiv', '\\infty', '\\partial']):
            return f"r'{content}'"
        return match.group(0)
    
    code = re.sub(latex_pattern, fix_match, code)
    
    fstring_pattern = r'f"([^"]*\\[a-zA-Z][^"]*)"'
    def fix_fmatch(match):
        content = match.group(1)
        if any(seq in content for seq in ['\\alpha', '\\beta', '\\gamma', '\\delta', '\\epsilon', '\\zeta', 
                                           '\\eta', '\\theta', '\\iota', '\\kappa', '\\lambda', '\\mu', 
                                           '\\nu', '\\xi', '\\pi', '\\rho', '\\sigma', '\\tau', 
                                           '\\upsilon', '\\phi', '\\chi', '\\psi', '\\omega',
                                           '\\sum', '\\prod', '\\int', '\\frac', '\\sqrt', '\\cdot',
                                           '\\times', '\\div', '\\pm', '\\mp', '\\leq', '\\geq',
                                           '\\neq', '\\approx', '\\equiv', '\\infty', '\\partial']):
            return f'rf"{content}"'
        return match.group(0)
    
    code = re.sub(fstring_pattern, fix_fmatch, code)
    
    fstring_pattern2 = r"f'([^']*\\[a-zA-Z][^']*)'"
    def fix_fmatch2(match):
        content = match.group(1)
        if any(seq in content for seq in ['\\alpha', '\\beta', '\\gamma', '\\delta', '\\epsilon', '\\zeta', 
                                           '\\eta', '\\theta', '\\iota', '\\kappa', '\\lambda', '\\mu', 
                                           '\\nu', '\\xi', '\\pi', '\\rho', '\\sigma', '\\tau', 
                                           '\\upsilon', '\\phi', '\\chi', '\\psi', '\\omega',
                                           '\\sum', '\\prod', '\\int', '\\frac', '\\sqrt', '\\cdot',
                                           '\\times', '\\div', '\\pm', '\\mp', '\\leq', '\\geq',
                                           '\\neq', '\\approx', '\\equiv', '\\infty', '\\partial']):
            return f"rf'{content}'"
        return match.group(0)
    
    code = re.sub(fstring_pattern2, fix_fmatch2, code)
    
    return code


def _auto_fix_imports(code: str) -> str:
    import_lines: list[str] = []
    added_font_config = False
    
    for lib_name, config in _REQUIRED_IMPORTS.items():
        if re.search(config["pattern"], code):
            if config["marker"] not in code:
                import_lines.append(config["import_code"])
    
    if 'matplotlib' in code.lower() or 'plt' in code:
        font_config = """import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import os
font_path = os.path.join(os.environ.get('WINDIR', 'C:/Windows'), 'Fonts', 'simhei.ttf')
if os.path.exists(font_path):
    fm.fontManager.addfont(font_path)
    plt.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'DejaVu Sans', 'Arial Unicode MS']
else:
    plt.rcParams['font.sans-serif'] = ['Microsoft YaHei', 'SimHei', 'DejaVu Sans', 'Arial Unicode MS']
plt.rcParams['axes.unicode_minus'] = False
plt.rcParams['font.size'] = 10
plt.rcParams['axes.labelsize'] = 12
plt.rcParams['axes.titlesize'] = 14
plt.rcParams['xtick.labelsize'] = 10
plt.rcParams['ytick.labelsize'] = 10
plt.rcParams['legend.fontsize'] = 10"""
        
        if 'plt.rcParams' not in code:
            import_lines.insert(0, font_config)
            added_font_config = True
        else:
            code = _fix_font_config(code)
    
    if not import_lines:
        return code
    
    import_section = "\n".join(import_lines)
    
    first_line = code.split("\n")[0] if code else ""
    if first_line.strip().startswith("#"):
        lines = code.split("\n", 1)
        return lines[0] + "\n" + import_section + "\n" + (lines[1] if len(lines) > 1 else "")
    
    return import_section + "\n" + code


def _fix_font_config(code: str) -> str:
    code = re.sub(r"plt\.rcParams\['font\.sans-serif'\]\s*=\s*\[.*?\]", 
                  "plt.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'DejaVu Sans', 'Arial Unicode MS']", 
                  code)
    code = re.sub(r"matplotlib\.rcParams\['font\.sans-serif'\]\s*=\s*\[.*?\]", 
                  "matplotlib.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'DejaVu Sans', 'Arial Unicode MS']", 
                  code)
    return code


def _fix_index_bounds(code: str) -> str:
    code = _fix_numpy_random_scale(code)
    code = _fix_array_index_variables(code)
    return code


def _fix_numpy_random_scale(code: str) -> str:
    lines = code.split('\n')
    fixed_lines = []
    
    for line in lines:
        if 'np.random.' not in line or 'max(0,' in line:
            fixed_lines.append(line)
            continue
        
        if 'scale=' in line:
            pattern = r"(np\.random\.\w+\()([^)]*?scale=)([^,)]+)"
            def fix_scale(match):
                prefix = match.group(1)
                middle = match.group(2)
                scale_expr = match.group(3).strip()
                if 'max(0,' in scale_expr:
                    return match.group(0)
                return f"{prefix}{middle}max(0, {scale_expr})"
            line = re.sub(pattern, fix_scale, line)
        
        if 'std=' in line:
            pattern2 = r"(np\.random\.\w+\()([^)]*?std=)([^,)]+)"
            def fix_std(match):
                prefix = match.group(1)
                middle = match.group(2)
                std_expr = match.group(3).strip()
                if 'max(0,' in std_expr:
                    return match.group(0)
                return f"{prefix}{middle}max(0, {std_expr})"
            line = re.sub(pattern2, fix_std, line)
        
        if 'scale=' not in line and 'np.random.normal(' in line:
            pattern3 = r"(np\.random\.normal\()([^,)]+),\s*([^,)]+)"
            def fix_normal_position(match):
                prefix = match.group(1)
                loc_expr = match.group(2).strip()
                scale_expr = match.group(3).strip()
                if 'max(0,' in scale_expr:
                    return match.group(0)
                return f"{prefix}{loc_expr}, max(0, {scale_expr})"
            line = re.sub(pattern3, fix_normal_position, line)
        
        fixed_lines.append(line)
    
    return '\n'.join(fixed_lines)


def _fix_array_index_variables(code: str) -> str:
    patterns_applied = set()
    
    def fix_single_index(match):
        arr_name = match.group(1)
        index_expr = match.group(2)
        key = f"{arr_name}[{index_expr}]"
        if key in patterns_applied:
            return match.group(0)
        patterns_applied.add(key)
        
        if index_expr.strip() in [':', '...']:
            return match.group(0)
        
        return f"{arr_name}[min({index_expr}, len({arr_name})-1)]"
    
    pattern = r"(\w+)\[(\w+)\](?!\s*\()"
    code = re.sub(pattern, fix_single_index, code)
    
    def fix_multi_index(match):
        arr_name = match.group(1)
        index_expr = match.group(2)
        key = f"{arr_name}[{index_expr}]"
        if key in patterns_applied:
            return match.group(0)
        patterns_applied.add(key)
        
        parts = index_expr.split(',')
        has_variable = False
        for part in parts:
            part = part.strip()
            if part not in [':', '...', ''] and not re.match(r'^\d*:\d*$', part):
                has_variable = True
                break
        if not has_variable:
            return match.group(0)
        
        fixed_parts = []
        for j, part in enumerate(parts):
            part = part.strip()
            if part not in [':', '...', '']:
                if re.match(r'^\d*:\d*$', part):
                    fixed_parts.append(part)
                elif 'len(' in part or 'shape' in part or 'clip(' in part or 'min(' in part:
                    fixed_parts.append(part)
                else:
                    fixed_parts.append(f"np.clip({part}, 0, len({arr_name})-1)")
            else:
                fixed_parts.append(part)
        return f"{arr_name}[{', '.join(fixed_parts)}]"
    
    pattern2 = r"(\w+)\[([^\[\]]*:[^\[\]]*)\](?!\s*\()"
    code = re.sub(pattern2, fix_multi_index, code)
    
    return code


def _fix_seaborn_palette(code: str) -> str:
    lines = code.split('\n')
    fixed_lines = []
    
    for line in lines:
        if 'sns.' not in line or 'palette=' not in line or 'hue=' in line:
            fixed_lines.append(line)
            continue
        
        if 'sns.boxplot(' in line or 'sns.barplot(' in line or 'sns.violinplot(' in line:
            match = re.search(r"(sns\.(?:boxplot|barplot|violinplot)\()([^)]*?)(palette=)([^,)]+)", line)
            if match:
                prefix = match.group(1)
                args_before = match.group(2)
                palette_expr = match.group(4).strip()
                
                x_match = re.search(r"x=([^,)]+)", args_before)
                if x_match and 'hue=' not in args_before:
                    x_var = x_match.group(1).strip()
                    new_args = args_before.rstrip(', ') + f', hue={x_var}, legend=False, palette={palette_expr}'
                    line = line[:match.start()] + prefix + new_args + line[match.end():]
        
        fixed_lines.append(line)
    
    return '\n'.join(fixed_lines)


def _fix_numpy_2_compatibility(code: str) -> str:
    code = re.sub(r'\bnp\.trapz\b', 'np.trapezoid', code)
    code = re.sub(r'\bnumpy\.trapz\b', 'numpy.trapezoid', code)
    
    code = re.sub(r'\bnp\.int\b', 'int', code)
    code = re.sub(r'\bnumpy\.int\b', 'int', code)
    
    code = re.sub(r'\bnp\.float\b', 'float', code)
    code = re.sub(r'\bnumpy\.float\b', 'float', code)
    
    code = re.sub(r'\bnp\.bool\b', 'bool', code)
    code = re.sub(r'\bnumpy\.bool\b', 'bool', code)
    
    code = re.sub(r'\bnp\.array_str\b', 'np.array2string', code)
    code = re.sub(r'\bnumpy\.array_str\b', 'numpy.array2string', code)
    
    return code


def _auto_fix_code(code: str) -> str:
    code = _auto_fix_imports(code)
    code = _fix_latex_escapes(code)
    code = _fix_index_bounds(code)
    code = _fix_seaborn_palette(code)
    code = _fix_numpy_2_compatibility(code)
    return code


_RESULT_LINE_RE = re.compile(
    r"^RESULT:\s*(?:baseline|scenario|method|config|parameter)=(\S+)\s+(.+)$",
    re.MULTILINE,
)
_RESULT_PAIR_RE = re.compile(r"(\w+)=(-?\d+\.?\d*(?:[eE][+-]?\d+)?)")


def extract_numeric_results(stdout: str) -> dict[str, dict[str, float]]:
    results: dict[str, dict[str, float]] = {}
    for m in _RESULT_LINE_RE.finditer(stdout):
        identifier = m.group(1)
        pairs_str = m.group(2)
        metrics: dict[str, float] = {}
        for pm in _RESULT_PAIR_RE.finditer(pairs_str):
            metrics[pm.group(1)] = float(pm.group(2))
        if metrics:
            results[identifier] = metrics
    return results


def run_python(code: str, *, workdir=None, timeout=120) -> RunResult:
    if workdir is None:
        workdir = Path(tempfile.mkdtemp(prefix="mathmodel_"))
    else:
        workdir = Path(workdir).resolve()
        workdir.mkdir(parents=True, exist_ok=True)

    code = _auto_fix_code(code)
    script = workdir / "_run.py"
    script.write_text(code, encoding="utf-8")

    before = {p.name for p in workdir.iterdir()}

    results_txt_path = str(workdir / "results.txt")
    stdout_buffer = []
    stderr_buffer = []

    try:
        proc = subprocess.Popen(
            [sys.executable, str(script)],
            cwd=workdir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            env=None,
        )

        with open(results_txt_path, "w", encoding="utf-8") as results_file:
            results_file.write("=== 代码运行结果 ===\n\n")
            
            while proc.poll() is None:
                line = proc.stdout.readline()
                if line:
                    stdout_buffer.append(line)
                    results_file.write(line)
                    results_file.flush()
            
            for line in proc.stdout:
                stdout_buffer.append(line)
                results_file.write(line)
            
            for line in proc.stderr:
                stderr_buffer.append(line)

        proc.wait(timeout=timeout)

    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait()
        return RunResult(
            success=False,
            stdout="".join(stdout_buffer),
            stderr=f"timeout after {timeout}s",
            error_kind="timeout",
        )
    except Exception as e:
        return RunResult(
            success=False,
            stdout="".join(stdout_buffer),
            stderr=str(e),
            error_kind="exception",
        )

    after = {p.name for p in workdir.iterdir()}
    new_files = sorted(after - before - {"_run.py"})

    figures = []
    artifact_paths = []
    for name in new_files:
        path = str(workdir / name)
        artifact_paths.append(path)
        if name.lower().endswith(".png"):
            try:
                with open(path, "rb") as f:
                    figures.append(base64.b64encode(f.read()).decode())
            except Exception:
                pass

    if results_txt_path not in artifact_paths:
        artifact_paths.append(results_txt_path)

    stdout_text = "".join(stdout_buffer)
    stderr_text = "".join(stderr_buffer)

    return RunResult(
        success=proc.returncode == 0,
        stdout=stdout_text or "",
        stderr=stderr_text or "",
        artifact_paths=artifact_paths,
        error_kind="" if proc.returncode == 0 else "runtime",
        figures=figures,
    )


def run_python_code(code, timeout=120):
    result = run_python(code, timeout=timeout)

    if result.success:
        return {
            "success": True,
            "output": result.stdout,
            "figures": result.figures,
            "error": result.stderr if result.stderr.strip() else "",
            "artifact_paths": result.artifact_paths,
        }
    else:
        error_msg = f"{result.error_kind}: {result.stderr}" if result.error_kind else result.stderr
        return {
            "success": False,
            "output": result.stdout,
            "figures": [],
            "error": error_msg,
            "error_kind": result.error_kind,
        }