const express = require("express");
const app = express();

const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');
const connectDatabase = require("./config/database");
const errorMiddleware = require('./middlewares/errors');
const Errorhandler = require('./utils/errorHandler');
//setting config file
dotenv.config({ path: "./config/config.env" });
//Handling  uncaught Exception
process.on('uncaughtException',err=>{
    console.log(`Error : ${err.message}`);
    console.log('Shutting down due to uncaught exception.');
    process.exit(1);
});
//database connection
connectDatabase();

//Setting up body parser
app.use(bodyParser.urlencoded({extended : true}));
app.use(express.static('public'));
//Setup security header
app.use(helmet());



//Setup body parser
app.use(express.json());
//setup cookie parser
app.use(cookieParser());

//Hanfle file uploads
app.use(fileUpload());

//Sanitize data
app.use(mongoSanitize());

//prevent xss attacks
app.use(xss());

//Prevent parameter pollution
app.use(hpp());


//rate limit 
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  });

//setup cors -accessible by other domains
app.use(cors());
  
  //  apply to all requests
  app.use(limiter);

const jobs = require("./routes/jobs");
const auth = require('./routes/auth');
const user = require('./routes/user');
app.use("/api/v1", jobs);
app.use("/api/v1", auth);
app.use("/api/v1",user);

app.all('*',(req,res,next)=>{
    next(new Errorhandler(`${req.originalUrl} route not found`,404));
});
app.use(errorMiddleware);
const PORT = process.env.PORT;
const NODE_ENV = process.env.NODE_ENV;
const server=app.listen(PORT, () => {
    console.log(`Server started on port ${PORT} in the ${NODE_ENV} mode `);
});

process.on('unhandledRejection',err=>{
    console.log(`Error : ${err.stack}`);
    console.log('Shutting down the server due to unhandled promise rejection');
    server.close( ()=>{
        process.exit(1);
    })
});
