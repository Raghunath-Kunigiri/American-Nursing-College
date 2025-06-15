# American College of Nursing Website

A modern, responsive website for American College of Nursing with Flask backend and MongoDB database integration.

## Features

- 🏥 Modern responsive design
- 📝 Online admission application system
- 💾 MongoDB Atlas integration with local storage fallback
- 📊 Admin dashboard for managing applications
- 📱 Mobile-friendly interface
- 🔒 CORS security configuration
- ⚡ Rate limiting protection

## Installation

### Prerequisites

- Python 3.8 or higher
- MongoDB Atlas account (optional - local storage fallback available)

### Setup Instructions

1. **Clone or download the project**
   ```bash
   cd American-Nursing-College
   ```

2. **Install required packages**
   ```bash
   pip install -r requirements.txt
   ```

3. **Environment Configuration (Optional)**
   Create a `.env` file in the project root:
   ```env
   SECRET_KEY=your-secret-key-here
   MONGODB_URI=your-mongodb-connection-string
   NODE_ENV=development
   PORT=3000
   ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:5500,http://127.0.0.1:3000,http://localhost:5500,http://192.168.1.199:3000
   ```

4. **Run the application**
   ```bash
   python app.py
   ```

5. **Access the website**
   - Main website: http://localhost:3000
   - Admin dashboard: http://localhost:3000/admin.html
   - API documentation: http://localhost:3000/api

## Project Structure

```
American-Nursing-College/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── index.html            # Main website
├── admin.html            # Admin dashboard
├── static/               # Static assets
│   ├── css/
│   └── js/
├── images/               # Image assets
├── config/               # Configuration files
├── models/               # Database models
└── routes/               # API routes
```

## API Endpoints

### Student Applications
- `POST /save-admission` - Submit admission application
- `GET /api/applications` - Get all applications (admin)
- `GET /api/students/check-email/<email>` - Check if email exists
- `GET /api/students/programs` - Get available programs
- `GET /api/students/stats` - Get student statistics

### Contact & General
- `GET /api/health` - Health check
- `GET /api/contact/stats` - Get contact statistics
- `GET /api/contact/inquiry-types` - Get inquiry types

## Database

The application supports both MongoDB Atlas and local JSON storage:

- **MongoDB Atlas**: Primary database for production
- **Local Storage**: Automatic fallback using JSON files
- **CSV Backup**: All applications are also saved to CSV

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Change port in app.py or set PORT environment variable
   export PORT=3001
   python app.py
   ```

2. **MongoDB connection issues**
   - Check your MongoDB Atlas connection string
   - Ensure IP whitelist includes your current IP
   - Application will automatically fall back to local storage

3. **CORS errors**
   - Add your domain to ALLOWED_ORIGINS in .env file
   - Check that the frontend is making requests to the correct port

### Development

To run in development mode with debug logging:
```bash
export NODE_ENV=development
python app.py
```

## Support

For technical support or questions about the American College of Nursing:

- 📧 Email: Americancollegeatp@gmail.com
- 📞 Phone: +91 70133 70612, +91 99899 53273
- 📍 Address: Balaji Villas, Kalyana Durgam Road, Anantapur, Andhra Pradesh 515004

---

© 2024 American College of Nursing. All rights reserved. 