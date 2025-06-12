const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const rateLimit = require('express-rate-limit');

// Rate limiting for student routes
const studentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    }
});

// Apply rate limiting to POST routes
router.use('/apply', studentLimiter);

// @route   POST /api/students/apply
// @desc    Submit student admission application
// @access  Public
router.post('/apply', async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            phone,
            dateOfBirth,
            gender,
            address,
            program,
            previousEducation,
            admissionYear,
            guardian,
            medicalHistory,
            specialNeeds,
            motivation
        } = req.body;

        // Check if student already exists with this email
        const existingStudent = await Student.findOne({ email: email.toLowerCase() });
        if (existingStudent) {
            return res.status(400).json({
                success: false,
                message: 'A student with this email already exists'
            });
        }

        // Create new student application
        const student = new Student({
            firstName,
            lastName,
            email: email.toLowerCase(),
            phone,
            dateOfBirth,
            gender,
            address,
            program,
            previousEducation,
            admissionYear,
            guardian,
            medicalHistory,
            specialNeeds,
            motivation
        });

        await student.save();

        res.status(201).json({
            success: true,
            message: 'Application submitted successfully',
            data: {
                applicationId: student._id,
                fullName: student.fullName,
                email: student.email,
                program: student.program,
                applicationStatus: student.applicationStatus,
                applicationDate: student.applicationDate
            }
        });

    } catch (error) {
        console.error('Student application error:', error);
        
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
            message: 'Server error occurred while processing application'
        });
    }
});

// @route   GET /api/students/application/:id
// @desc    Get application status by ID
// @access  Public (with limited info)
router.get('/application/:id', async (req, res) => {
    try {
        const student = await Student.findById(req.params.id).select(
            'firstName lastName email program applicationStatus applicationDate admissionYear'
        );

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        res.json({
            success: true,
            data: {
                fullName: student.fullName,
                email: student.email,
                program: student.program,
                applicationStatus: student.applicationStatus,
                applicationDate: student.applicationDate,
                admissionYear: student.admissionYear
            }
        });

    } catch (error) {
        console.error('Get application error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred'
        });
    }
});

// @route   GET /api/students/check-email/:email
// @desc    Check if email is already registered
// @access  Public
router.get('/check-email/:email', async (req, res) => {
    try {
        const student = await Student.findOne({ 
            email: req.params.email.toLowerCase() 
        }).select('_id');

        res.json({
            success: true,
            exists: !!student
        });

    } catch (error) {
        console.error('Check email error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred'
        });
    }
});

// @route   GET /api/students/programs
// @desc    Get available programs
// @access  Public
router.get('/programs', (req, res) => {
    const programs = [
        {
            id: 'gnm',
            name: 'General Nursing and Midwifery (GNM)',
            duration: '3.5 years',
            description: 'Comprehensive nursing program with midwifery training'
        },
        {
            id: 'bsc-nursing',
            name: 'Bachelor of Science in Nursing (BSc Nursing)',
            duration: '4 years',
            description: 'Advanced nursing degree program'
        },
        {
            id: 'paramedical',
            name: 'Paramedical Courses',
            duration: '1-2 years',
            description: 'Various paramedical specializations'
        },
        {
            id: 'mlt',
            name: 'Medical Lab Technician',
            duration: '2 years',
            description: 'Laboratory technology and diagnostics'
        },
        {
            id: 'cardiology-tech',
            name: 'Cardiology Technician',
            duration: '2 years',
            description: 'Specialized cardiac care technology'
        },
        {
            id: 'mpha',
            name: 'Multipurpose Health Assistant',
            duration: '1 year',
            description: 'Community health assistance program'
        }
    ];

    res.json({
        success: true,
        data: programs
    });
});

// @route   GET /api/students/stats
// @desc    Get student statistics (public summary)
// @access  Public
router.get('/stats', async (req, res) => {
    try {
        const stats = await Student.aggregate([
            {
                $group: {
                    _id: null,
                    totalApplications: { $sum: 1 },
                    approvedStudents: {
                        $sum: { $cond: [{ $eq: ['$applicationStatus', 'Approved'] }, 1, 0] }
                    },
                    pendingApplications: {
                        $sum: { $cond: [{ $eq: ['$applicationStatus', 'Pending'] }, 1, 0] }
                    }
                }
            }
        ]);

        const programStats = await Student.aggregate([
            {
                $group: {
                    _id: '$program',
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
                overview: stats[0] || {
                    totalApplications: 0,
                    approvedStudents: 0,
                    pendingApplications: 0
                },
                programDistribution: programStats
            }
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred'
        });
    }
});

// Admin routes (would need authentication middleware in production)
// @route   GET /api/students/admin/all
// @desc    Get all students (admin only)
// @access  Private (admin)
router.get('/admin/all', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const status = req.query.status;
        const program = req.query.program;

        // Build filter object
        const filter = {};
        if (status) filter.applicationStatus = status;
        if (program) filter.program = program;

        const students = await Student.find(filter)
            .select('-__v')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Student.countDocuments(filter);

        res.json({
            success: true,
            data: {
                students,
                pagination: {
                    current: page,
                    pages: Math.ceil(total / limit),
                    total,
                    limit
                }
            }
        });

    } catch (error) {
        console.error('Get all students error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred'
        });
    }
});

// @route   PUT /api/students/admin/:id/status
// @desc    Update student application status (admin only)
// @access  Private (admin)
router.put('/admin/:id/status', async (req, res) => {
    try {
        const { status, notes } = req.body;
        
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        student.applicationStatus = status;
        
        if (notes) {
            student.notes.push({
                content: notes,
                addedBy: 'Admin', // In production, get from authenticated user
                addedAt: new Date()
            });
        }

        await student.save();

        res.json({
            success: true,
            message: 'Student status updated successfully',
            data: {
                studentId: student.studentId,
                fullName: student.fullName,
                applicationStatus: student.applicationStatus
            }
        });

    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred'
        });
    }
});

// @route   GET /api/students/admin/:id
// @desc    Get detailed student information (admin only)
// @access  Private (admin)
router.get('/admin/:id', async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        res.json({
            success: true,
            data: student
        });

    } catch (error) {
        console.error('Get student details error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred'
        });
    }
});

module.exports = router; 