const jwt = require('jsonwebtoken');
const User = require('../models/users');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const Errorhandler = require('../utils/errorHandler');

//check if the user is authenticated or not
exports.isAuthenticatedUser = catchAsyncErrors( async (req,res,next)=>{
    let token;
   
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer') ){
        token = req.headers.authorization.split(' ')[1];
    }
    console.log('hello');
    if(!token){
        return next(new Errorhandler('Login first to access this resource.',
        401));
    }
    const decoded = jwt.verify(token,process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    next();
});

//Handling user roles
exports.authorizeRoles = (...roles)=>{
return (req,res,next)=>{
    if(!roles.includes(req.user.role)){
        return next(new Errorhandler(`Role(${req.user.role}) is not allowed to access this resource`,403))
    }
    next(); 
}
}