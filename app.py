from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
from datetime import datetime
import logging
from dotenv import load_dotenv

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
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')
app.config['MONGODB_URI'] = os.getenv('MONGODB_URI', 'mongodb+srv://kunigiriraghunath9493:X3W7HJLG0HaCvQCG@acn.oa10h.mongodb.net/american_nursing_college?retryWrites=true&w=majority')

# CORS configuration
cors_origins = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500']
if os.getenv('NODE_ENV') == 'production':
    cors_origins = ['https://your-domain.com']  # Replace with your actual domain

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