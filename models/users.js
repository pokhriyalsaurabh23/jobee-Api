const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name:{
        type: String,
        required : [true,'Please enter your name']
    },
    email: {
        type: String,
        required: [true,'Please enter your email address'],
        unique:true,
        validate : [validator.isEmail,'Please enter valid email address']
    },
    role :{
        type: String,
        enum: {
            values :['user','employeer'],
            message:'Please select correct role'
        },
        default:'user'
    },
    password: {
        type: String,
        required: [true,'Please enter password for your account'],
        minlength: [8,'Your password must be atleast 8 characters long'],
        select: false
    },
    createdAt :{
        type: Date,
        default: Date.now
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date
},
{
    toJSON : {virtuals : true},
    toObject : {virtuals : true}
}
);

//Encrypting passwords before saving
userSchema.pre('save',async function(next){
    
    if(!this.isModified('password')){
        next();
    }

    this.password = await bcrypt.hash(this.password,10);

});

//Return JSON web token
userSchema.methods.getJwtToken = function(){
    return jwt.sign({id : this._id},process.env.JWT_SECRET,{
        expiresIn : process.env.JWT_EXPIRES_TIME
    });
}

//Comapre user password with database password
userSchema.methods.comparePassword = async function(enterPassword){
    return await bcrypt.compare(enterPassword,this.password);
}

//Generate Password token
userSchema.methods.getResetPasswordToken = function(){
    //generate token
    const resetToken = crypto.randomBytes(20).toString('hex');
    //hash and set to resetPasswordToken
    this.resetPasswordToken = crypto.createHash('sha256')
    .update(resetToken)
    .digest('hex');
    //Set token expire time
    this.resetPasswordExpire = Date.now() + 30*60*1000;
    return resetToken;
}

//Show all jobs created by user using virtuals
userSchema.virtual('jobsPublished',{
    ref : 'Job',
    localField : '_id',
    foreignField:'user',
    justOne : false
})


module.exports = mongoose.model('user',userSchema);