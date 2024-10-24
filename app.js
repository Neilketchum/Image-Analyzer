const express = require('express');
const multer = require('multer');
const vision = require('@google-cloud/vision');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { Storage } = require('@google-cloud/storage');


dotenv.config();

const app = express();
const port = process.env.PORT || 8080;
const client = new vision.ImageAnnotatorClient();
const storage = new Storage();
const bucketName = 'sass-439608.appspot.com'; // Replace with your actual bucket name

// Set up file upload handling with Multer
const multerStorage = multer.memoryStorage(); // Use memory storage to keep file in memory
const upload = multer({ storage: multerStorage });

// Serve static files (for the HTML form)
app.use(express.static('public'));

// Serve the index.html file at the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }

        // Upload file to Google Cloud Storage
        const fileName = Date.now() + path.extname(req.file.originalname);
        const file = storage.bucket(bucketName).file(fileName);
        await file.save(req.file.buffer, {
            metadata: {
                contentType: req.file.mimetype,
            },
        });

        // Send image to Google Cloud Vision API
        const [result] = await client.labelDetection(`gs://${bucketName}/${fileName}`);
        const labels = result.labelAnnotations.map(label => label.description);
        console.log(labels)
        // Optionally delete the file from Cloud Storage after processing
        // await file.delete();

        // Send HTML response back with detected labels
        res.send(`
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background-color: #f0f0f0;
                    color: #333;
                    text-align: center;
                    padding: 20px;
                }
                h2 {
                    color: #4CAF50;
                }
                ul {
                    list-style-type: none;
                    padding: 0;
                }
                ul li {
                    background-color: #fff;
                    margin: 5px 0;
                    padding: 10px;
                    border-radius: 5px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    transition: background-color 0.3s ease;
                }
                ul li:hover {
                    background-color: #f9f9f9;
                }
                a {
                    display: inline-block;
                    margin-top: 20px;
                    padding: 10px 15px;
                    background-color: #4CAF50;
                    color: #fff;
                    text-decoration: none;
                    border-radius: 5px;
                    transition: background-color 0.3s ease;
                }
                a:hover {
                    background-color: #45a049;
                }
            </style>
        
            <h2>Detected Labels:</h2>
            <ul>
                ${labels.map(label => `<li>${label}</li>`).join('')}
            </ul>
            <a href="/">Go Back</a>
        `);
        
    } catch (error) {
        console.error('Error processing image:', error.message); // Log the error message
        res.status(500).send('Error processing image');
    }
});

// Set up view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});