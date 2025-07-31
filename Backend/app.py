from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import uuid
import os
import json

app = Flask(__name__, static_folder='../static', static_url_path='/static')
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:mypassword@localhost/astegni'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Paths to additional folders
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PICTURES_DIR = os.path.join(BASE_DIR, '..', 'pictures')
VIDEOS_DIR = os.path.join(BASE_DIR, '..', 'videos')
DOCUMENTS_DIR = os.path.join(BASE_DIR, '..', 'documents')
JSON_DIR = os.path.join(BASE_DIR, '..', 'jason')

# Database Models
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True)
    phone = db.Column(db.String(20), unique=True)
    social_platform = db.Column(db.String(50))
    social_address = db.Column(db.String(120), unique=True)
    password = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(50), nullable=False)
    gender = db.Column(db.String(20))
    guardian_type = db.Column(db.String(50))
    institute_type = db.Column(db.String(50))

class Ad(db.Model):
    __tablename__ = 'ads'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    content = db.Column(db.String(500), nullable=False)
    image_url = db.Column(db.String(200), nullable=False)

class News(db.Model):
    __tablename__ = 'news'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)

class Partner(db.Model):
    __tablename__ = 'partners'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    logo_url = db.Column(db.String(200), nullable=False)

class BackgroundImage(db.Model):
    __tablename__ = 'background_images'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    image_url = db.Column(db.String(200), nullable=False)

# Initialize database
with app.app_context():
    db.create_all()

# Load JSON data
def load_json_data(filename):
    try:
        with open(os.path.join(JSON_DIR, filename), 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return []

# Sample data (fallback if JSON files are missing)
def init_sample_data():
    if not BackgroundImage.query.first():
        images = load_json_data('images.json') or [
            {'id': str(uuid.uuid4()), 'image_url': '/pictures/image1.jpg'},
            {'id': str(uuid.uuid4()), 'image_url': '/pictures/image2.jpg'},
            {'id': str(uuid.uuid4()), 'image_url': '/pictures/image3.jpg'}
        ]
        for img in images:
            db.session.add(BackgroundImage(id=img['id'], image_url=img['image_url']))
    
    if not Ad.query.first():
        ads = load_json_data('ads.json') or [
            {'id': str(uuid.uuid4()), 'content': 'Learn with top tutors!', 'image_url': '/pictures/ad1.jpg'},
            {'id': str(uuid.uuid4()), 'content': 'Join our online classes!', 'image_url': '/pictures/ad2.jpg'},
            {'id': str(uuid.uuid4()), 'content': 'Best educational resources!', 'image_url': '/pictures/ad3.jpg'}
        ]
        for ad in ads:
            db.session.add(Ad(id=ad['id'], content=ad['content'], image_url=ad['image_url']))

    if not News.query.first():
        news = load_json_data('news.json') or [
            {'id': str(uuid.uuid4()), 'title': 'New Tutor Program Launched', 'content': 'Join our new tutor program for advanced learning.'},
            {'id': str(uuid.uuid4()), 'title': 'Online Classes Now Available', 'content': 'Explore our wide range of online courses.'},
            {'id': str(uuid.uuid4()), 'title': 'Astegni Partners with Schools', 'content': 'We are excited to collaborate with top schools.'}
        ]
        for n in news:
            db.session.add(News(id=n['id'], title=n['title'], content=n['content']))

    if not Partner.query.first():
        partners = load_json_data('partners.json') or [
            {'id': str(uuid.uuid4()), 'name': 'School A', 'logo_url': '/pictures/partner1.jpg'},
            {'id': str(uuid.uuid4()), 'name': 'Institute B', 'logo_url': '/pictures/partner2.jpg'},
            {'id': str(uuid.uuid4()), 'name': 'Organization C', 'logo_url': '/pictures/partner3.jpg'}
        ]
        for p in partners:
            db.session.add(Partner(id=p['id'], name=p['name'], logo_url=p['logo_url']))

    db.session.commit()

with app.app_context():
    init_sample_data()

# Routes for serving additional static folders
@app.route('/pictures/<path:filename>')
def serve_pictures(filename):
    return send_from_directory(PICTURES_DIR, filename)

@app.route('/videos/<path:filename>')
def serve_videos(filename):
    return send_from_directory(VIDEOS_DIR, filename)

@app.route('/documents/<path:filename>')
def serve_documents(filename):
    return send_from_directory(DOCUMENTS_DIR, filename)

# API Routes
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name')
    role = data.get('role')
    password = data.get('password')
    email = data.get('email')
    phone = data.get('phone')
    social_platform = data.get('social_platform')
    social_address = data.get('social_address')
    gender = data.get('gender')
    guardian_type = data.get('guardian_type')
    institute_type = data.get('institute_type')

    if not name or not role or not password:
        return jsonify({'message': 'Name, role, and password are required'}), 400

    hashed_password = generate_password_hash(password)
    user = User(
        name=name,
        email=email,
        phone=phone,
        social_platform=social_platform,
        social_address=social_address,
        password=hashed_password,
        role=role,
        gender=gender,
        guardian_type=guardian_type,
        institute_type=institute_type
    )
    try:
        db.session.add(user)
        db.session.commit()
        return jsonify({'user': {'id': user.id, 'name': user.name, 'role': user.role}})
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Registration failed: ' + str(e)}), 400

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    phone = data.get('phone')
    social_platform = data.get('social_platform')
    social_address = data.get('social_address')
    password = data.get('password')

    query = []
    if email:
        query.append(User.email == email)
    if phone:
        query.append(User.phone == phone)
    if social_platform and social_address:
        query.append((User.social_platform == social_platform) & (User.social_address == social_address))

    if not query:
        return jsonify({'message': 'Invalid login credentials'}), 400

    user = User.query.filter(db.or_(*query)).first()
    if user and check_password_hash(user.password, password):
        return jsonify({'user': {'id': user.id, 'name': user.name, 'role': user.role}})
    return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/api/background_images', methods=['GET'])
def get_background_images():
    images = BackgroundImage.query.all()
    return jsonify([{'id': img.id, 'image_url': img.image_url} for img in images])

@app.route('/api/ads', methods=['GET'])
def get_ads():
    ads = Ad.query.all()
    return jsonify([{'id': ad.id, 'content': ad.content, 'image_url': ad.image_url} for ad in ads])

@app.route('/api/news', methods=['GET'])
def get_news():
    news = News.query.all()
    return jsonify([{'id': n.id, 'title': n.title, 'content': n.content} for n in news])

@app.route('/api/partners', methods=['GET'])
def get_partners():
    partners = Partner.query.all()
    return jsonify([{'id': p.id, 'name': p.name, 'logo_url': p.logo_url} for p in partners])

@app.route('/api/videos', methods=['GET'])
def get_videos():
    return jsonify(load_json_data('videos.json') or [
        {'id': '1', 'url': '/videos/video1.mp4'},
        {'id': '2', 'url': '/videos/video2.mp4'},
        {'id': '3', 'url': '/videos/video3.mp4'}
    ])

@app.route('/')
def serve_index():
    return app.send_static_file('index.html')

if __name__ == '__main__':
    app.run(debug=True)