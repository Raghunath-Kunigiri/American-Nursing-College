from datetime import datetime, date
from bson import ObjectId
import re
from email_validator import validate_email, EmailNotValidError
from config.database import get_students_collection

class ValidationError(Exception):
    def __init__(self, message, errors=None):
        super().__init__(message)
        self.validation_errors = errors or []

class Student:
    # Program choices
    PROGRAM_CHOICES = [
        'General Nursing and Midwifery (GNM)',
        'Bachelor of Science in Nursing (BSc Nursing)',
        'Paramedical Courses',
        'Medical Lab Technician',
        'Cardiology Technician',
        'Multipurpose Health Assistant'
    ]
    
    # Gender choices
    GENDER_CHOICES = ['Male', 'Female', 'Other']
    
    # Application status choices
    STATUS_CHOICES = ['Pending', 'Under Review', 'Approved', 'Rejected', 'Waitlisted']
    
    def __init__(self, data=None):
        self.collection = get_students_collection()
        if data:
            self.data = data
            self._id = data.get('_id')
        else:
            self.data = {}
            self._id = None
    
    @classmethod
    def create(cls, student_data):
        """Create a new student application"""
        student = cls()
        
        # Validate data
        errors = student._validate_data(student_data)
        if errors:
            raise ValidationError("Validation failed", errors)
        
        # Check if email already exists
        existing = student.collection.find_one({'email': student_data['email'].lower()})
        if existing:
            raise ValidationError("A student with this email already exists")
        
        # Prepare data for insertion
        student.data = student._prepare_data(student_data)
        student.data['createdAt'] = datetime.utcnow()
        student.data['updatedAt'] = datetime.utcnow()
        
        # Insert into database
        result = student.collection.insert_one(student.data)
        student._id = result.inserted_id
        student.data['_id'] = result.inserted_id
        
        return student
    
    @classmethod
    def find_by_id(cls, student_id):
        """Find student by ID"""
        collection = get_students_collection()
        try:
            data = collection.find_one({'_id': ObjectId(student_id)})
            if data:
                return cls(data)
            return None
        except:
            return None
    
    @classmethod
    def find_by_email(cls, email):
        """Find student by email"""
        collection = get_students_collection()
        data = collection.find_one({'email': email.lower()})
        if data:
            return cls(data)
        return None
    
    @classmethod
    def get_all(cls, filters=None, page=1, limit=10):
        """Get all students with pagination and filters"""
        collection = get_students_collection()
        
        # Build query
        query = filters or {}
        
        # Calculate skip
        skip = (page - 1) * limit
        
        # Get students
        cursor = collection.find(query).sort('createdAt', -1).skip(skip).limit(limit)
        students = [cls(data) for data in cursor]
        
        # Get total count
        total = collection.count_documents(query)
        
        return {
            'students': students,
            'total': total,
            'page': page,
            'pages': (total + limit - 1) // limit,
            'limit': limit
        }
    
    @classmethod
    def get_statistics(cls):
        """Get student statistics"""
        collection = get_students_collection()
        
        pipeline = [
            {
                '$group': {
                    '_id': None,
                    'totalApplications': {'$sum': 1},
                    'approvedStudents': {
                        '$sum': {'$cond': [{'$eq': ['$applicationStatus', 'Approved']}, 1, 0]}
                    },
                    'pendingApplications': {
                        '$sum': {'$cond': [{'$eq': ['$applicationStatus', 'Pending']}, 1, 0]}
                    }
                }
            }
        ]
        
        result = list(collection.aggregate(pipeline))
        overview = result[0] if result else {
            'totalApplications': 0,
            'approvedStudents': 0,
            'pendingApplications': 0
        }
        
        # Program distribution
        program_pipeline = [
            {
                '$group': {
                    '_id': '$program',
                    'count': {'$sum': 1}
                }
            },
            {'$sort': {'count': -1}}
        ]
        
        program_stats = list(collection.aggregate(program_pipeline))
        
        return {
            'overview': overview,
            'programDistribution': program_stats
        }
    
    def save(self):
        """Save student data"""
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
    
    def update_status(self, status, notes=None):
        """Update application status"""
        if status not in self.STATUS_CHOICES:
            raise ValidationError(f"Invalid status: {status}")
        
        self.data['applicationStatus'] = status
        self.data['updatedAt'] = datetime.utcnow()
        
        if notes:
            if 'notes' not in self.data:
                self.data['notes'] = []
            self.data['notes'].append({
                'content': notes,
                'addedBy': 'Admin',
                'addedAt': datetime.utcnow()
            })
        
        # Generate student ID if approved and not already generated
        if status == 'Approved' and not self.data.get('studentId'):
            self.data['studentId'] = self._generate_student_id()
        
        self.save()
        return self
    
    def to_dict(self, include_sensitive=False):
        """Convert to dictionary"""
        data = self.data.copy()
        
        # Convert ObjectId to string
        if '_id' in data:
            data['_id'] = str(data['_id'])
        
        # Add virtual fields
        data['fullName'] = self.get_full_name()
        data['age'] = self.get_age()
        
        # Remove sensitive data if not requested
        if not include_sensitive:
            sensitive_fields = ['notes', 'documents']
            for field in sensitive_fields:
                data.pop(field, None)
        
        return data
    
    def get_full_name(self):
        """Get full name"""
        first_name = self.data.get('firstName', '')
        last_name = self.data.get('lastName', '')
        return f"{first_name} {last_name}".strip()
    
    def get_age(self):
        """Calculate age from date of birth"""
        dob = self.data.get('dateOfBirth')
        if not dob:
            return None
        
        if isinstance(dob, str):
            dob = datetime.fromisoformat(dob.replace('Z', '+00:00')).date()
        elif isinstance(dob, datetime):
            dob = dob.date()
        
        today = date.today()
        age = today.year - dob.year
        
        if today.month < dob.month or (today.month == dob.month and today.day < dob.day):
            age -= 1
        
        return age
    
    def _validate_data(self, data):
        """Validate student data"""
        errors = []
        
        # Required fields
        required_fields = [
            'firstName', 'lastName', 'email', 'phone', 'dateOfBirth',
            'gender', 'program', 'admissionYear'
        ]
        
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
        
        # Gender validation
        if data.get('gender') and data['gender'] not in self.GENDER_CHOICES:
            errors.append("Invalid gender selection")
        
        # Program validation
        if data.get('program') and data['program'] not in self.PROGRAM_CHOICES:
            errors.append("Invalid program selection")
        
        # Date of birth validation
        if data.get('dateOfBirth'):
            try:
                if isinstance(data['dateOfBirth'], str):
                    dob = datetime.fromisoformat(data['dateOfBirth'].replace('Z', '+00:00'))
                else:
                    dob = data['dateOfBirth']
                
                if dob.date() >= date.today():
                    errors.append("Date of birth must be in the past")
            except:
                errors.append("Invalid date of birth format")
        
        # Admission year validation
        if data.get('admissionYear'):
            current_year = datetime.now().year
            if data['admissionYear'] < current_year:
                errors.append("Admission year cannot be in the past")
        
        # Address validation
        if data.get('address'):
            address_required = ['street', 'city', 'state', 'zipCode']
            for field in address_required:
                if not data['address'].get(field):
                    errors.append(f"Address {field} is required")
        
        # Previous education validation
        if data.get('previousEducation'):
            edu_required = ['qualification', 'institution', 'yearOfCompletion', 'percentage']
            for field in edu_required:
                if not data['previousEducation'].get(field):
                    errors.append(f"Previous education {field} is required")
            
            # Year validation
            year = data['previousEducation'].get('yearOfCompletion')
            if year and (year < 1990 or year > datetime.now().year):
                errors.append("Invalid year of completion")
            
            # Percentage validation
            percentage = data['previousEducation'].get('percentage')
            if percentage and (percentage < 0 or percentage > 100):
                errors.append("Percentage must be between 0 and 100")
        
        return errors
    
    def _prepare_data(self, data):
        """Prepare data for database insertion"""
        prepared = data.copy()
        
        # Convert email to lowercase
        if 'email' in prepared:
            prepared['email'] = prepared['email'].lower()
        
        # Set default values
        prepared['applicationStatus'] = 'Pending'
        prepared['isActive'] = True
        
        # Set default country
        if 'address' in prepared and 'country' not in prepared['address']:
            prepared['address']['country'] = 'India'
        
        # Convert date strings to datetime objects
        if 'dateOfBirth' in prepared and isinstance(prepared['dateOfBirth'], str):
            prepared['dateOfBirth'] = datetime.fromisoformat(prepared['dateOfBirth'].replace('Z', '+00:00'))
        
        return prepared
    
    def _generate_student_id(self):
        """Generate unique student ID"""
        year = datetime.now().year % 100  # Last 2 digits of year
        program_code = self.data['program'].split(' ')[0][:3].upper()
        
        # Find last student with similar pattern
        pattern = f"ACN{year:02d}{program_code}"
        last_student = self.collection.find_one(
            {'studentId': {'$regex': f'^{pattern}'}},
            sort=[('studentId', -1)]
        )
        
        sequence = 1
        if last_student and last_student.get('studentId'):
            try:
                last_sequence = int(last_student['studentId'][-3:])
                sequence = last_sequence + 1
            except:
                sequence = 1
        
        return f"{pattern}{sequence:03d}" 