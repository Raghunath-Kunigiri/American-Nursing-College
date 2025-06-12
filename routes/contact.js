const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const rateLimit = require('express-rate-limit');

// Rate limiting for contact routes
const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 contact submissions per windowMs
    message: {
        error: 'Too many contact submissions from this IP, please try again later.'
    }
});

// Apply rate limiting to POST routes
router.use('/submit', contactLimiter);

// @route   POST /api/contact/submit
// @desc    Submit contact form
// @access  Public
router.post('/submit', async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            subject,
            message,
            inquiryType,
            programInterest
        } = req.body;

        // Get client IP and user agent for tracking
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent');

        // Create new contact submission
        const contact = new Contact({
            name,
            email: email.toLowerCase(),
            phone,
            subject,
            message,
            inquiryType: inquiryType || 'General Inquiry',
            programInterest: programInterest || 'Not Specified',
            ipAddress,
            userAgent,
            source: 'Website'
        });

        await contact.save();

        res.status(201).json({
            success: true,
            message: 'Your message has been sent successfully. We will get back to you soon!',
            data: {
                contactId: contact._id,
                name: contact.name,
                email: contact.email,
                inquiryType: contact.inquiryType,
                status: contact.status,
                submittedAt: contact.createdAt
            }
        });

    } catch (error) {
        console.error('Contact submission error:', error);
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error occurred while sending your message'
        });
    }
});

// @route   GET /api/contact/inquiry-types
// @desc    Get available inquiry types
// @access  Public
router.get('/inquiry-types', (req, res) => {
    const inquiryTypes = [
        {
            value: 'General Inquiry',
            label: 'General Inquiry',
            description: 'General questions about the college'
        },
        {
            value: 'Admission Information',
            label: 'Admission Information',
            description: 'Questions about admission process and requirements'
        },
        {
            value: 'Course Details',
            label: 'Course Details',
            description: 'Information about specific courses and programs'
        },
        {
            value: 'Fee Structure',
            label: 'Fee Structure',
            description: 'Questions about fees and payment options'
        },
        {
            value: 'Placement Information',
            label: 'Placement Information',
            description: 'Career opportunities and placement assistance'
        },
        {
            value: 'Facility Information',
            label: 'Facility Information',
            description: 'Questions about college facilities and infrastructure'
        },
        {
            value: 'Technical Support',
            label: 'Technical Support',
            description: 'Website or technical issues'
        },
        {
            value: 'Complaint',
            label: 'Complaint',
            description: 'Complaints or concerns'
        },
        {
            value: 'Suggestion',
            label: 'Suggestion',
            description: 'Suggestions for improvement'
        },
        {
            value: 'Other',
            label: 'Other',
            description: 'Other inquiries not listed above'
        }
    ];

    res.json({
        success: true,
        data: inquiryTypes
    });
});

// @route   GET /api/contact/stats
// @desc    Get contact statistics (public summary)
// @access  Public
router.get('/stats', async (req, res) => {
    try {
        const stats = await Contact.getStatistics();

        const inquiryTypeStats = await Contact.aggregate([
            {
                $group: {
                    _id: '$inquiryType',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        res.json({
            success: true,
            data: {
                overview: stats,
                inquiryDistribution: inquiryTypeStats
            }
        });

    } catch (error) {
        console.error('Get contact stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred'
        });
    }
});

// Admin routes (would need authentication middleware in production)
// @route   GET /api/contact/admin/all
// @desc    Get all contact submissions (admin only)
// @access  Private (admin)
router.get('/admin/all', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const status = req.query.status;
        const inquiryType = req.query.inquiryType;
        const priority = req.query.priority;

        // Build filter object
        const filter = { isActive: true };
        if (status) filter.status = status;
        if (inquiryType) filter.inquiryType = inquiryType;
        if (priority) filter.priority = priority;

        const contacts = await Contact.find(filter)
            .select('-__v -userAgent')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Contact.countDocuments(filter);

        res.json({
            success: true,
            data: {
                contacts,
                pagination: {
                    current: page,
                    pages: Math.ceil(total / limit),
                    total,
                    limit
                }
            }
        });

    } catch (error) {
        console.error('Get all contacts error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred'
        });
    }
});

// @route   GET /api/contact/admin/:id
// @desc    Get detailed contact information (admin only)
// @access  Private (admin)
router.get('/admin/:id', async (req, res) => {
    try {
        const contact = await Contact.findById(req.params.id);
        
        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        res.json({
            success: true,
            data: contact
        });

    } catch (error) {
        console.error('Get contact details error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred'
        });
    }
});

// @route   PUT /api/contact/admin/:id/status
// @desc    Update contact status (admin only)
// @access  Private (admin)
router.put('/admin/:id/status', async (req, res) => {
    try {
        const { status, priority, notes } = req.body;
        
        const contact = await Contact.findById(req.params.id);
        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        if (status) contact.status = status;
        if (priority) contact.priority = priority;
        
        if (notes) {
            contact.internalNotes.push({
                content: notes,
                addedBy: 'Admin', // In production, get from authenticated user
                addedAt: new Date()
            });
        }

        await contact.save();

        res.json({
            success: true,
            message: 'Contact status updated successfully',
            data: {
                contactId: contact._id,
                name: contact.name,
                status: contact.status,
                priority: contact.priority
            }
        });

    } catch (error) {
        console.error('Update contact status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred'
        });
    }
});

// @route   PUT /api/contact/admin/:id/respond
// @desc    Add response to contact (admin only)
// @access  Private (admin)
router.put('/admin/:id/respond', async (req, res) => {
    try {
        const { responseContent, respondedBy } = req.body;
        
        const contact = await Contact.findById(req.params.id);
        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        contact.response = {
            content: responseContent,
            respondedBy: respondedBy || 'Admin',
            respondedAt: new Date()
        };
        
        contact.status = 'Responded';

        await contact.save();

        res.json({
            success: true,
            message: 'Response added successfully',
            data: {
                contactId: contact._id,
                name: contact.name,
                status: contact.status,
                responseTime: contact.responseTime
            }
        });

    } catch (error) {
        console.error('Add response error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred'
        });
    }
});

// @route   GET /api/contact/admin/follow-ups
// @desc    Get contacts requiring follow-up (admin only)
// @access  Private (admin)
router.get('/admin/follow-ups', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today

        const followUps = await Contact.find({
            followUpRequired: true,
            followUpDate: { $lte: today },
            status: { $nin: ['Resolved', 'Closed'] },
            isActive: true
        })
        .select('name email inquiryType priority followUpDate createdAt')
        .sort({ followUpDate: 1 });

        res.json({
            success: true,
            data: followUps
        });

    } catch (error) {
        console.error('Get follow-ups error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred'
        });
    }
});

// @route   DELETE /api/contact/admin/:id
// @desc    Soft delete contact (admin only)
// @access  Private (admin)
router.delete('/admin/:id', async (req, res) => {
    try {
        const contact = await Contact.findById(req.params.id);
        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        contact.isActive = false;
        await contact.save();

        res.json({
            success: true,
            message: 'Contact deleted successfully'
        });

    } catch (error) {
        console.error('Delete contact error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred'
        });
    }
});

module.exports = router; 