from flask import Flask
from flask_cors import CORS
from routes import chat, knowledge, summarizer, qa, translator, temp_knowledge

def create_app():
    app = Flask(__name__)
    CORS(app)
    
    # 注册路由
    app.register_blueprint(chat.bp)
    app.register_blueprint(knowledge.bp)
    app.register_blueprint(summarizer.bp)
    app.register_blueprint(qa.bp)
    app.register_blueprint(translator.bp)
    app.register_blueprint(temp_knowledge.bp)
    
    return app

app = create_app() 