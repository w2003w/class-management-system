import json
import os

IMAGE_LIBRARY_PATH = os.path.join(os.path.dirname(__file__), 'image_library.json')

def load_image_library():
    if os.path.exists(IMAGE_LIBRARY_PATH):
        with open(IMAGE_LIBRARY_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_image_library(library):
    with open(IMAGE_LIBRARY_PATH, 'w', encoding='utf-8') as f:
        json.dump(library, f, ensure_ascii=False, indent=4)

def add_image_type(image_name, image_info):
    library = load_image_library()
    library[image_name] = image_info
    save_image_library(library)

def update_image_type(image_name, image_info):
    library = load_image_library()
    if image_name in library:
        library[image_name] = image_info
        save_image_library(library)
        return True
    return False

def delete_image_type(image_name):
    library = load_image_library()
    if image_name in library:
        del library[image_name]
        save_image_library(library)
        return True
    return False

def get_image_type(image_name):
    library = load_image_library()
    return library.get(image_name)

def get_all_image_types():
    return load_image_library()

def get_images_by_category(category):
    library = load_image_library()
    return {name: info for name, info in library.items() if info.get('category') == category}

def get_images_for_model(model_name):
    library = load_image_library()
    matching_images = []
    for name, info in library.items():
        suggested_models = info.get('suggested_models', [])
        if model_name in suggested_models:
            matching_images.append(name)
    return matching_images

def get_all_categories():
    library = load_image_library()
    categories = set()
    for info in library.values():
        categories.add(info.get('category', '其他'))
    return sorted(list(categories))

IMAGE_LIBRARY = load_image_library()