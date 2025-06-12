from flask import Blueprint, request, jsonify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import logging
from models.contact import Contact, ValidationError

# Create blueprint
contact_bp = Blueprint('contact', __name__)

# Configure logging
logger = logging.getLogger(__name__)

# Rate limiter (will be configured in main app)
limiter = None

def init_limiter(app_limiter):
    global limiter
    limiter = app_limiter

# @route   POST /api/contact/submit
# @desc    Submit contact form
# @access  Public
@contact_bp.route('/submit', methods=['POST'])
def submit_contact():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Get client IP and user agent for tracking
        request_info = {
            'ip': request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr),
            'user_agent': request.headers.get('User-Agent')
        }
        
        # Create contact submission
        contact = Contact.create(data, request_info)
        
        return jsonify({
            'success': True,
            'message': 'Your message has been sent successfully. We will get back to you soon!',
            'data': {
                'contactId': str(contact._id),
                'name': contact.data['name'],
                'email': contact.data['email'],
                'inquiryType': contact.data['inquiryType'],
                'status': contact.data['status'],
                'submittedAt': contact.data['createdAt'].isoformat()
            }
        }), 201
        
    except ValidationError as e:
        logger.error(f'Contact submission validation error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Validation failed',
            'errors': e.validation_errors
        }), 400
        
    except Exception as e:
        logger.error(f'Contact submission error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Server error occurred while sending your message'
        }), 500

# @route   GET /api/contact/inquiry-types
# @desc    Get available inquiry types
# @access  Public
@contact_bp.route('/inquiry-types', methods=['GET'])
def get_inquiry_types():
    inquiry_types = Contact.get_inquiry_types()
    
    return jsonify({
        'success': True,
        'data': inquiry_types
    })

# @route   GET /api/contact/stats
# @desc    Get contact statistics (public summary)
# @access  Public
@contact_bp.route('/stats', methods=['GET'])
def get_stats():
    try:
        stats = Contact.get_statistics()
        
        return jsonify({
            'success': True,
            'data': stats
        })
        
    except Exception as e:
        logger.error(f'Get contact stats error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Server error occurred'
        }), 500

# Admin routes (would need authentication middleware in production)
# @route   GET /api/contact/admin/all
# @desc    Get all contact submissions (admin only)
# @access  Private (admin)
@contact_bp.route('/admin/all', methods=['GET'])
def get_all_contacts():
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        status = request.args.get('status')
        inquiry_type = request.args.get('inquiryType')
        priority = request.args.get('priority')
        
        # Build filter object
        filters = {}
        if status:
            filters['status'] = status
        if inquiry_type:
            filters['inquiryType'] = inquiry_type
        if priority:
            filters['priority'] = priority
        
        result = Contact.get_all(filters, page, limit)
        
        # Convert contacts to dictionaries
        contacts_data = [contact.to_dict(include_sensitive=True) for contact in result['contacts']]
        
        return jsonify({
            'success': True,
            'data': {
                'contacts': contacts_data,
                'pagination': {
                    'current': result['page'],
                    'pages': result['pages'],
                    'total': result['total'],
                    'limit': result['limit']
                }
            }
        })
        
    except Exception as e:
        logger.error(f'Get all contacts error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Server error occurred'
        }), 500

# @route   GET /api/contact/admin/<id>
# @desc    Get detailed contact information (admin only)
# @access  Private (admin)
@contact_bp.route('/admin/<contact_id>', methods=['GET'])
def get_contact_details(contact_id):
    try:
        contact = Contact.find_by_id(contact_id)
        
        if not contact:
            return jsonify({
                'success': False,
                'message': 'Contact not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': contact.to_dict(include_sensitive=True)
        })
        
    except Exception as e:
        logger.error(f'Get contact details error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Server error occurred'
        }), 500

# @route   PUT /api/contact/admin/<id>/status
# @desc    Update contact status (admin only)
# @access  Private (admin)
@contact_bp.route('/admin/<contact_id>/status', methods=['PUT'])
def update_contact_status(contact_id):
    try:
        data = request.get_json()
        status = data.get('status')
        priority = data.get('priority')
        notes = data.get('notes')
        
        contact = Contact.find_by_id(contact_id)
        if not contact:
            return jsonify({
                'success': False,
                'message': 'Contact not found'
            }), 404
        
        contact.update_status(status, priority, notes)
        
        return jsonify({
            'success': True,
            'message': 'Contact status updated successfully',
            'data': {
                'contactId': str(contact._id),
                'name': contact.data['name'],
                'status': contact.data['status'],
                'priority': contact.data['priority']
            }
        })
        
    except ValidationError as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400
        
    except Exception as e:
        logger.error(f'Update contact status error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Server error occurred'
        }), 500

# @route   PUT /api/contact/admin/<id>/respond
# @desc    Add response to contact (admin only)
# @access  Private (admin)
@contact_bp.route('/admin/<contact_id>/respond', methods=['PUT'])
def add_response(contact_id):
    try:
        data = request.get_json()
        response_content = data.get('responseContent')
        responded_by = data.get('respondedBy', 'Admin')
        
        if not response_content:
            return jsonify({
                'success': False,
                'message': 'Response content is required'
            }), 400
        
        contact = Contact.find_by_id(contact_id)
        if not contact:
            return jsonify({
                'success': False,
                'message': 'Contact not found'
            }), 404
        
        contact.add_response(response_content, responded_by)
        
        return jsonify({
            'success': True,
            'message': 'Response added successfully',
            'data': {
                'contactId': str(contact._id),
                'name': contact.data['name'],
                'status': contact.data['status'],
                'responseTime': contact.get_response_time()
            }
        })
        
    except Exception as e:
        logger.error(f'Add response error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Server error occurred'
        }), 500

# @route   GET /api/contact/admin/follow-ups
# @desc    Get contacts requiring follow-up (admin only)
# @access  Private (admin)
@contact_bp.route('/admin/follow-ups', methods=['GET'])
def get_follow_ups():
    try:
        follow_ups = Contact.get_follow_ups()
        
        # Convert to dictionaries with limited fields
        follow_ups_data = []
        for contact in follow_ups:
            follow_ups_data.append({
                '_id': str(contact._id),
                'name': contact.data['name'],
                'email': contact.data['email'],
                'inquiryType': contact.data['inquiryType'],
                'priority': contact.data['priority'],
                'followUpDate': contact.data['followUpDate'].isoformat(),
                'createdAt': contact.data['createdAt'].isoformat()
            })
        
        return jsonify({
            'success': True,
            'data': follow_ups_data
        })
        
    except Exception as e:
        logger.error(f'Get follow-ups error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Server error occurred'
        }), 500

# @route   DELETE /api/contact/admin/<id>
# @desc    Soft delete contact (admin only)
# @access  Private (admin)
@contact_bp.route('/admin/<contact_id>', methods=['DELETE'])
def delete_contact(contact_id):
    try:
        contact = Contact.find_by_id(contact_id)
        if not contact:
            return jsonify({
                'success': False,
                'message': 'Contact not found'
            }), 404
        
        contact.soft_delete()
        
        return jsonify({
            'success': True,
            'message': 'Contact deleted successfully'
        })
        
    except Exception as e:
        logger.error(f'Delete contact error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Server error occurred'
        }), 500 