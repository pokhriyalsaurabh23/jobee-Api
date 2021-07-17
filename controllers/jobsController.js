const Job = require("../models/jobs");
const geoCoder = require("../utils/geocoder-util");
const ErrorHandler = require('../utils/errorHandler');
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const APIFilters = require('../utils/apiFilters');
const Errorhandler = require("../utils/errorHandler");
const path = require('path');
const fs = require('fs');

// get all jobs /api/v1/jobs
exports.getJobs = catchAsyncErrors(async (req, res, next) => {

    const apiFilters = new APIFilters(Job.find(), req.query)
        .filter()
        .sort()
        .limitFields()
        .searchByQuery()
        .pagination();
    const jobs = await apiFilters.query;
    res.status(200).json({
        success: true,
        results: jobs.length,
        data: jobs,
    });
});

//create new job requirement
exports.newJob = catchAsyncErrors(async (req, res, next) => {

    req.body.user = req.user.id;

    const job = await Job.create(req.body);
    res.status(200).json({
        sucess: true,
        message: "Job created",
        data: job,
    });
});
//get a single job with id and slug => /api/v1/job/:id/:slug
exports.getJob = catchAsyncErrors(async (req, res, next) => {
    const job = await Job.find({ $and: [{ _id: req.params.id }, { slug: req.params.slug }] })
        .populate({
            path: 'user',
            select: 'name'
        });


    if (!job || job.length === 0) {
        return next(new ErrorHandler('job not found', 404));
    }
    res.status(200).json({
        success: true,
        data: job
    });
});

//update a job = > /api/v1/job/:id

exports.updateJob = catchAsyncErrors(async (req, res, next) => {
    let job = await Job.findById(req.params.id);
    if (!job) {
        return next(new ErrorHandler('job not found', 404));
    }

    //check if the user is owner
    if (job.user.toString() !== req.user.id && req.user.id !== 'admin') {
        return next(new Errorhandler(`user(${req.user.id}) is not allowed to update this job`));
    }
    job = await Job.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
        useFindAndModify: false
    });

    res.status(200).json({
        success: true,
        message: 'Job is updated',
        data: job
    });
});

//Delete a job => /api/v1/job/:id
exports.deleteJob = catchAsyncErrors(async (req, res, next) => {
    let job = await Job.findById(req.params.id).select('+applicantsApplied');
    if (!job) {
        return next(new ErrorHandler('job not found', 404));
    }

    //check if the user is owner
    if (job.user.toString() !== req.user.id && req.user.id !== 'admin') {
        return next(new Errorhandler(`user(${req.user.id}) is not allowed to 
        delete this job`));
    }

    for (let i = 0; i < job.applicantsApplied.length; i++) {
        let filepath = `${__dirname}/public/uploads/${job.applicantsApplied[i].resume}`.replace('\\controllers', '');
 
        fs.unlink(filepath, err => {
            if (err) return console.log(err);
        });
    }

    job = await Job.findByIdAndDelete(req.params.id);
    res.status(200).json({
        success: true,
        message: 'Job is Deleted'
    });
});


// search job within radius by zipcode
exports.getJobsInRadius = catchAsyncErrors(async (req, res, next) => {
    const { zipcode, distance } = req.params;
    const loc = await geoCoder.geoCoder.geocode(zipcode);

    const latitude = loc[0].latitude;
    const longitude = loc[0].longitude;

    const radius = distance / 3963;
    const jobs = await Job.find({
        location: {
            $geoWithin: {
                $centerSphere: [
                    [longitude, latitude], radius
                ],
            },
        },
    });
    res.status(200).json({
        sucess: true,
        results: jobs.length,
        data: jobs,
    });
    next();
});

//Get stats about a topic(job)=> /api/v1/stats/:topic

exports.jobStats = catchAsyncErrors(async (req, res, next) => {
    const stats = await Job.aggregate([
        {
            $match: { $text: { $search: "\"" + req.params.topic + "\"" } }
        },
        {
            $group: {
                _id: { $toUpper: '$experience' },
                totaljobs: { $sum: 1 },
                avgPositions: { $avg: '$positions' },
                avgSalary: { $avg: '$salary' },
                minSalary: { $min: '$salary' },
                maxSalary: { $max: '$salary' }
            }
        }
    ]);
    if (stats.length === 0) {
        return next(new ErrorHandler(`No Stats found for - ${req.params.topic}`, 200));
    }
    res.status(200).json({
        success: true,
        data: stats
    })
});

//Apply to job using resume => /api/v1/job/:id/apply

exports.applyJob = catchAsyncErrors(async (req, res, next) => {
    let job = await Job.findById(req.params.id).select('+applicantsApplied');
    if (!job) {
        return next(new Errorhandler('Job not found.', 404));
    }

    //check that if job last date has been passed or not 

    if (job.lastDate < new Date(Date.now())) {
        return next(new Errorhandler('You cannot apply to this job. Date is over.', 400));
    }

    //Check if user has applied before 
    for (let i = 0; i < job.applicantsApplied.length; i++) {
        if (job.applicantsApplied[i].id === req.user.id) {
            return next(new Errorhandler('You have already applied to this job.', 400));
        }
    }

    //Check the files

    if (!req.files) {
        return next(new Errorhandler('Please upload file.', 400));
    }

    const file = req.files.file;

    //Check file type

    const supportedFiles = /.docs|.pdf/;

    if (!supportedFiles.test(path.extname(file.name))) {
        return next(new Errorhandler('Please upload supported file type.', 400));
    }

    //Check file size
    if (file.size > process.env.MAX_FILE_SIZE) {
        return next(new Errorhandler('Please upload file less than 2MB.', 400));
    }

    //Renaming resume
    file.name = `${req.user.name.replace(' ', '-')}_${job._id}${path.parse(file.name).ext}`;
    file.mv(`${process.env.UPLOAD_PATH}/${file.name}`, async err => {
        if (err) {
            console.log(err);
            return next(new Errorhandler('Resume upload failed.', 500));
        }

        await Job.findByIdAndUpdate(req.params.id, {
            $push: {
                applicantsApplied: {
                    id: req.user.id,
                    resume: file.name
                }
            }
        }, {
            new: true,
            runValidators: true,
            useFindAndModify: false
        });

        res.status(200).json({
            success: true,
            message: 'Applied to job successfully',
            data: file.name
        })
    });

});