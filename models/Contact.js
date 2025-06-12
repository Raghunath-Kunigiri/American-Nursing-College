const mongoose = require('mongoose');
const validator = require('validator');

const contactSchema = new mongoose.Schema({
    // Contact Information
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
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
    subject: {
        type: String,
        required: [true, 'Subject is required'],
        trim: true,
        maxlength: [200, 'Subject cannot exceed 200 characters']
    },
    message: {
        type: String,
        required: [true, 'Message is required'],
        trim: true,
        maxlength: [2000, 'Message cannot exceed 2000 characters']
    },
    
    // Inquiry Type
    inquiryType: {
        type: String,
        enum: [
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
        ],
        default: 'General Inquiry'
    },
    
    // Program Interest (optional)
    programInterest: {
        type: String,
        enum: [
            'General Nursing and Midwifery (GNM)',
            'Bachelor of Science in Nursing (BSc Nursing)',
            'Paramedical Courses',
            'Medical Lab Technician',
            'Cardiology Technician',
            'Multipurpose Health Assistant',
            'Not Specified'
        ],
        default: 'Not Specified'
    },
    
    // Status and Response
    status: {
        type: String,
        enum: ['New', 'In Progress', 'Responded', 'Resolved', 'Closed'],
        default: 'New'
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Urgent'],
        default: 'Medium'
    },
    
    // Response Information
    response: {
        content: {
            type: String,
            trim: true
        },
        respondedBy: {
            type: String,
            trim: true
        },
        respondedAt: {
            type: Date
        }
    },
    
    // Additional Information
    source: {
        type: String,
        enum: ['Website', 'Phone', 'Email', 'Walk-in', 'Social Media', 'Referral'],
        default: 'Website'
    },
    ipAddress: {
        type: String,
        trim: true
    },
    userAgent: {
        type: String,
        trim: true
    },
    
    // Follow-up
    followUpRequired: {
        type: Boolean,
        default: false
    },
    followUpDate: {
        type: Date
    },
    followUpNotes: {
        type: String,
        trim: true
    },
    
    // Internal Notes
    internalNotes: [{
        content: {
            type: String,
            required: true
        },
        addedBy: {
            type: String,
            required: true
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Tags for categorization
    tags: [{
        type: String,
        trim: true
    }],
    
    // System Information
    isActive: {
        type: Boolean,
        default: true
    },
    isSpam: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt fields
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for response time calculation
contactSchema.virtual('responseTime').get(function() {
    if (this.response && this.response.respondedAt) {
        const responseTime = this.response.respondedAt - this.createdAt;
        const hours = Math.floor(responseTime / (1000 * 60 * 60));
        const minutes = Math.floor((responseTime % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    }
    return null;
});

// Virtual for days since creation
contactSchema.virtual('daysSinceCreation').get(function() {
    const now = new Date();
    const diffTime = Math.abs(now - this.createdAt);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});

// Pre-save middleware to set priority based on inquiry type
contactSchema.pre('save', function(next) {
    if (this.isNew) {
        // Set priority based on inquiry type
        if (this.inquiryType === 'Complaint' || this.inquiryType === 'Technical Support') {
            this.priority = 'High';
        } else if (this.inquiryType === 'Admission Information' || this.inquiryType === 'Course Details') {
            this.priority = 'Medium';
        }
        
        // Set follow-up required for certain inquiry types
        if (['Admission Information', 'Course Details', 'Fee Structure'].includes(this.inquiryType)) {
            this.followUpRequired = true;
            // Set follow-up date to 3 days from now
            this.followUpDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        }
    }
    next();
});

// Static method to get contact statistics
contactSchema.statics.getStatistics = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: null,
                totalContacts: { $sum: 1 },
                newContacts: {
                    $sum: { $cond: [{ $eq: ['$status', 'New'] }, 1, 0] }
                },
                resolvedContacts: {
                    $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] }
                },
                avgResponseTime: {
                    $avg: {
                        $cond: [
                            { $ne: ['$response.respondedAt', null] },
                            { $subtract: ['$response.respondedAt', '$createdAt'] },
                            null
                        ]
                    }
                }
            }
        }
    ]);
    
    return stats[0] || {
        totalContacts: 0,
        newContacts: 0,
        resolvedContacts: 0,
        avgResponseTime: 0
    };
};

// Index for better query performance
contactSchema.index({ email: 1 });
contactSchema.index({ status: 1 });
contactSchema.index({ inquiryType: 1 });
contactSchema.index({ priority: 1 });
contactSchema.index({ createdAt: -1 });
contactSchema.index({ followUpDate: 1 });

module.exports = mongoose.model('Contact', contactSchema); 