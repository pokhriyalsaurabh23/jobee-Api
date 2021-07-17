const mongoose = require("mongoose");
const validator = require("validator");
const slugify = require("slugify");
const { geoCoder } = require("../utils/geocoder-util");

const jobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "Please enter a job title"],
        trim: true,
        maxlength: [100, "Job title can not exceed 100 characters"],
    },
    slug: String,
    description: {
        type: String,
        required: [true, "Please enter a job description"],
        maxlength: [1000, "Job description can not exceed 1000 characters"],
    },
    email: {
        type: String,
        validate: [validator.isEmail, "Please add a valid email address"],
    },
    address: {
        type: String,
        required: [true, "Please add an address"],
    },
    location: {
        type: {
            type: String,
            enum: ["Point"],
        },
        coordinates: {
            type: [Number],
            index: "2dsphere",
        },
        formattedAddress: String,
        city: String,
        state: String,
        zipcode: String,
        country: String,
    },
    company: {
        type: String,
        required: [true, "Please add company name"],
    },
    industry: {
        type: [String],
        required: [true,'Please enter industry for this job.'],
        enum: {
            values: [
                "Bussiness",
                "Information Technology",
                "Banking",
                "Educatrion/Training",
                "Telecommunication",
                "Others",
            ],
            message: "Please select correct options for industry",
        },
    },
    jobType: {
        type: String,
        required: [true,'Please enter job type'],
        enum: {
            values: ["Permanent", "Temporary", "Internship"],
            message: "Please select correct options for job type",
        },
    },
    minEducation: {
        type: String,
        required: [true,'Please enter minimum education for this job.'],
        enum: {
            values: ["Bachlores", "Master", "Phd"],
            message: "Please selectr correct options for Education",
        },
    },
    positions: {
        type: Number,
        default: 1,
    },
    experience: {
        type: String,
        required: [true,'Please enter experience required for this job'],
        enum: {
            values: [
                "No-Experience",
                "1 Years - 2 Years",
                "2 Years - 5 Years",
                "5 Years+",
            ],
            message: "Please select correct options for experience",
        },
    },
    salary: {
        type: Number,
        required: [true, "Please enter expected salary for this job"],
    },
    postingDate: {
        type: Date,
        default: Date.now,
    },
    lastDate: {
        type: Date,
        default: new Date().setDate(new Date().getDate() + 7),
    },
    applicantsApplied: {
        type: [Object],
        select: false,
    },
    user : {
        type : mongoose.Schema.ObjectId,
        ref : 'User',
        required : true
    }
});

//creating  job slug
jobSchema.pre("save", function(next) {
    this.slug = slugify(this.title, { lower: true });
    next();
});

console.log("hello", Object.getOwnPropertyNames(geoCoder.geocode));
//setting up locations
jobSchema.pre("save", async function(next) {
    const loc = await geoCoder.geocode(this.address);
    this.location = {
        type: "Point",
        coordinates: [loc[0].longitude, loc[0].latitude],
        formattedAddress: loc[0].formattedAddress,
        city: loc[0].city,
        state: loc[0].state,
        zipcode: loc[0].zipcode,
        countryloc: [0].country,
    };
});

module.exports = mongoose.model("Job", jobSchema);