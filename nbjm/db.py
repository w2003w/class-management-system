"""
Supabase 数据库客户端模块
替代所有本地文件存储，统一使用 Supabase 进行数据持久化
"""
import os
import json
import time
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://szbskrqdhyhnikxijkoo.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "sb_publishable_XCL_dgmSDnEEz0IEB1SXxQ_kAmRtejU")

_supabase_client = None


def get_client():
    """获取 Supabase 客户端（单例）"""
    global _supabase_client
    if _supabase_client is None:
        from supabase import create_client
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        _supabase_client.postgrest.session.verify = False
    return _supabase_client


# ============================================================
# 系统配置（替代 mode.txt）
# ============================================================

def get_config(key):
    """获取配置值"""
    client = get_client()
    result = client.table('system_config').select('value').eq('key', key).execute()
    if result.data:
        return result.data[0]['value']
    return None


def set_config(key, value):
    """设置配置值"""
    client = get_client()
    try:
        result = client.table('system_config').update({
            'value': str(value),
            'updated_at': datetime.utcnow().isoformat()
        }).eq('key', key).execute()
        if result.data:
            return
    except Exception:
        pass
    client.table('system_config').insert({
        'key': key,
        'value': str(value),
        'updated_at': datetime.utcnow().isoformat()
    }).execute()


def get_current_mode():
    """获取当前模式"""
    mode = get_config('mode')
    return mode if mode else 'mode1'


def set_current_mode(mode):
    """设置当前模式"""
    set_config('mode', mode)


# ============================================================
# 用户会话（替代 user_sessions.json）
# ============================================================

def get_session_data(session_id):
    """获取单个会话数据"""
    client = get_client()
    result = client.table('user_sessions').select('*').eq('session_id', session_id).execute()
    if result.data:
        return result.data[0].get('data', {})
    return {}


def get_all_sessions():
    """获取所有会话"""
    client = get_client()
    result = client.table('user_sessions').select('*').order('created_at', desc=True).execute()
    sessions = {}
    for row in result.data:
        data = row.get('data', {})
        data['created_at'] = row.get('created_at', '')
        sessions[row['session_id']] = data
    return sessions


def create_session(session_id, data=None):
    """创建新会话"""
    client = get_client()
    try:
        result = client.table('user_sessions').update({
            'data': data or {},
            'updated_at': datetime.utcnow().isoformat()
        }).eq('session_id', session_id).execute()
        if result.data:
            return
    except Exception:
        pass
    client.table('user_sessions').insert({
        'session_id': session_id,
        'data': data or {},
        'created_at': datetime.utcnow().isoformat(),
        'updated_at': datetime.utcnow().isoformat()
    }).execute()


def update_session_data(session_id, data):
    """更新会话数据（合并）"""
    client = get_client()
    existing = get_session_data(session_id)
    existing.update(data)
    try:
        result = client.table('user_sessions').update({
            'data': existing,
            'updated_at': datetime.utcnow().isoformat()
        }).eq('session_id', session_id).execute()
        if result.data:
            return
    except Exception:
        pass
    client.table('user_sessions').insert({
        'session_id': session_id,
        'data': existing,
        'created_at': datetime.utcnow().isoformat(),
        'updated_at': datetime.utcnow().isoformat()
    }).execute()


def delete_session(session_id):
    """删除会话"""
    client = get_client()
    client.table('user_sessions').delete().eq('session_id', session_id).execute()


# ============================================================
# 卡密管理（替代 card_codes.json）
# ============================================================

def get_card_code(card_code):
    """获取单个卡密信息"""
    client = get_client()
    result = client.table('card_codes').select('*').eq('code', card_code).execute()
    if result.data:
        return result.data[0]
    return None


def get_all_card_codes():
    """获取所有卡密"""
    client = get_client()
    result = client.table('card_codes').select('*').order('created_at', desc=True).execute()
    return result.data or []


def create_card_code_entry(code, amount):
    """创建卡密记录，amount为卡密初始余额"""
    client = get_client()
    try:
        result = client.table('card_codes').update({
            'amount': amount,
            'balance': amount,
        }).eq('code', code).execute()
        if result.data:
            return
    except Exception:
        pass
    client.table('card_codes').insert({
        'code': code,
        'amount': amount,
        'balance': amount,
        'created_at': datetime.utcnow().isoformat()
    }).execute()


def delete_card_code_entry(code):
    """删除卡密"""
    client = get_client()
    client.table('card_codes').delete().eq('code', code).execute()


def get_card_usage_log(code):
    """获取卡密使用日志"""
    client = get_client()
    result = client.table('card_usage_log').select('*').eq('code', code).order('used_at', desc=True).execute()
    return result.data or []


def add_card_usage_log(code, session_id, amount):
    """添加卡密使用日志"""
    client = get_client()
    client.table('card_usage_log').insert({
        'code': code,
        'session_id': session_id,
        'amount': amount,
        'used_at': datetime.utcnow().isoformat()
    }).execute()


# ============================================================
# 用户余额（替代 user_card.json）
# ============================================================

def get_user_card(session_id):
    """获取用户卡密余额"""
    client = get_client()
    result = client.table('user_cards').select('*').eq('session_id', session_id).execute()
    if result.data:
        return result.data[0]
    return None


def get_all_user_cards():
    """获取所有用户余额"""
    client = get_client()
    result = client.table('user_cards').select('*').order('balance', desc=True).execute()
    return result.data or []


def get_user_balance(session_id):
    """获取用户余额数值（实时从卡密余额读取）"""
    user_card = get_user_card(session_id)
    if not user_card:
        return 0
    
    card_code = user_card.get('card_code')
    if card_code:
        card = get_card_code(card_code)
        if card:
            card_balance = card.get('balance')
            if card_balance is None:
                card_balance = card.get('amount', 0)
                client = get_client()
                client.table('card_codes').update({
                    'balance': card_balance,
                    'updated_at': datetime.utcnow().isoformat()
                }).eq('code', card_code).execute()
            return card_balance
    
    return user_card.get('balance', 0)


def create_user_card(session_id, balance=0, card_code=None):
    """创建用户余额记录"""
    client = get_client()
    try:
        result = client.table('user_cards').update({
            'balance': balance,
            'card_code': card_code,
            'updated_at': datetime.utcnow().isoformat()
        }).eq('session_id', session_id).execute()
        if result.data:
            return
    except Exception:
        pass
    client.table('user_cards').insert({
        'session_id': session_id,
        'balance': balance,
        'card_code': card_code,
        'created_at': datetime.utcnow().isoformat(),
        'updated_at': datetime.utcnow().isoformat()
    }).execute()


def update_user_balance(session_id, new_balance):
    """更新用户余额"""
    client = get_client()
    client.table('user_cards').update({
        'balance': new_balance,
        'updated_at': datetime.utcnow().isoformat()
    }).eq('session_id', session_id).execute()


def add_deduction_history(session_id, amount, step=''):
    """添加扣费记录"""
    client = get_client()
    client.table('deduction_history').insert({
        'session_id': session_id,
        'amount': amount,
        'step': step,
        'created_at': datetime.utcnow().isoformat()
    }).execute()


def get_deduction_history(session_id):
    """获取扣费历史"""
    client = get_client()
    result = client.table('deduction_history').select('*').eq('session_id', session_id).order('created_at', desc=True).execute()
    return result.data or []


# ============================================================
# 文件存储（替代本地文件读写）
# 使用 stored_files 表的 bytea 列存储文件
# ============================================================

def save_file(session_id, file_key, file_name, file_data):
    """
    保存文件到数据库
    file_data: bytes 类型
    使用Base64编码存储，先删后插避免 update 权限问题
    """
    client = get_client()
    import base64
    encoded_data = base64.b64encode(file_data).decode('utf-8')
    # 先删除旧记录（忽略不存在的情况）
    try:
        client.table('stored_files').delete().eq('session_id', session_id).eq('file_key', file_key).execute()
    except Exception:
        pass
    # 插入新记录
    try:
        client.table('stored_files').insert({
            'session_id': session_id,
            'file_key': file_key,
            'file_name': file_name,
            'file_data': encoded_data,
            'file_size': len(file_data),
            'created_at': datetime.utcnow().isoformat()
        }).execute()
    except Exception as e:
        # 如果文件太大，尝试截断保存
        raise RuntimeError(f"文件保存失败: {file_name} ({len(file_data)} bytes) - {e}")


def get_file(session_id, file_key):
    """
    获取文件
    返回: (file_name, file_data_bytes) 或 (None, None)
    """
    client = get_client()
    result = client.table('stored_files').select('*').eq('session_id', session_id).eq('file_key', file_key).execute()
    if result.data:
        row = result.data[0]
        import base64
        try:
            file_data = base64.b64decode(row['file_data']) if isinstance(row['file_data'], str) else bytes(row['file_data'])
        except:
            try:
                file_data = bytes.fromhex(row['file_data']) if isinstance(row['file_data'], str) else bytes(row['file_data'])
            except:
                file_data = b''
        return row['file_name'], file_data
    return None, None


def get_session_files(session_id):
    """获取会话下所有文件列表"""
    client = get_client()
    result = client.table('stored_files').select('file_key, file_name, created_at').eq('session_id', session_id).execute()
    return result.data or []


def get_user_files(session_id):
    """获取用户所有文件（含完整数据）"""
    client = get_client()
    result = client.table('stored_files').select('*').eq('session_id', session_id).execute()
    files = []
    import base64
    for row in result.data or []:
        try:
            file_data = base64.b64decode(row['file_data']) if isinstance(row['file_data'], str) else bytes(row['file_data'])
        except:
            try:
                file_data = bytes.fromhex(row['file_data']) if isinstance(row['file_data'], str) else bytes(row['file_data'])
            except:
                file_data = b''
        files.append({
            'file_key': row['file_key'],
            'file_name': row['file_name'],
            'file_data': file_data,
            'file_type': row.get('file_type', ''),
            'created_at': row.get('created_at', '')
        })
    return files


def delete_file(session_id, file_key):
    """删除文件"""
    client = get_client()
    client.table('stored_files').delete().eq('session_id', session_id).eq('file_key', file_key).execute()


def delete_session_files(session_id):
    """删除会话下所有文件"""
    client = get_client()
    client.table('stored_files').delete().eq('session_id', session_id).execute()


# ============================================================
# 便捷函数（兼容原有接口）
# ============================================================

def generate_card_code(length=16):
    """生成随机卡密码"""
    import random
    import string
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choice(chars) for _ in range(length))


def create_card_codes(amount, count=1):
    """批量创建卡密，返回卡密码列表"""
    codes = []
    for _ in range(count):
        code = generate_card_code()
        while get_card_code(code) is not None:
            code = generate_card_code()
        create_card_code_entry(code, amount)
        codes.append(code)
    return codes


def activate_card(session_id, card_code_str):
    """
    激活卡密（卡密余额共享，多个用户可共用同一卡密）
    用户激活后绑定到该卡密，卡密余额保持不变
    返回: (success: bool, message: str)
    """
    card = get_card_code(card_code_str)
    if not card:
        return False, "卡密不存在"

    card_balance = card.get('balance', 0)
    if card_balance <= 0:
        return False, "卡密余额已用完"

    user_card = get_user_card(session_id)
    is_new_user = user_card is None

    if is_new_user:
        create_user_card(session_id, card_balance, card_code_str)
    else:
        update_user_balance(session_id, card_balance)
        client = get_client()
        client.table('user_cards').update({
            'card_code': card_code_str,
            'updated_at': datetime.utcnow().isoformat()
        }).eq('session_id', session_id).execute()

    add_card_usage_log(card_code_str, session_id, 0)

    return True, f"激活成功！卡密余额: {card_balance} 次"


def add_card_balance(card_code_str, amount):
    """
    为卡密充值（管理员操作）
    返回: (success: bool, message: str)
    """
    card = get_card_code(card_code_str)
    if not card:
        return False, "卡密不存在"

    current_balance = card.get('balance', 0)
    new_balance = current_balance + amount

    client = get_client()
    client.table('card_codes').update({
        'balance': new_balance,
        'updated_at': datetime.utcnow().isoformat()
    }).eq('code', card_code_str).execute()

    return True, f"充值成功！卡密余额: {new_balance} 次"


def deduct_from_card(card_code_str, amount):
    """
    从卡密余额中扣除次数
    返回: (success: bool, message: str, new_balance: int)
    """
    card = get_card_code(card_code_str)
    if not card:
        return False, "卡密不存在", 0

    card_balance = card.get('balance', 0)
    if card_balance < amount:
        return False, f"卡密余额不足，当前余额: {card_balance} 次", card_balance

    new_balance = card_balance - amount

    client = get_client()
    client.table('card_codes').update({
        'balance': new_balance,
        'updated_at': datetime.utcnow().isoformat()
    }).eq('code', card_code_str).execute()

    return True, f"扣除成功，卡密余额: {new_balance} 次", new_balance


def deduct_balance(session_id, amount, step=''):
    """
    扣除余额（从卡密余额中扣除）
    返回: (success: bool, message: str)
    """
    user_card = get_user_card(session_id)
    if not user_card:
        return False, "用户未激活卡密"

    card_code = user_card.get('card_code')
    if not card_code:
        return False, "用户未绑定卡密"

    success, msg, new_card_balance = deduct_from_card(card_code, amount)
    if not success:
        return False, msg

    update_user_balance(session_id, new_card_balance)
    add_deduction_history(session_id, amount, step)

    return True, f"扣除成功，卡密余额: {new_card_balance} 次"


# ============================================================
# 模型扣费规则（替代硬编码的 MODEL_DEDUCT_RATES）
# ============================================================

def get_model_deduct_rule(model_name, module_name):
    """获取模型在指定模块的扣费次数"""
    client = get_client()
    result = client.table('model_deduct_rules').select('deduct_count').eq('model_name', model_name).eq('module_name', module_name).execute()
    if result.data:
        return result.data[0]['deduct_count']
    return 1


def get_all_model_deduct_rules():
    """获取所有模型扣费规则"""
    client = get_client()
    result = client.table('model_deduct_rules').select('*').order('model_name').order('module_name').execute()
    return result.data or []


def update_model_deduct_rule(model_name, module_name, deduct_count):
    """更新模型扣费规则"""
    client = get_client()
    # 先尝试更新
    result = client.table('model_deduct_rules').update({
        'deduct_count': deduct_count,
        'updated_at': datetime.utcnow().isoformat()
    }).eq('model_name', model_name).eq('module_name', module_name).execute()
    
    # 如果没有更新任何行，则插入新记录
    if not result.data:
        client.table('model_deduct_rules').insert({
            'model_name': model_name,
            'module_name': module_name,
            'deduct_count': deduct_count,
            'updated_at': datetime.utcnow().isoformat()
        }).execute()


def delete_model_deduct_rule(model_name, module_name):
    """删除模型扣费规则"""
    client = get_client()
    client.table('model_deduct_rules').delete().eq('model_name', model_name).eq('module_name', module_name).execute()


def get_model_deduct_rules_by_model(model_name):
    """获取指定模型的所有扣费规则"""
    client = get_client()
    result = client.table('model_deduct_rules').select('*').eq('model_name', model_name).order('module_name').execute()
    return result.data or []


# ============================================================
# 文件过期清理
# ============================================================

def cleanup_expired_files(hours=1):
    """清理指定小时数之前创建的文件"""
    client = get_client()
    import datetime
    cutoff_time = (datetime.datetime.utcnow() - datetime.timedelta(hours=hours)).isoformat()
    client.table('stored_files').delete().lt('created_at', cutoff_time).execute()


def cleanup_expired_sessions(hours=24):
    """清理指定小时数之前创建的会话（保留余额记录）"""
    client = get_client()
    import datetime
    cutoff_time = (datetime.datetime.utcnow() - datetime.timedelta(hours=hours)).isoformat()
    client.table('user_sessions').delete().lt('created_at', cutoff_time).execute()
