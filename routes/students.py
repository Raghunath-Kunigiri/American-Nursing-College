from flask import Blueprint, request, jsonify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import logging
from models.student import Student, ValidationError

# Create blueprint
students_bp = Blueprint('students', __name__)

# Configure logging
logger = logging.getLogger(__name__)

# Rate limiter (will be configured in main app)
limiter = None

def init_limiter(app_limiter):
    global limiter
    limiter = app_limiter

# @route   POST /api/students/apply
# @desc    Submit student admission application
# @access  Public
@students_bp.route('/apply', methods=['POST'])
def apply():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Create student application
        student = Student.create(data)
        
        return jsonify({
            'success': True,
            'message': 'Application submitted successfully',
            'data': {
                'applicationId': str(student._id),
                'fullName': student.get_full_name(),
                'email': student.data['email'],
                'program': student.data['program'],
                'applicationStatus': student.data['applicationStatus'],
                'applicationDate': student.data['createdAt'].isoformat()
            }
        }), 201
        
    except ValidationError as e:
        logger.error(f'Student application validation error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Validation failed',
            'errors': e.validation_errors
        }), 400
        
    except Exception as e:
        logger.error(f'Student application error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Server error occurred while processing application'
        }), 500

# @route   GET /api/students/application/<id>
# @desc    Get application status by ID
# @access  Public (with limited info)
@students_bp.route('/application/<application_id>', methods=['GET'])
def get_application_status(application_id):
    try:
        student = Student.find_by_id(application_id)
        
        if not student:
            return jsonify({
                'success': False,
                'message': 'Application not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': {
                'fullName': student.get_full_name(),
                'email': student.data['email'],
                'program': student.data['program'],
                'applicationStatus': student.data['applicationStatus'],
                'applicationDate': student.data['createdAt'].isoformat(),
                'admissionYear': student.data['admissionYear']
            }
        })
        
    except Exception as e:
        logger.error(f'Get application error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Server error occurred'
        }), 500

# @route   GET /api/students/check-email/<email>
# @desc    Check if email is already registered
# @access  Public
@students_bp.route('/check-email/<email>', methods=['GET'])
def check_email(email):
    try:
        student = Student.find_by_email(email)
        
        return jsonify({
            'success': True,
            'exists': student is not None
        })
        
    except Exception as e:
        logger.error(f'Check email error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Server error occurred'
        }), 500

# @route   GET /api/students/programs
# @desc    Get available programs
# @access  Public
@students_bp.route('/programs', methods=['GET'])
def get_programs():
    programs = [
        {
            'id': 'gnm',
            'name': 'General Nursing and Midwifery (GNM)',
            'duration': '3.5 years',
            'description': 'Comprehensive nursing program with midwifery training'
        },
        {
            'id': 'bsc-nursing',
            'name': 'Bachelor of Science in Nursing (BSc Nursing)',
            'duration': '4 years',
            'description': 'Advanced nursing degree program'
        },
        {
            'id': 'paramedical',
            'name': 'Paramedical Courses',
            'duration': '1-2 years',
            'description': 'Various paramedical specializations'
        },
        {
            'id': 'mlt',
            'name': 'Medical Lab Technician',
            'duration': '2 years',
            'description': 'Laboratory technology and diagnostics'
        },
        {
            'id': 'cardiology-tech',
            'name': 'Cardiology Technician',
            'duration': '2 years',
            'description': 'Specialized cardiac care technology'
        },
        {
            'id': 'mpha',
            'name': 'Multipurpose Health Assistant',
            'duration': '1 year',
            'description': 'Community health assistance program'
        }
    ]
    
    return jsonify({
        'success': True,
        'data': programs
    })

# @route   GET /api/students/stats
# @desc    Get student statistics (public summary)
# @access  Public
@students_bp.route('/stats', methods=['GET'])
def get_stats():
    try:
        stats = Student.get_statistics()
        
        return jsonify({
            'success': True,
            'data': stats
        })
        
    except Exception as e:
        logger.error(f'Get stats error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Server error occurred'
        }), 500

# Admin routes (would need authentication middleware in production)
# @route   GET /api/students/admin/all
# @desc    Get all students (admin only)
# @access  Private (admin)
@students_bp.route('/admin/all', methods=['GET'])
def get_all_students():
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        status = request.args.get('status')
        program = request.args.get('program')
        
        # Build filter object
        filters = {}
        if status:
            filters['applicationStatus'] = status
        if program:
            filters['program'] = program
        
        result = Student.get_all(filters, page, limit)
        
        # Convert students to dictionaries
        students_data = [student.to_dict(include_sensitive=True) for student in result['students']]
        
        return jsonify({
            'success': True,
            'data': {
                'students': students_data,
                'pagination': {
                    'current': result['page'],
                    'pages': result['pages'],
                    'total': result['total'],
                    'limit': result['limit']
                }
            }
        })
        
    except Exception as e:
        logger.error(f'Get all students error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Server error occurred'
        }), 500

# @route   PUT /api/students/admin/<id>/status
# @desc    Update student application status (admin only)
# @access  Private (admin)
@students_bp.route('/admin/<student_id>/status', methods=['PUT'])
def update_student_status(student_id):
    try:
        data = request.get_json()
        status = data.get('status')
        notes = data.get('notes')
        
        if not status:
            return jsonify({
                'success': False,
                'message': 'Status is required'
            }), 400
        
        student = Student.find_by_id(student_id)
        if not student:
            return jsonify({
                'success': False,
                'message': 'Student not found'
            }), 404
        
        student.update_status(status, notes)
        
        return jsonify({
            'success': True,
            'message': 'Student status updated successfully',
            'data': {
                'studentId': student.data.get('studentId'),
                'fullName': student.get_full_name(),
                'applicationStatus': student.data['applicationStatus']
            }
        })
        
    except ValidationError as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400
        
    except Exception as e:
        logger.error(f'Update status error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Server error occurred'
        }), 500

# @route   GET /api/students/admin/<id>
# @desc    Get detailed student information (admin only)
# @access  Private (admin)
@students_bp.route('/admin/<student_id>', methods=['GET'])
def get_student_details(student_id):
    try:
        student = Student.find_by_id(student_id)
        
        if not student:
            return jsonify({
                'success': False,
                'message': 'Student not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': student.to_dict(include_sensitive=True)
        })
        
    except Exception as e:
        logger.error(f'Get student details error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Server error occurred'
        }), 500 