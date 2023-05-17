const express = require('express');
const app = express();
const port = 3000;

// Importing MySQL module
const mysql = require('mysql');
const bodyParser = require('body-parser');
// Importing CORS module for handling Cross-Origin Resource Sharing
const cors = require('cors');
app.use(cors());
app.use(bodyParser.json());
// Creating a connection pool to MySQL database
const pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'Rahul',
    password: 'Rahul@123',
    database: 'msme_events'
});

// Defining a middleware function to handle database connection
const dbMiddleware = (req, res, next) => {
    pool.getConnection((err, connection) => {
        if (err) {
            return next(err);
        }
        console.log('MySQL connected as id ' + connection.threadId);
        req.db = connection;
        next();
    });
};
// app.get('/',(req,res,next) =>{
//     res.send("Hello World");
// });
// Defining a GET endpoint to fetch data from the database
app.post('/', authorizeMiddleware, dbMiddleware, (req, res, next) => {
    const startDate = req.body.startDate;
    const startTime = req.body.startTime;
    const endDate = req.body.endDate;
    const endTime = req.body.endTime;
    const requestType=req.body.requestType;
    // console.log(req.body);
    // Check for missing or incorrect request body variables
    // request 01 for all count and 02 for unique count
    if (!startDate || !startTime || !endDate || !endTime || !requestType || (requestType!='01' && requestType!='02')) {
        const errorResponse = {
            statusCode: 400,
            message: 'Bad Request'
        };
        return res.status(400).json(errorResponse);
    }

    // Check date and time format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate) || !timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        const errorResponse = {
            statusCode: 400,
            message: 'Bad Request'
        };
        return res.status(400).json(errorResponse);
    }

    // Check for invalid dates/times
    const startDateTime = new Date(`${startDate} ${startTime}:00`);
    const endDateTime = new Date(`${endDate} ${endTime}:00`);
    if (startDateTime > endDateTime) {
        const errorResponse = {
            statusCode: 400,
            message: 'Bad Request'
        };
        return res.status(400).json(errorResponse);
    }

    let sql = `SELECT COUNT(*) AS totalCount FROM events_tracking WHERE time_stamp >= DATE_FORMAT('${startDate} ${startTime}:00', '%Y-%m-%d %H:%i:%s') AND time_stamp <= DATE_FORMAT('${endDate} ${endTime}:00', '%Y-%m-%d %H:%i:%s') And (event_name="LDS E-Sign Verified" And remark_2="true")`;

    if(requestType==='02'){
        console.log("Enter");
        sql=`SELECT COUNT(DISTINCT mobile) AS totalCount FROM events_tracking WHERE time_stamp >= DATE_FORMAT('${startDate} ${startTime}:00', '%Y-%m-%d %H:%i:%s') AND time_stamp <= DATE_FORMAT('${endDate} ${endTime}:00', '%Y-%m-%d %H:%i:%s') And (event_name="LDS E-Sign Verified" And remark_2="true")`;
    }
    req.db.query(sql, (err, result) => {
        if (err) {
            // Handle database error
            const errorResponse = {
                statusCode: 500,
                message: 'Internal server error'
            };
            return res.status(500).json(errorResponse);
        }

        const totalCount = result[0].totalCount;

        // Send success response
        const successResponse = {
            statusCode: 200,
            message: 'Success',
            data: {
                totalCount: totalCount
            }
        };
        res.status(200).json(successResponse);

        // Release database connection
        req.db.release();
    });
});

// Middleware to check authorization header
function authorizeMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || authHeader !== 'Bearer my-token') {
    const errorResponse = {
      statusCode: 401,
      message: 'Unauthorized'
    };
    return res.status(401).json(errorResponse);
  }
  next();
}


// Starting the server and listening for incoming requests
app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});