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

# Import database connection and models
from config.database import connect_db, disconnect_db
from models.student import Student
from models.contact import Contact

# Import routes
from routes.students import students_bp
from routes.contact import contact_bp

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
app.config['MONGODB_URI'] = os.getenv('MONGODB_URI')

# CORS configuration
cors_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5500').split(',')
if os.getenv('NODE_ENV') == 'production':
    cors_origins = [os.getenv('PRODUCTION_DOMAIN')]

CORS(app, origins=cors_origins, supports_credentials=True)

# Rate limiting
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=["100 per 15 minutes"]
)

# Logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Connect to MongoDB
connect_db(app.config['MONGODB_URI'])

# Register blueprints
app.register_blueprint(students_bp, url_prefix='/api/students')
app.register_blueprint(contact_bp, url_prefix='/api/contact')

# Health check endpoint
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
                'POST /api/students/apply': 'Submit student admission application',
                'GET /api/students/application/<id>': 'Get application status',
                'GET /api/students/check-email/<email>': 'Check if email exists',
                'GET /api/students/programs': 'Get available programs',
                'GET /api/students/stats': 'Get student statistics'
            },
            'contact': {
                'POST /api/contact/submit': 'Submit contact form',
                'GET /api/contact/inquiry-types': 'Get inquiry types',
                'GET /api/contact/stats': 'Get contact statistics'
            },
            'admin': {
                'GET /api/students/admin/all': 'Get all students (admin)',
                'PUT /api/students/admin/<id>/status': 'Update student status (admin)',
                'GET /api/contact/admin/all': 'Get all contacts (admin)',
                'PUT /api/contact/admin/<id>/status': 'Update contact status (admin)'
            }
        },
        'documentation': 'Visit /api/docs for detailed API documentation'
    })

# Serve static files
@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)

# Serve manifest.json for PWA support
@app.route('/manifest.json')
def manifest():
    return send_file('manifest.json', mimetype='application/manifest+json')

# Serve main website
@app.route('/')
def index():
    return send_file('index.html')

# Handle 404 for API routes
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

# Global error handler
@app.errorhandler(Exception)
def handle_error(error):
    logger.error(f'Global error handler: {str(error)}')
    
    # Validation errors
    if hasattr(error, 'validation_errors'):
        return jsonify({
            'success': False,
            'message': 'Validation failed',
            'errors': error.validation_errors
        }), 400
    
    # MongoDB duplicate key error
    if 'duplicate key' in str(error).lower():
        return jsonify({
            'success': False,
            'message': 'Record already exists'
        }), 400
    
    # Default error
    status_code = getattr(error, 'code', 500)
    return jsonify({
        'success': False,
        'message': str(error) if app.debug else 'Internal server error'
    }), status_code

# Rate limiting error handler
@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({
        'error': 'Too many requests from this IP, please try again later.'
    }), 429

# Graceful shutdown
import atexit
atexit.register(disconnect_db)

# MongoDB Connection
client = MongoClient(os.getenv('MONGODB_URI'))
db = client['acn_database']
admissions_collection = db['admissions']

# Custom JSON encoder for MongoDB ObjectId
class MongoJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        return super().default(obj)

app.json_encoder = MongoJSONEncoder

@app.route('/save-admission', methods=['POST'])
def save_admission():
    try:
        data = request.get_json()
        
        # Prepare the data
        admission_data = {
            'name': data.get('name', ''),
            'email': data.get('email', ''),
            'phone': data.get('phone', ''),
            'course': data.get('course', ''),
            'message': data.get('message', ''),
            'timestamp': datetime.now(),
            'status': 'pending'  # Initial status
        }
        
        # Save to MongoDB
        result = admissions_collection.insert_one(admission_data)
        
        # Also save to CSV for backup
        file_exists = os.path.isfile('admissions.csv')
        with open('admissions.csv', 'a', newline='', encoding='utf-8') as csvfile:
            fieldnames = ['Name', 'Email', 'Phone', 'Course', 'Message', 'Timestamp']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            
            if not file_exists:
                writer.writeheader()
            
            writer.writerow({
                'Name': admission_data['name'],
                'Email': admission_data['email'],
                'Phone': admission_data['phone'],
                'Course': admission_data['course'],
                'Message': admission_data['message'],
                'Timestamp': admission_data['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
            })
        
        return jsonify({
            'success': True,
            'message': 'Application saved successfully',
            'applicationId': str(result.inserted_id)
        }), 200
        
    except Exception as e:
        print(f"Error saving admission: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to save application'
        }), 500

# Add route to get all applications (for admin purposes)
@app.route('/api/applications', methods=['GET'])
def get_applications():
    try:
        applications = list(admissions_collection.find().sort('timestamp', -1))
        return jsonify({
            'success': True,
            'data': applications
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to fetch applications'
        }), 500

# Add route to update application status
@app.route('/api/applications/<application_id>', methods=['PUT'])
def update_application(application_id):
    try:
        data = request.get_json()
        result = admissions_collection.update_one(
            {'_id': ObjectId(application_id)},
            {'$set': {'status': data.get('status')}}
        )
        
        if result.modified_count:
            return jsonify({
                'success': True,
                'message': 'Application status updated successfully'
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Application not found'
            }), 404
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to update application status'
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 3000))
    debug = os.getenv('NODE_ENV') != 'production'
    
    print(f"""
🚀 American College of Nursing Server Started
📍 Environment: {os.getenv('NODE_ENV', 'development')}
🌐 Server running on port {port}
📱 Local: http://localhost:{port}
🔗 API: http://localhost:{port}/api
💾 Database: MongoDB Atlas
⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
    """)
    
    app.run(host='0.0.0.0', port=port, debug=debug) 