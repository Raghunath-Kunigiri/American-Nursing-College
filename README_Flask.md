# American College of Nursing Website - Flask Version

A modern, responsive website for American College of Nursing built with **Python Flask** and MongoDB database integration for student admissions and contact management.

## 🌟 Features

### Backend (Flask)
- **Flask Framework**: Lightweight and flexible Python web framework
- **MongoDB Integration**: Secure data storage with PyMongo
- **RESTful API**: Well-structured API endpoints for all operations
- **Rate Limiting**: Protection against spam and abuse using Flask-Limiter
- **Data Validation**: Comprehensive server-side validation
- **Error Handling**: Graceful error handling with detailed responses
- **CORS Support**: Cross-origin resource sharing configuration

### Frontend (Same as Node.js version)
- **Modern Design**: Glass morphism effects, gradients, and animations
- **Responsive Layout**: Mobile-first design with Bootstrap integration
- **Interactive Elements**: Smooth scrolling, hover effects, and transitions
- **Form Validation**: Real-time validation with user feedback
- **Application Tracking**: Students can track their application status

### Database Features
- **Student Management**: Complete admission application system
- **Contact System**: Advanced contact form with inquiry categorization
- **Statistics**: Real-time statistics and analytics
- **Admin Panel**: Backend routes for administrative operations

## 🚀 Quick Start

### Prerequisites
- Python 3.8 or higher
- MongoDB Atlas account (or local MongoDB)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd american-nursing-college
   ```

2. **Create virtual environment**
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   # MongoDB Configuration
   MONGODB_URI=mongodb+srv://kunigiriraghunath9493:X3W7HJLG0HaCvQCG@acn.oa10h.mongodb.net/american_nursing_college?retryWrites=true&w=majority
   
   # Flask Configuration
   SECRET_KEY=your_secure_secret_key_change_in_production
   FLASK_ENV=development
   FLASK_DEBUG=True
   
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   
   # JWT Secret (for future authentication)
   JWT_SECRET=your_secure_jwt_secret_here
   ```

5. **Start the Flask server**
   ```bash
   # Development mode
   python app.py
   
   # Or using Flask CLI
   flask run --host=0.0.0.0 --port=3000
   
   # Production mode with Gunicorn
   gunicorn -w 4 -b 0.0.0.0:3000 app:app
   ```

6. **Access the website**
   - Website: http://localhost:3000
   - API: http://localhost:3000/api
   - Health Check: http://localhost:3000/api/health

## 📁 Project Structure

```
american-nursing-college/
├── config/
│   └── database.py          # MongoDB connection configuration
├── models/
│   ├── student.py           # Student model and validation
│   └── contact.py           # Contact model and validation
├── routes/
│   ├── students.py          # Student API routes (Flask Blueprint)
│   └── contact.py           # Contact API routes (Flask Blueprint)
├── static/
│   ├── css/
│   │   └── index.css        # Enhanced styling
│   ├── js/
│   │   └── api.js           # Frontend API integration
│   └── images/              # Static images
├── templates/               # Flask templates (if needed)
├── app.py                   # Main Flask application
├── requirements.txt         # Python dependencies
├── .env                     # Environment variables
├── index.html               # Main website file
└── README_Flask.md          # This file
```

## 🔌 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Student Endpoints

#### Submit Application
```http
POST /api/students/apply
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@email.com",
  "phone": "+1234567890",
  "dateOfBirth": "2000-01-01",
  "gender": "Male",
  "address": {
    "street": "123 Main St",
    "city": "City",
    "state": "State",
    "zipCode": "12345",
    "country": "India"
  },
  "program": "Bachelor of Science in Nursing (BSc Nursing)",
  "previousEducation": {
    "qualification": "12th Grade",
    "institution": "ABC School",
    "yearOfCompletion": 2020,
    "percentage": 85.5
  },
  "admissionYear": 2024
}
```

#### Other Endpoints
- `GET /api/students/application/<id>` - Check application status
- `GET /api/students/check-email/<email>` - Check email availability
- `GET /api/students/programs` - Get available programs
- `GET /api/students/stats` - Get student statistics

### Contact Endpoints

#### Submit Contact Form
```http
POST /api/contact/submit
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john.doe@email.com",
  "phone": "+1234567890",
  "subject": "Admission Inquiry",
  "message": "I would like to know more about the nursing programs.",
  "inquiryType": "Admission Information",
  "programInterest": "Bachelor of Science in Nursing (BSc Nursing)"
}
```

#### Other Endpoints
- `GET /api/contact/inquiry-types` - Get inquiry types
- `GET /api/contact/stats` - Get contact statistics

### Admin Endpoints
- `GET /api/students/admin/all` - Get all students (admin)
- `PUT /api/students/admin/<id>/status` - Update student status (admin)
- `GET /api/contact/admin/all` - Get all contacts (admin)
- `PUT /api/contact/admin/<id>/status` - Update contact status (admin)

## 🗄️ Database Models

### Student Model (Python Class)
```python
class Student:
    PROGRAM_CHOICES = [
        'General Nursing and Midwifery (GNM)',
        'Bachelor of Science in Nursing (BSc Nursing)',
        'Paramedical Courses',
        'Medical Lab Technician',
        'Cardiology Technician',
        'Multipurpose Health Assistant'
    ]
    
    # Methods: create(), find_by_id(), find_by_email(), get_all(), etc.
```

### Contact Model (Python Class)
```python
class Contact:
    INQUIRY_TYPES = [
        'General Inquiry',
        'Admission Information',
        'Course Details',
        # ... more types
    ]
    
    # Methods: create(), find_by_id(), get_all(), get_statistics(), etc.
```

## 🔒 Security Features

- **Rate Limiting**: Flask-Limiter prevents spam and abuse
- **Input Validation**: Server-side validation for all inputs using email-validator
- **CORS Protection**: Configured for specific origins
- **Data Sanitization**: Prevents injection attacks
- **Error Handling**: Secure error messages

## 🚀 Deployment

### Environment Variables for Production
```env
FLASK_ENV=production
FLASK_DEBUG=False
MONGODB_URI=your_production_mongodb_uri
SECRET_KEY=your_secure_production_secret_key
PORT=3000
```

### Deployment with Gunicorn
```bash
# Install Gunicorn
pip install gunicorn

# Run with Gunicorn
gunicorn -w 4 -b 0.0.0.0:3000 app:app

# With configuration file
gunicorn -c gunicorn.conf.py app:app
```

### Docker Deployment
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 3000

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:3000", "app:app"]
```

### Recommended Hosting Platforms
- **Heroku**: Easy deployment with MongoDB Atlas
- **DigitalOcean App Platform**: Simple Python app deployment
- **AWS Elastic Beanstalk**: Scalable deployment
- **Google Cloud Run**: Serverless container deployment
- **Railway**: Modern deployment platform

## 📊 Monitoring and Analytics

### Health Check
```http
GET /api/health
```

### Statistics Endpoints
- Student statistics: `/api/students/stats`
- Contact statistics: `/api/contact/stats`

## 🛠️ Development

### Available Commands
```bash
# Start development server
python app.py

# Start with Flask CLI
flask run --debug

# Install dependencies
pip install -r requirements.txt

# Freeze dependencies
pip freeze > requirements.txt

# Run with Gunicorn (production)
gunicorn -w 4 -b 0.0.0.0:3000 app:app
```

### Adding New Features

1. **Database Models**: Add new classes in `models/` directory
2. **API Routes**: Create new Blueprint files in `routes/` directory
3. **Frontend Integration**: Update `static/js/api.js` for new endpoints

### Flask vs Node.js Comparison

| Feature | Flask (Python) | Express (Node.js) |
|---------|----------------|-------------------|
| **Language** | Python | JavaScript |
| **Learning Curve** | Easy | Easy |
| **Performance** | Good | Excellent |
| **Ecosystem** | Rich | Very Rich |
| **Database ORM** | PyMongo/SQLAlchemy | Mongoose |
| **Deployment** | Gunicorn/uWSGI | PM2/Forever |
| **Memory Usage** | Higher | Lower |
| **Development Speed** | Fast | Very Fast |

## 🔄 Migration from Node.js

If you're migrating from the Node.js version:

1. **Database**: Same MongoDB database and collections
2. **API Endpoints**: Identical endpoints and responses
3. **Frontend**: No changes needed to HTML/CSS/JS
4. **Environment**: Update environment variables for Flask

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 📞 Support

For support and questions:
- Email: Schoolofnursing10@gmail.com
- Phone: +91 9493 9493 94
- Address: Balaji villas, Kalyana Durgam ROAD, Andhra Pradesh 515004

## 🔄 Version History

- **v1.0.0**: Flask version with MongoDB integration
  - Student admission system
  - Contact management
  - Real-time statistics
  - Responsive design
  - API documentation
  - Rate limiting and security

---

**American College of Nursing** - Established 1988 | Excellence in Nursing Education

*Built with ❤️ using Python Flask* 