# American College of Nursing Website

A modern, responsive website for American College of Nursing with MongoDB database integration for student admissions and contact management.

## 🌟 Features

### Frontend
- **Modern Design**: Glass morphism effects, gradients, and animations
- **Responsive Layout**: Mobile-first design with Bootstrap integration
- **Interactive Elements**: Smooth scrolling, hover effects, and transitions
- **Form Validation**: Real-time validation with user feedback
- **Application Tracking**: Students can track their application status

### Backend
- **MongoDB Integration**: Secure data storage with Mongoose ODM
- **RESTful API**: Well-structured API endpoints for all operations
- **Rate Limiting**: Protection against spam and abuse
- **Data Validation**: Comprehensive server-side validation
- **Error Handling**: Graceful error handling with detailed responses

### Database Features
- **Student Management**: Complete admission application system
- **Contact System**: Advanced contact form with inquiry categorization
- **Statistics**: Real-time statistics and analytics
- **Admin Panel**: Backend routes for administrative operations

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account (or local MongoDB)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd american-nursing-college
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   # MongoDB Configuration
   MONGODB_URI=mongodb+srv://kunigiriraghunath9493:X3W7HJLG0HaCvQCG@acn.oa10h.mongodb.net/american_nursing_college?retryWrites=true&w=majority
   
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   
   # JWT Secret (Change in production)
   JWT_SECRET=your_secure_jwt_secret_here
   
   # Email Configuration (Optional)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Access the website**
   - Website: http://localhost:3000
   - API: http://localhost:3000/api
   - Health Check: http://localhost:3000/api/health

## 📁 Project Structure

```
american-nursing-college/
├── config/
│   └── database.js          # MongoDB connection configuration
├── models/
│   ├── Student.js           # Student schema and model
│   └── Contact.js           # Contact schema and model
├── routes/
│   ├── students.js          # Student API routes
│   └── contact.js           # Contact API routes
├── static/
│   ├── css/
│   │   └── index.css        # Enhanced styling
│   ├── js/
│   │   └── api.js           # Frontend API integration
│   └── images/              # Static images
├── index.html               # Main website file
├── server.js                # Express server setup
├── package.json             # Dependencies and scripts
└── README.md               # This file
```

## 🔌 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Student Endpoints

#### Submit Application
```http
POST /students/apply
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

#### Check Application Status
```http
GET /students/application/{applicationId}
```

#### Check Email Availability
```http
GET /students/check-email/{email}
```

#### Get Available Programs
```http
GET /students/programs
```

#### Get Student Statistics
```http
GET /students/stats
```

### Contact Endpoints

#### Submit Contact Form
```http
POST /contact/submit
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

#### Get Inquiry Types
```http
GET /contact/inquiry-types
```

#### Get Contact Statistics
```http
GET /contact/stats
```

### Admin Endpoints (Require Authentication)

#### Get All Students
```http
GET /students/admin/all?page=1&limit=10&status=Pending&program=BSc Nursing
```

#### Update Student Status
```http
PUT /students/admin/{studentId}/status
Content-Type: application/json

{
  "status": "Approved",
  "notes": "Application approved after review"
}
```

#### Get All Contacts
```http
GET /contact/admin/all?page=1&limit=10&status=New&priority=High
```

#### Update Contact Status
```http
PUT /contact/admin/{contactId}/status
Content-Type: application/json

{
  "status": "Responded",
  "priority": "Medium",
  "notes": "Inquiry resolved"
}
```

## 🗄️ Database Schema

### Student Model
```javascript
{
  firstName: String (required),
  lastName: String (required),
  email: String (required, unique),
  phone: String (required),
  dateOfBirth: Date (required),
  gender: String (required),
  address: {
    street: String (required),
    city: String (required),
    state: String (required),
    zipCode: String (required),
    country: String (default: "India")
  },
  program: String (required),
  previousEducation: {
    qualification: String (required),
    institution: String (required),
    yearOfCompletion: Number (required),
    percentage: Number (required)
  },
  applicationStatus: String (default: "Pending"),
  admissionYear: Number (required),
  studentId: String (auto-generated),
  // ... additional fields
}
```

### Contact Model
```javascript
{
  name: String (required),
  email: String (required),
  phone: String (required),
  subject: String (required),
  message: String (required),
  inquiryType: String (default: "General Inquiry"),
  programInterest: String (default: "Not Specified"),
  status: String (default: "New"),
  priority: String (default: "Medium"),
  // ... additional fields
}
```

## 🎨 Frontend Integration

### Form Handling
The website automatically handles form submissions through the API:

```javascript
// Admission form submission
const formHandler = new FormHandler();

// Contact form submission
api.submitContact(contactData).then(response => {
  console.log('Contact submitted:', response);
});

// Application status tracking
applicationTracker.checkStatus(applicationId);
```

### Real-time Statistics
Statistics are automatically loaded and displayed:

```javascript
// Load and display statistics
const statsDisplay = new StatsDisplay();
```

## 🔒 Security Features

- **Rate Limiting**: Prevents spam and abuse
- **Input Validation**: Server-side validation for all inputs
- **CORS Protection**: Configured for specific origins
- **Helmet.js**: Security headers for protection
- **Data Sanitization**: Prevents injection attacks

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=your_production_mongodb_uri
PORT=3000
JWT_SECRET=your_secure_production_jwt_secret
```

### Deployment Steps

1. **Prepare for production**
   ```bash
   npm install --production
   ```

2. **Set environment variables**
   Update `.env` file with production values

3. **Start the application**
   ```bash
   npm start
   ```

### Recommended Hosting Platforms
- **Heroku**: Easy deployment with MongoDB Atlas
- **Vercel**: Serverless deployment
- **DigitalOcean**: VPS hosting
- **AWS**: EC2 with RDS/DocumentDB

## 📊 Monitoring and Analytics

### Health Check
```http
GET /api/health
```

### Statistics Endpoints
- Student statistics: `/api/students/stats`
- Contact statistics: `/api/contact/stats`

## 🛠️ Development

### Available Scripts
```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm test           # Run tests (to be implemented)
```

### Adding New Features

1. **Database Models**: Add new schemas in `models/` directory
2. **API Routes**: Create new route files in `routes/` directory
3. **Frontend Integration**: Update `static/js/api.js` for new endpoints

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

- **v1.0.0**: Initial release with MongoDB integration
  - Student admission system
  - Contact management
  - Real-time statistics
  - Responsive design
  - API documentation

---

**American College of Nursing** - Established 1988 | Excellence in Nursing Education 