
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const cors = require('cors');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.static('uploads'));

const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Create uploads directory if not exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Convert Word to PDF using LibreOffice (better formatting)
app.post('/convert/docx-to-pdf', upload.single('file'), async (req, res) => {
    try {
        const inputPath = req.file.path;
        const outputPath = path.join('uploads', `${req.file.filename}.pdf`);

        // LibreOffice conversion command
        await new Promise((resolve, reject) => {
            exec(`soffice --headless --convert-to pdf "${inputPath}" --outdir uploads/`, (error) => {
                if (error) return reject(error);
                resolve();
            });
        });

        res.download(outputPath, 'converted.pdf', (err) => {
            if (!err) {
                fs.unlink(inputPath, () => { }); // Delete original
                fs.unlink(outputPath, () => { }); // Delete converted
            }
        });

    } catch (error) {
        console.error('Conversion error:', error);
        res.status(500).json({ error: 'Conversion failed' });
    }
});

// Convert PDF to Word (using LibreOffice)
app.post('/convert/pdf-to-docx', upload.single('file'), async (req, res) => {
    try {
        const inputPath = req.file.path;
        const outputPath = path.join('uploads', `${req.file.filename}.docx`);

        await new Promise((resolve, reject) => {
            exec(`soffice --headless --convert-to docx "${inputPath}" --outdir uploads/`, (error) => {
                if (error) return reject(error);
                resolve();
            });
        });

        res.download(outputPath, 'converted.docx', (err) => {
            if (!err) {
                fs.unlink(inputPath, () => { }); // Delete original
                fs.unlink(outputPath, () => { }); // Delete converted
            }
        });

    } catch (error) {
        console.error('Conversion error:', error);
        res.status(500).json({ error: 'Conversion failed' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// const express = require('express');
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
// const { exec } = require('child_process');
// const cors = require('cors');
// const util = require('util');
// const execPromise = util.promisify(exec);

// const app = express();
// const port = 5000;

// app.use(cors());
// app.use(express.static('uploads'));

// const upload = multer({
//     dest: 'uploads/',
//     limits: {
//         fileSize: 15 * 1024 * 1024, // 15MB limit
//         files: 1
//     }
// });

// // Create uploads directory if not exists
// if (!fs.existsSync('uploads')) {
//     fs.mkdirSync('uploads');
// }

// // Helper function for LibreOffice conversions with timeout
// async function libreOfficeConvert(inputPath, format, outputPath, timeout = 30000) {
//     const command = `soffice --headless --convert-to ${format} "${inputPath}" --outdir ${path.dirname(outputPath)}`;

//     try {
//         const { stdout, stderr } = await util.promisify(exec)(command, { timeout });
//         if (stderr) {
//             throw new Error(`LibreOffice conversion error: ${stderr}`);
//         }
//         return outputPath;
//     } catch (error) {
//         throw new Error(`Conversion failed: ${error.message}`);
//     }
// }

// // Convert PDF to Word (using LibreOffice)
// app.post('/convert/pdf-to-docx', upload.single('file'), async (req, res) => {
//     try {
//         if (!req.file) {
//             return res.status(400).json({ error: 'No file uploaded' });
//         }

//         const inputPath = req.file.path;
//         const outputPath = path.join('uploads', `${req.file.filename}.docx`);

//         // Validate PDF file
//         const fileExt = path.extname(req.file.originalname).toLowerCase();
//         if (fileExt !== '.pdf') {
//             return res.status(400).json({ error: 'Invalid file format. Please upload a PDF file.' });
//         }

//         // Perform conversion with timeout
//         await libreOfficeConvert(inputPath, 'docx', outputPath, 60000);

//         // Check if output file was created
//         if (!fs.existsSync(outputPath)) {
//             throw new Error('Conversion failed - output file not created');
//         }

//         // Set proper content headers
//         res.setHeader('Content-Disposition', 'attachment; filename=converted.docx');
//         res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

//         // Stream the file to the client
//         const fileStream = fs.createReadStream(outputPath);
//         fileStream.pipe(res);

//         // Cleanup files after stream ends
//         fileStream.on('end', () => {
//             fs.unlink(inputPath, () => { });
//             fs.unlink(outputPath, () => { });
//         });

//         fileStream.on('error', (err) => {
//             console.error('File stream error:', err);
//             res.status(500).json({ error: 'Failed to send converted file' });
//         });

//     } catch (error) {
//         console.error('PDF to DOCX Conversion Error:', error);
//         res.status(500).json({ error: 'Conversion failed. Please try again.' });
//     }
// });

// // Error handling middleware
// app.use((err, req, res, next) => {
//     console.error('Global Error:', err.stack);
//     res.status(500).json({ error: 'An unexpected error occurred' });
// });

// app.listen(port, () => {
//     console.log(`Server running at http://localhost:${port}`);
// });