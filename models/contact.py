from datetime import datetime, timedelta
from bson import ObjectId
import re
from email_validator import validate_email, EmailNotValidError
from config.database import get_contacts_collection

class ValidationError(Exception):
    def __init__(self, message, errors=None):
        super().__init__(message)
        self.validation_errors = errors or []

class Contact:
    # Inquiry type choices
    INQUIRY_TYPES = [
        'General Inquiry',
        'Admission Information',
        'Course Details',
        'Fee Structure',
        'Placement Information',
        'Facility Information',
        'Technical Support',
        'Complaint',
        'Suggestion',
        'Other'
    ]
    
    # Program interest choices
    PROGRAM_INTERESTS = [
        'General Nursing and Midwifery (GNM)',
        'Bachelor of Science in Nursing (BSc Nursing)',
        'Paramedical Courses',
        'Medical Lab Technician',
        'Cardiology Technician',
        'Multipurpose Health Assistant',
        'Not Specified'
    ]
    
    # Status choices
    STATUS_CHOICES = ['New', 'In Progress', 'Responded', 'Resolved', 'Closed']
    
    # Priority choices
    PRIORITY_CHOICES = ['Low', 'Medium', 'High', 'Urgent']
    
    # Source choices
    SOURCE_CHOICES = ['Website', 'Phone', 'Email', 'Walk-in', 'Social Media', 'Referral']
    
    def __init__(self, data=None):
        self.collection = get_contacts_collection()
        if data:
            self.data = data
            self._id = data.get('_id')
        else:
            self.data = {}
            self._id = None
    
    @classmethod
    def create(cls, contact_data, request_info=None):
        """Create a new contact submission"""
        contact = cls()
        
        # Validate data
        errors = contact._validate_data(contact_data)
        if errors:
            raise ValidationError("Validation failed", errors)
        
        # Prepare data for insertion
        contact.data = contact._prepare_data(contact_data, request_info)
        contact.data['createdAt'] = datetime.utcnow()
        contact.data['updatedAt'] = datetime.utcnow()
        
        # Insert into database
        result = contact.collection.insert_one(contact.data)
        contact._id = result.inserted_id
        contact.data['_id'] = result.inserted_id
        
        return contact
    
    @classmethod
    def find_by_id(cls, contact_id):
        """Find contact by ID"""
        collection = get_contacts_collection()
        try:
            data = collection.find_one({'_id': ObjectId(contact_id)})
            if data:
                return cls(data)
            return None
        except:
            return None
    
    @classmethod
    def get_all(cls, filters=None, page=1, limit=10):
        """Get all contacts with pagination and filters"""
        collection = get_contacts_collection()
        
        # Build query
        query = filters or {}
        query['isActive'] = True  # Only active contacts
        
        # Calculate skip
        skip = (page - 1) * limit
        
        # Get contacts
        cursor = collection.find(query).sort('createdAt', -1).skip(skip).limit(limit)
        contacts = [cls(data) for data in cursor]
        
        # Get total count
        total = collection.count_documents(query)
        
        return {
            'contacts': contacts,
            'total': total,
            'page': page,
            'pages': (total + limit - 1) // limit,
            'limit': limit
        }
    
    @classmethod
    def get_statistics(cls):
        """Get contact statistics"""
        collection = get_contacts_collection()
        
        pipeline = [
            {'$match': {'isActive': True}},
            {
                '$group': {
                    '_id': None,
                    'totalContacts': {'$sum': 1},
                    'newContacts': {
                        '$sum': {'$cond': [{'$eq': ['$status', 'New']}, 1, 0]}
                    },
                    'resolvedContacts': {
                        '$sum': {'$cond': [{'$eq': ['$status', 'Resolved']}, 1, 0]}
                    },
                    'avgResponseTime': {
                        '$avg': {
                            '$cond': [
                                {'$ne': ['$response.respondedAt', None]},
                                {'$subtract': ['$response.respondedAt', '$createdAt']},
                                None
                            ]
                        }
                    }
                }
            }
        ]
        
        result = list(collection.aggregate(pipeline))
        overview = result[0] if result else {
            'totalContacts': 0,
            'newContacts': 0,
            'resolvedContacts': 0,
            'avgResponseTime': 0
        }
        
        # Inquiry type distribution
        inquiry_pipeline = [
            {'$match': {'isActive': True}},
            {
                '$group': {
                    '_id': '$inquiryType',
                    'count': {'$sum': 1}
                }
            },
            {'$sort': {'count': -1}}
        ]
        
        inquiry_stats = list(collection.aggregate(inquiry_pipeline))
        
        return {
            'overview': overview,
            'inquiryDistribution': inquiry_stats
        }
    
    @classmethod
    def get_follow_ups(cls):
        """Get contacts requiring follow-up"""
        collection = get_contacts_collection()
        
        today = datetime.utcnow().replace(hour=23, minute=59, second=59, microsecond=999999)
        
        query = {
            'followUpRequired': True,
            'followUpDate': {'$lte': today},
            'status': {'$nin': ['Resolved', 'Closed']},
            'isActive': True
        }
        
        cursor = collection.find(query).sort('followUpDate', 1)
        return [cls(data) for data in cursor]
    
    def save(self):
        """Save contact data"""
        if self._id:
            # Update existing
            self.data['updatedAt'] = datetime.utcnow()
            self.collection.update_one(
                {'_id': self._id},
                {'$set': self.data}
            )
        else:
            # Create new
            self.data['createdAt'] = datetime.utcnow()
            self.data['updatedAt'] = datetime.utcnow()
            result = self.collection.insert_one(self.data)
            self._id = result.inserted_id
            self.data['_id'] = result.inserted_id
        
        return self
    
    def update_status(self, status, priority=None, notes=None):
        """Update contact status"""
        if status not in self.STATUS_CHOICES:
            raise ValidationError(f"Invalid status: {status}")
        
        if priority and priority not in self.PRIORITY_CHOICES:
            raise ValidationError(f"Invalid priority: {priority}")
        
        self.data['status'] = status
        if priority:
            self.data['priority'] = priority
        self.data['updatedAt'] = datetime.utcnow()
        
        if notes:
            if 'internalNotes' not in self.data:
                self.data['internalNotes'] = []
            self.data['internalNotes'].append({
                'content': notes,
                'addedBy': 'Admin',
                'addedAt': datetime.utcnow()
            })
        
        self.save()
        return self
    
    def add_response(self, response_content, responded_by='Admin'):
        """Add response to contact"""
        self.data['response'] = {
            'content': response_content,
            'respondedBy': responded_by,
            'respondedAt': datetime.utcnow()
        }
        self.data['status'] = 'Responded'
        self.data['updatedAt'] = datetime.utcnow()
        
        self.save()
        return self
    
    def soft_delete(self):
        """Soft delete contact"""
        self.data['isActive'] = False
        self.data['updatedAt'] = datetime.utcnow()
        self.save()
        return self
    
    def to_dict(self, include_sensitive=False):
        """Convert to dictionary"""
        data = self.data.copy()
        
        # Convert ObjectId to string
        if '_id' in data:
            data['_id'] = str(data['_id'])
        
        # Add virtual fields
        data['responseTime'] = self.get_response_time()
        data['daysSinceCreation'] = self.get_days_since_creation()
        
        # Remove sensitive data if not requested
        if not include_sensitive:
            sensitive_fields = ['ipAddress', 'userAgent', 'internalNotes']
            for field in sensitive_fields:
                data.pop(field, None)
        
        return data
    
    def get_response_time(self):
        """Calculate response time"""
        response = self.data.get('response')
        if not response or not response.get('respondedAt'):
            return None
        
        response_time = response['respondedAt'] - self.data['createdAt']
        total_seconds = int(response_time.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        
        return f"{hours}h {minutes}m"
    
    def get_days_since_creation(self):
        """Calculate days since creation"""
        now = datetime.utcnow()
        diff_time = now - self.data['createdAt']
        return diff_time.days + 1
    
    def _validate_data(self, data):
        """Validate contact data"""
        errors = []
        
        # Required fields
        required_fields = ['name', 'email', 'phone', 'subject', 'message']
        
        for field in required_fields:
            if not data.get(field):
                errors.append(f"{field} is required")
        
        # Email validation
        if data.get('email'):
            try:
                validate_email(data['email'])
            except EmailNotValidError:
                errors.append("Please provide a valid email")
        
        # Phone validation
        if data.get('phone'):
            phone_pattern = r'^\+?[\d\s\-\(\)]{10,}$'
            if not re.match(phone_pattern, data['phone']):
                errors.append("Please provide a valid phone number")
        
        # Length validations
        if data.get('name') and len(data['name']) > 100:
            errors.append("Name cannot exceed 100 characters")
        
        if data.get('subject') and len(data['subject']) > 200:
            errors.append("Subject cannot exceed 200 characters")
        
        if data.get('message') and len(data['message']) > 2000:
            errors.append("Message cannot exceed 2000 characters")
        
        # Choice validations
        if data.get('inquiryType') and data['inquiryType'] not in self.INQUIRY_TYPES:
            errors.append("Invalid inquiry type")
        
        if data.get('programInterest') and data['programInterest'] not in self.PROGRAM_INTERESTS:
            errors.append("Invalid program interest")
        
        return errors
    
    def _prepare_data(self, data, request_info=None):
        """Prepare data for database insertion"""
        prepared = data.copy()
        
        # Convert email to lowercase
        if 'email' in prepared:
            prepared['email'] = prepared['email'].lower()
        
        # Set default values
        prepared['inquiryType'] = prepared.get('inquiryType', 'General Inquiry')
        prepared['programInterest'] = prepared.get('programInterest', 'Not Specified')
        prepared['status'] = 'New'
        prepared['source'] = 'Website'
        prepared['isActive'] = True
        prepared['isSpam'] = False
        prepared['followUpRequired'] = False
        
        # Set priority based on inquiry type
        inquiry_type = prepared['inquiryType']
        if inquiry_type in ['Complaint', 'Technical Support']:
            prepared['priority'] = 'High'
        elif inquiry_type in ['Admission Information', 'Course Details']:
            prepared['priority'] = 'Medium'
        else:
            prepared['priority'] = 'Medium'
        
        # Set follow-up for certain inquiry types
        if inquiry_type in ['Admission Information', 'Course Details', 'Fee Structure']:
            prepared['followUpRequired'] = True
            prepared['followUpDate'] = datetime.utcnow() + timedelta(days=3)
        
        # Add request information if provided
        if request_info:
            prepared['ipAddress'] = request_info.get('ip')
            prepared['userAgent'] = request_info.get('user_agent')
        
        return prepared
    
    @classmethod
    def get_inquiry_types(cls):
        """Get available inquiry types with descriptions"""
        return [
            {
                'value': 'General Inquiry',
                'label': 'General Inquiry',
                'description': 'General questions about the college'
            },
            {
                'value': 'Admission Information',
                'label': 'Admission Information',
                'description': 'Questions about admission process and requirements'
            },
            {
                'value': 'Course Details',
                'label': 'Course Details',
                'description': 'Information about specific courses and programs'
            },
            {
                'value': 'Fee Structure',
                'label': 'Fee Structure',
                'description': 'Questions about fees and payment options'
            },
            {
                'value': 'Placement Information',
                'label': 'Placement Information',
                'description': 'Career opportunities and placement assistance'
            },
            {
                'value': 'Facility Information',
                'label': 'Facility Information',
                'description': 'Questions about college facilities and infrastructure'
            },
            {
                'value': 'Technical Support',
                'label': 'Technical Support',
                'description': 'Website or technical issues'
            },
            {
                'value': 'Complaint',
                'label': 'Complaint',
                'description': 'Complaints or concerns'
            },
            {
                'value': 'Suggestion',
                'label': 'Suggestion',
                'description': 'Suggestions for improvement'
            },
            {
                'value': 'Other',
                'label': 'Other',
                'description': 'Other inquiries not listed above'
            }
        ] 