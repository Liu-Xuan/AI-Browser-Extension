from flask import Blueprint, request, jsonify
from services.temp_knowledge import TempKnowledgeService
import os

bp = Blueprint('temp_knowledge', __name__, url_prefix='/api/temp-knowledge')
temp_knowledge_service = TempKnowledgeService()

@bp.route('/documents', methods=['GET'])
def list_documents():
    """获取临时知识库中的所有文档"""
    try:
        documents = temp_knowledge_service.list_documents()
        return jsonify({
            'success': True,
            'documents': documents
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/upload', methods=['POST'])
def upload_file():
    """上传文件到临时知识库"""
    try:
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': '没有上传文件'
            }), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': '没有选择文件'
            }), 400
            
        # 保存上传的文件到临时目录
        temp_path = f"temp_{file.filename}"
        file.save(temp_path)
        
        # 上传文件到知识库
        doc_id = temp_knowledge_service.upload_file(temp_path)
        
        # 删除临时文件
        os.remove(temp_path)
        
        if doc_id:
            return jsonify({
                'success': True,
                'document_id': doc_id
            })
        else:
            return jsonify({
                'success': False,
                'error': '上传文件失败'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/webpage', methods=['POST'])
def add_webpage():
    """添加网页内容到临时知识库"""
    try:
        data = request.get_json()
        title = data.get('title')
        content = data.get('content')
        url = data.get('url')
        
        if not all([title, content, url]):
            return jsonify({
                'success': False,
                'error': '缺少必要参数'
            }), 400
            
        doc_id = temp_knowledge_service.add_webpage_content(title, content, url)
        
        if doc_id:
            return jsonify({
                'success': True,
                'document_id': doc_id
            })
        else:
            return jsonify({
                'success': False,
                'error': '添加网页内容失败'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/documents/<doc_id>', methods=['DELETE'])
def delete_document(doc_id):
    """删除指定文档"""
    try:
        success = temp_knowledge_service.delete_document(doc_id)
        return jsonify({
            'success': success
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/clear-unlocked', methods=['POST'])
def clear_unlocked():
    """清除未锁定的文档"""
    try:
        data = request.get_json()
        locked_ids = data.get('locked_ids', [])
        
        success = temp_knowledge_service.clear_unlocked_documents(locked_ids)
        return jsonify({
            'success': success
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 