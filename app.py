
from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
from datetime import datetime
import logging
from dotenv import load_dotenv
import csv
from pymongo import MongoClient
from bson import ObjectId
import json
import uuid
import traceback
import atexit

# Import database connection and models
try:
    from config.database import connect_db, disconnect_db
    from models.student import Student
    from models.contact import Contact
    from routes.students import students_bp
    from routes.contact import contact_bp
    MONGODB_AVAILABLE = True
except ImportError:
    print("MongoDB modules not available, using local storage")
    MONGODB_AVAILABLE = False

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')
app.config['MONGODB_URI'] = os.getenv('MONGODB_URI', '')

# CORS configuration
cors_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
if os.getenv('NODE_ENV') == 'production':
    cors_origins = [os.getenv('PRODUCTION_DOMAIN')]

CORS(app, origins=cors_origins, supports_credentials=True)

# Rate limiting
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=["100 per 15 minutes"]
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection
client = None
db = None
admissions_collection = None

if MONGODB_AVAILABLE:
    try:
        client = MongoClient(app.config['MONGODB_URI'])
        db = client['AmericanCollege']
        admissions_collection = db['Admissions']
        client.admin.command('ping')
        print("✅ Connected to MongoDB successfully!")
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        MONGODB_AVAILABLE = False

# Helpers for local file storage
def load_applications_from_file():
    try:
        with open('applications.json', 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def save_applications_to_file(applications):
    with open('applications.json', 'w') as f:
        json.dump(applications, f, indent=2, default=str)

# Custom encoder
class MongoJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        return super().default(obj)

if MONGODB_AVAILABLE:
    app.json_encoder = MongoJSONEncoder

# Serve static files
@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)

# Serve images
@app.route('/images/<path:filename>')
def images(filename):
    return send_from_directory('images', filename)

# Serve manifest.json
@app.route('/manifest.json')
def manifest():
    return send_file('manifest.json', mimetype='application/manifest+json')

# Serve main website
@app.route('/')
def index():
    return send_file('index.html')

# Serve admin dashboard
@app.route('/admin.html')
def admin():
    return send_file('admin.html')

@app.route('/api/health')
def health_check():
    return jsonify({
        'success': True,
        'message': 'American College of Nursing API is running',
        'timestamp': datetime.now().isoformat(),
        'environment': os.getenv('NODE_ENV', 'development')
    })

# API documentation endpoint
@app.route('/api')
def api_docs():
    return jsonify({
        'success': True,
        'message': 'American College of Nursing API',
        'version': '1.0.0',
        'endpoints': {
            'students': {
                'POST /save-admission': 'Submit student admission application',
                'GET /api/students/check-email/<email>': 'Check if email exists',
                'GET /api/students/programs': 'Get available programs',
                'GET /api/students/stats': 'Get student statistics'
            },
            'contact': {
                'GET /api/contact/inquiry-types': 'Get inquiry types',
                'GET /api/contact/stats': 'Get contact statistics'
            }
        }
    })

@app.route('/save-admission', methods=['POST'])
def save_admission():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400

        required_fields = ['name', 'email', 'phone', 'course']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'{field.capitalize()} is required'}), 400

        # Use phone number as application ID
        application_id = data.get('phone')
        
        # Check if phone number already exists
        phone_exists = False
        if MONGODB_AVAILABLE and admissions_collection:
            existing = admissions_collection.find_one({'phone': application_id})
            phone_exists = existing is not None
        else:
            applications = load_applications_from_file()
            phone_exists = any(app.get('phone') == application_id for app in applications)
        
        if phone_exists:
            return jsonify({'success': False, 'message': 'Application with this phone number already exists'}), 400
        
        admission_data = {
            '_id': application_id,  # Use phone as primary key
            'name': data.get('name'),
            'email': data.get('email'),
            'phone': data.get('phone'),
            'course': data.get('course'),
            'message': data.get('message', ''),
            'timestamp': datetime.now(),
            'status': 'pending'
        }

        if MONGODB_AVAILABLE and admissions_collection:
            try:
                result = admissions_collection.insert_one(admission_data)
                application_id = str(result.inserted_id)
            except Exception as e:
                admission_data['_id'] = application_id
                admission_data['timestamp'] = datetime.now().isoformat()
                applications = load_applications_from_file()
                applications.append(admission_data)
                save_applications_to_file(applications)
        else:
            admission_data['_id'] = application_id
            admission_data['timestamp'] = datetime.now().isoformat()
            applications = load_applications_from_file()
            applications.append(admission_data)
            save_applications_to_file(applications)

        try:
            file_exists = os.path.isfile('admissions.csv')
            with open('admissions.csv', 'a', newline='', encoding='utf-8') as csvfile:
                fieldnames = ['Application ID', 'Name', 'Email', 'Phone', 'Course', 'Message', 'Timestamp', 'Status']
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                if not file_exists:
                    writer.writeheader()
                timestamp_str = admission_data['timestamp']
                if not isinstance(timestamp_str, str):
                    timestamp_str = timestamp_str.strftime('%Y-%m-%d %H:%M:%S')
                writer.writerow({
                    'Application ID': application_id,
                    'Name': admission_data['name'],
                    'Email': admission_data['email'],
                    'Phone': admission_data['phone'],
                    'Course': admission_data['course'],
                    'Message': admission_data['message'],
                    'Timestamp': timestamp_str,
                    'Status': admission_data['status']
                })
        except Exception as csv_error:
            print(f"⚠️ CSV backup failed: {csv_error}")

        return jsonify({'success': True, 'applicationId': application_id}), 200
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to save application'}), 500

@app.route('/api/students/check-email/<email>', methods=['GET'])
def check_email_exists(email):
    try:
        email_exists = False
        if MONGODB_AVAILABLE and admissions_collection:
            existing = admissions_collection.find_one({'email': email})
            email_exists = existing is not None
        else:
            applications = load_applications_from_file()
            email_exists = any(app.get('email') == email for app in applications)
        return jsonify({'success': True, 'exists': email_exists}), 200
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to check email'}), 500

# Additional API endpoints that the frontend expects
@app.route('/api/students/programs', methods=['GET'])
def get_programs():
    programs = [
        {'id': 'gnm', 'name': 'General Nursing & Midwifery', 'duration': '3.5 Years'},
        {'id': 'bsn', 'name': 'Bachelor of Science in Nursing', 'duration': '4 Years'},
        {'id': 'paramedical', 'name': 'Paramedical in Nursing', 'duration': '2 Years'},
        {'id': 'mlt', 'name': 'Medical Lab Technician', 'duration': '2 Years'},
        {'id': 'cardiology', 'name': 'Cardiology Technician', 'duration': '1.5 Years'},
        {'id': 'mha', 'name': 'Multipurpose Health Assistant', 'duration': '1 Year'}
    ]
    return jsonify({'success': True, 'data': programs})

@app.route('/api/students/stats', methods=['GET'])
def get_student_stats():
    stats = {
        'total_students': 3240,
        'placement_rate': 98,
        'years_experience': 36,
        'expert_faculty': 25
    }
    return jsonify({'success': True, 'data': stats})

@app.route('/api/contact/inquiry-types', methods=['GET'])
def get_inquiry_types():
    inquiry_types = [
        {'id': 'admission', 'name': 'Admission Inquiry'},
        {'id': 'course', 'name': 'Course Information'},
        {'id': 'fees', 'name': 'Fee Structure'},
        {'id': 'placement', 'name': 'Placement Assistance'},
        {'id': 'other', 'name': 'Other'}
    ]
    return jsonify({'success': True, 'data': inquiry_types})

@app.route('/api/contact/stats', methods=['GET'])
def get_contact_stats():
    stats = {
        'total_inquiries': 1250,
        'response_rate': 95,
        'avg_response_time': '2 hours',
        'satisfaction_rate': 98
    }
    return jsonify({'success': True, 'data': stats})

@app.route('/api/applications', methods=['GET'])
def get_applications():
    try:
        # Get query parameters
        search_query = request.args.get('search', '').strip()
        sort_by = request.args.get('sort', 'date')  # date, name, status
        sort_order = request.args.get('order', 'desc')  # asc, desc
        
        if MONGODB_AVAILABLE and admissions_collection:
            # Build MongoDB query
            query = {}
            if search_query:
                query = {
                    '$or': [
                        {'name': {'$regex': search_query, '$options': 'i'}},
                        {'email': {'$regex': search_query, '$options': 'i'}},
                        {'phone': {'$regex': search_query, '$options': 'i'}},
                        {'_id': {'$regex': search_query, '$options': 'i'}}  # Application ID search
                    ]
                }
            
            # Build sort criteria
            sort_field = 'timestamp'
            if sort_by == 'name':
                sort_field = 'name'
            elif sort_by == 'status':
                sort_field = 'status'
            
            sort_direction = -1 if sort_order == 'desc' else 1
            applications = list(admissions_collection.find(query).sort(sort_field, sort_direction))
        else:
            applications = load_applications_from_file()
            
            # Filter applications based on search query
            if search_query:
                filtered_apps = []
                for app in applications:
                    if (search_query.lower() in app.get('name', '').lower() or
                        search_query.lower() in app.get('email', '').lower() or
                        search_query.lower() in app.get('phone', '').lower() or
                        search_query.lower() in app.get('_id', '').lower()):
                        filtered_apps.append(app)
                applications = filtered_apps
            
            # Sort applications
            if sort_by == 'name':
                applications.sort(key=lambda x: x.get('name', '').lower(), reverse=(sort_order == 'desc'))
            elif sort_by == 'status':
                applications.sort(key=lambda x: x.get('status', ''), reverse=(sort_order == 'desc'))
            else:  # date
                applications.sort(key=lambda x: x.get('timestamp', ''), reverse=(sort_order == 'desc'))
        
        return jsonify({'success': True, 'data': applications}), 200
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to fetch applications'}), 500

@app.route('/api/applications/<application_id>/status', methods=['PUT'])
def update_application_status(application_id):
    try:
        data = request.get_json()
        new_status = data.get('status')
        
        if not new_status:
            return jsonify({'success': False, 'message': 'Status is required'}), 400
        
        if MONGODB_AVAILABLE and admissions_collection:
            result = admissions_collection.update_one(
                {'_id': application_id},
                {'$set': {'status': new_status}}
            )
            if result.matched_count == 0:
                return jsonify({'success': False, 'message': 'Application not found'}), 404
        else:
            applications = load_applications_from_file()
            found = False
            for app in applications:
                if app.get('_id') == application_id:
                    app['status'] = new_status
                    found = True
                    break
            
            if not found:
                return jsonify({'success': False, 'message': 'Application not found'}), 404
            
            save_applications_to_file(applications)
        
        return jsonify({'success': True, 'message': 'Status updated successfully'}), 200
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to update status'}), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    if request.path.startswith('/api/'):
        return jsonify({
            'success': False,
            'message': 'API endpoint not found',
            'path': request.path
        }), 404
    # For non-API routes, serve index.html (SPA support)
    return send_file('index.html')

@app.errorhandler(Exception)
def handle_error(error):
    logger.error(f'Global error handler: {str(error)}')
    status_code = getattr(error, 'code', 500)
    return jsonify({
        'success': False,
        'message': str(error) if app.debug else 'Internal server error'
    }), status_code

if MONGODB_AVAILABLE:
    atexit.register(disconnect_db)

if __name__ == '__main__':
    port = int(os.getenv('PORT', 3000))
    debug = os.getenv('NODE_ENV') != 'production'
    print(f"🚀 Server running on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
