import os
import json

PAPER_KNOWLEDGE_FILE = os.path.join(os.path.dirname(__file__), 'paper_knowledge.json')

def load_paper_knowledge():
    if os.path.exists(PAPER_KNOWLEDGE_FILE):
        with open(PAPER_KNOWLEDGE_FILE, 'r', encoding='utf-8') as f:
            knowledge = json.load(f)
        
        if 'competitions' not in knowledge:
            knowledge['competitions'] = {}
        if 'models' not in knowledge:
            knowledge['models'] = []
        if 'images' not in knowledge:
            knowledge['images'] = []
        
        return knowledge
    
    return {
        "competitions": {},
        "models": [],
        "images": []
    }

def save_paper_knowledge(knowledge):
    with open(PAPER_KNOWLEDGE_FILE, 'w', encoding='utf-8') as f:
        json.dump(knowledge, f, ensure_ascii=False, indent=2)

def add_paper(paper_info):
    knowledge = load_paper_knowledge()
    
    competition = paper_info.get('competition', '未知')
    
    if competition not in knowledge['competitions']:
        knowledge['competitions'][competition] = {
            "papers": [],
            "prompts": {
                "problem_analysis": [],
                "model_selection": [],
                "modeling_approach": [],
                "solution_method": [],
                "result_analysis": [],
                "paper_structure": []
            },
            "structure": {},
            "writing_style": "",
            "experience_summary": ""
        }
    
    knowledge['competitions'][competition]['papers'].append(paper_info)
    
    if 'prompts' in paper_info:
        prompts = paper_info['prompts']
        for prompt_type, prompt_list in prompts.items():
            if prompt_type in knowledge['competitions'][competition]['prompts']:
                for prompt in prompt_list:
                    knowledge['competitions'][competition]['prompts'][prompt_type].append(prompt)
    
    if 'structure' in paper_info:
        structure = paper_info['structure']
        if not knowledge['competitions'][competition]['structure']:
            knowledge['competitions'][competition]['structure'] = structure
        else:
            existing = knowledge['competitions'][competition]['structure']
            if 'word_count' in structure and 'word_count' in existing:
                for section, count in structure['word_count'].items():
                    if section in existing['word_count']:
                        existing['word_count'][section] = int((existing['word_count'][section] + count) / 2)
                    else:
                        existing['word_count'][section] = count
    
    if 'writing_style' in paper_info:
        style = paper_info['writing_style']
        if knowledge['competitions'][competition]['writing_style']:
            knowledge['competitions'][competition]['writing_style'] += "；" + style
        else:
            knowledge['competitions'][competition]['writing_style'] = style
    
    if 'experience_summary' in paper_info:
        summary = paper_info['experience_summary']
        if knowledge['competitions'][competition]['experience_summary']:
            knowledge['competitions'][competition]['experience_summary'] += "；" + summary
        else:
            knowledge['competitions'][competition]['experience_summary'] = summary
    
    if 'models' in paper_info:
        for model in paper_info['models']:
            existing_models = [m['name'] for m in knowledge['models']]
            if model['name'] not in existing_models:
                knowledge['models'].append(model)
    
    if 'images' in paper_info:
        for img in paper_info['images']:
            existing_images = [i['name'] for i in knowledge['images']]
            if img['name'] not in existing_images:
                knowledge['images'].append(img)
    
    save_paper_knowledge(knowledge)

def get_competitions():
    knowledge = load_paper_knowledge()
    return list(knowledge['competitions'].keys())

def get_competition_prompts(competition_name):
    knowledge = load_paper_knowledge()
    if competition_name in knowledge['competitions']:
        return knowledge['competitions'][competition_name].get('prompts', {})
    return {}

def get_competition_structure(competition_name):
    knowledge = load_paper_knowledge()
    if competition_name in knowledge['competitions']:
        return knowledge['competitions'][competition_name].get('structure', {})
    return {}

def get_competition_info(competition_name):
    knowledge = load_paper_knowledge()
    if competition_name in knowledge['competitions']:
        return knowledge['competitions'][competition_name]
    return {}

def get_all_prompts_from_competition(competition_name):
    prompts = get_competition_prompts(competition_name)
    all_prompts = []
    for prompt_type, prompt_list in prompts.items():
        for prompt in prompt_list:
            all_prompts.append({
                'category': prompt_type,
                'content': prompt.get('content', ''),
                'usage_scenario': prompt.get('usage_scenario', ''),
                'effect': prompt.get('effect', '')
            })
    return all_prompts

def get_all_models_from_knowledge():
    knowledge = load_paper_knowledge()
    return knowledge['models']

def get_all_images_from_knowledge():
    knowledge = load_paper_knowledge()
    return knowledge['images']

def get_all_papers():
    knowledge = load_paper_knowledge()
    return knowledge

def delete_paper(paper_title):
    knowledge = load_paper_knowledge()
    
    for competition, comp_info in knowledge['competitions'].items():
        papers = comp_info.get('papers', [])
        for i, paper in enumerate(papers):
            if paper.get('paper_title') == paper_title:
                removed_paper = papers.pop(i)
                
                if 'models' in removed_paper:
                    for model in removed_paper['models']:
                        model_names = [m['name'] for m in knowledge['models']]
                        if model['name'] in model_names:
                            idx = model_names.index(model['name'])
                            is_used = False
                            for other_comp, other_info in knowledge['competitions'].items():
                                for other_paper in other_info.get('papers', []):
                                    if 'models' in other_paper:
                                        for m in other_paper['models']:
                                            if m['name'] == model['name']:
                                                is_used = True
                                                break
                                        if is_used:
                                            break
                            if not is_used:
                                knowledge['models'].pop(idx)
                
                if 'images' in removed_paper:
                    for img in removed_paper['images']:
                        img_names = [i['name'] for i in knowledge['images']]
                        if img['name'] in img_names:
                            idx = img_names.index(img['name'])
                            is_used = False
                            for other_comp, other_info in knowledge['competitions'].items():
                                for other_paper in other_info.get('papers', []):
                                    if 'images' in other_paper:
                                        for i in other_paper['images']:
                                            if i['name'] == img['name']:
                                                is_used = True
                                                break
                                        if is_used:
                                            break
                            if not is_used:
                                knowledge['images'].pop(idx)
                
                if not comp_info['papers']:
                    del knowledge['competitions'][competition]
                
                save_paper_knowledge(knowledge)
                return True
    
    return False