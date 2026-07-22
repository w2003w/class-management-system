import json
import os

MODEL_LIBRARY_PATH = os.path.join(os.path.dirname(__file__), 'model_library.json')

def load_model_library():
    if os.path.exists(MODEL_LIBRARY_PATH):
        with open(MODEL_LIBRARY_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_model_library(library):
    with open(MODEL_LIBRARY_PATH, 'w', encoding='utf-8') as f:
        json.dump(library, f, ensure_ascii=False, indent=4)

def add_model(model_name, model_info):
    library = load_model_library()
    library[model_name] = model_info
    save_model_library(library)

def update_model(model_name, model_info):
    library = load_model_library()
    if model_name in library:
        library[model_name] = model_info
        save_model_library(library)
        return True
    return False

def delete_model(model_name):
    library = load_model_library()
    if model_name in library:
        del library[model_name]
        save_model_library(library)
        return True
    return False

def get_model(model_name):
    library = load_model_library()
    return library.get(model_name)

def get_all_models():
    return load_model_library()

def get_models_by_category(category):
    library = load_model_library()
    return {name: info for name, info in library.items() if info.get('category') == category}

MODEL_LIBRARY = load_model_library()

TASK_TYPE_MODELS = {
    "预测类": ["灰色预测模型 GM(1,1)", "ARIMA 模型", "LSTM 神经网络"],
    "评价类": ["层次分析法 (AHP)", "TOPSIS 法", "熵权法", "PCA 主成分分析"],
    "优化类": ["线性规划 (LP)", "多目标规划", "蒙特卡洛仿真"],
    "机器学习": ["K-means 聚类", "DBSCAN 聚类", "Logistic 回归", "随机森林", "XGBoost"],
    "机理建模": ["微分方程模型"]
}

def recommend_models(task_type):
    return TASK_TYPE_MODELS.get(task_type, [])