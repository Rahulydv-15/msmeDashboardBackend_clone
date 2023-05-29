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
app.use(bodyParser.urlencoded({ extended: true }));
// Creating a connection pool to MySQL database
const pool = mysql.createPool({
    connectionLimit: 10,
    host: 'bi76kwt0m15xvzxiy4th-mysql.services.clever-cloud.com',
    user: 'uubuzvmiaeil7qh8',
    password: '54zz7lcjZzCxV4lPZdvR',
    database: 'bi76kwt0m15xvzxiy4th'
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
app.get('/', (req, res, next) => {
    res.send("Hello World");
});
// Defining a GET endpoint to fetch data from the database
app.post('/', authorizeMiddleware, dbMiddleware, (req, res, next) => {
    const startDate = req.body.startDate;
    const startTime = req.body.startTime;
    const endDate = req.body.endDate;
    const endTime = req.body.endTime;
    const requestType = req.body.requestType;
    // console.log(req.body);
    // Check for missing or incorrect request body variables
    // request 01 for all count and 02 for unique count
    if (!startDate || !startTime || !endDate || !endTime || !requestType || (requestType != '01' && requestType != '02')) {
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

    if (requestType === '02') {
        console.log("Enter");
        sql = `SELECT COUNT(DISTINCT mobile) AS totalCount FROM events_tracking WHERE time_stamp >= DATE_FORMAT('${startDate} ${startTime}:00', '%Y-%m-%d %H:%i:%s') AND time_stamp <= DATE_FORMAT('${endDate} ${endTime}:00', '%Y-%m-%d %H:%i:%s') And (event_name="LDS E-Sign Verified" And remark_2="true")`;
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

app.post('/api/vahana', authorizeMiddleware, dbMiddleware, (req, res, next) => {
    console.log(req.body.tempObject);
    const PAN = req.body.tempObject.DMI.application.pan;
    const tempObject=req.body.tempObject;
    
    const sqlSelect = "SELECT * FROM vahana WHERE tempObject LIKE CONCAT('%', ?, '%')";

    req.db.query(sqlSelect, [PAN], (error, results) => {
        if (error) {
            // Handle the error
            console.error(error);
            res.status(500).json({
                status: "error",
                message: "An error occurred while executing the query.",
            });
            return;
        }

        if (results.length === 0) {
            // No record found, create a new entry
            const sqlInsert = "INSERT INTO vahana (tempObject) VALUES (?)";
            req.db.query(sqlInsert, [tempObject], (insertError, insertResults) => {
                if (insertError) {
                    // Handle the error
                    console.error(insertError);
                    res.status(500).json({
                        status: "error",
                        message: "An error occurred while creating a new entry.",
                    });
                    return;
                }

                // New entry created with insertResults.insertId
                res.status(200).json({
                    status: "success",
                    message: "New entry created.",
                    insertedId: insertResults.insertId,
                });
            });
        } else {
            // Record found, update the existing entry
            const recordId = results[0].id;
            const sqlUpdate = "UPDATE vahana SET tempObject = ? WHERE id = ?";
            req.db.query(sqlUpdate, [tempObject, recordId], (updateError, updateResults) => {
                if (updateError) {
                    // Handle the error
                    console.error(updateError);
                    res.status(500).json({
                        status: "error",
                        message: "An error occurred while updating the existing entry.",
                    });
                    return;
                }

                // Existing entry updated with recordId
                res.status(200).json({
                    status: "success",
                    message: "Existing entry updated.",
                    updatedId: recordId,
                });
            });
        }
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
