const mongoose = require('mongoose');
const validator = require('validator');

const studentSchema = new mongoose.Schema({
    // Personal Information
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid email']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        validate: {
            validator: function(v) {
                return /^\+?[\d\s\-\(\)]{10,}$/.test(v);
            },
            message: 'Please provide a valid phone number'
        }
    },
    dateOfBirth: {
        type: Date,
        required: [true, 'Date of birth is required']
    },
    gender: {
        type: String,
        required: [true, 'Gender is required'],
        enum: ['Male', 'Female', 'Other']
    },
    
    // Address Information
    address: {
        street: {
            type: String,
            required: [true, 'Street address is required'],
            trim: true
        },
        city: {
            type: String,
            required: [true, 'City is required'],
            trim: true
        },
        state: {
            type: String,
            required: [true, 'State is required'],
            trim: true
        },
        zipCode: {
            type: String,
            required: [true, 'ZIP code is required'],
            trim: true
        },
        country: {
            type: String,
            default: 'India',
            trim: true
        }
    },
    
    // Academic Information
    program: {
        type: String,
        required: [true, 'Program selection is required'],
        enum: [
            'General Nursing and Midwifery (GNM)',
            'Bachelor of Science in Nursing (BSc Nursing)',
            'Paramedical Courses',
            'Medical Lab Technician',
            'Cardiology Technician',
            'Multipurpose Health Assistant'
        ]
    },
    previousEducation: {
        qualification: {
            type: String,
            required: [true, 'Previous qualification is required']
        },
        institution: {
            type: String,
            required: [true, 'Previous institution is required']
        },
        yearOfCompletion: {
            type: Number,
            required: [true, 'Year of completion is required'],
            min: [1990, 'Year must be after 1990'],
            max: [new Date().getFullYear(), 'Year cannot be in the future']
        },
        percentage: {
            type: Number,
            required: [true, 'Percentage/CGPA is required'],
            min: [0, 'Percentage cannot be negative'],
            max: [100, 'Percentage cannot exceed 100']
        }
    },
    
    // Application Information
    applicationStatus: {
        type: String,
        enum: ['Pending', 'Under Review', 'Approved', 'Rejected', 'Waitlisted'],
        default: 'Pending'
    },
    applicationDate: {
        type: Date,
        default: Date.now
    },
    admissionYear: {
        type: Number,
        required: [true, 'Admission year is required'],
        min: [new Date().getFullYear(), 'Admission year cannot be in the past']
    },
    
    // Guardian Information (for minors)
    guardian: {
        name: {
            type: String,
            trim: true
        },
        relationship: {
            type: String,
            trim: true
        },
        phone: {
            type: String,
            validate: {
                validator: function(v) {
                    return !v || /^\+?[\d\s\-\(\)]{10,}$/.test(v);
                },
                message: 'Please provide a valid guardian phone number'
            }
        },
        email: {
            type: String,
            lowercase: true,
            validate: {
                validator: function(v) {
                    return !v || validator.isEmail(v);
                },
                message: 'Please provide a valid guardian email'
            }
        }
    },
    
    // Additional Information
    medicalHistory: {
        type: String,
        trim: true,
        maxlength: [500, 'Medical history cannot exceed 500 characters']
    },
    specialNeeds: {
        type: String,
        trim: true,
        maxlength: [300, 'Special needs cannot exceed 300 characters']
    },
    motivation: {
        type: String,
        trim: true,
        maxlength: [1000, 'Motivation cannot exceed 1000 characters']
    },
    
    // Documents
    documents: {
        photo: {
            type: String, // File path or URL
        },
        marksheet: {
            type: String, // File path or URL
        },
        certificate: {
            type: String, // File path or URL
        },
        idProof: {
            type: String, // File path or URL
        }
    },
    
    // System Information
    studentId: {
        type: String,
        unique: true,
        sparse: true // Allows null values but ensures uniqueness when present
    },
    isActive: {
        type: Boolean,
        default: true
    },
    notes: [{
        content: String,
        addedBy: String,
        addedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true, // Adds createdAt and updatedAt fields
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for full name
studentSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual for age calculation
studentSchema.virtual('age').get(function() {
    if (this.dateOfBirth) {
        const today = new Date();
        const birthDate = new Date(this.dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }
    return null;
});

// Pre-save middleware to generate student ID
studentSchema.pre('save', async function(next) {
    if (!this.studentId && this.applicationStatus === 'Approved') {
        const year = new Date().getFullYear().toString().slice(-2);
        const program = this.program.split(' ')[0].toUpperCase().slice(0, 3);
        
        // Find the last student with similar ID pattern
        const lastStudent = await this.constructor.findOne({
            studentId: new RegExp(`^ACN${year}${program}`)
        }).sort({ studentId: -1 });
        
        let sequence = 1;
        if (lastStudent && lastStudent.studentId) {
            const lastSequence = parseInt(lastStudent.studentId.slice(-3));
            sequence = lastSequence + 1;
        }
        
        this.studentId = `ACN${year}${program}${sequence.toString().padStart(3, '0')}`;
    }
    next();
});

// Index for better query performance
studentSchema.index({ email: 1 });
studentSchema.index({ studentId: 1 });
studentSchema.index({ applicationStatus: 1 });
studentSchema.index({ program: 1 });
studentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Student', studentSchema); 