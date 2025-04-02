// const express = require('express');
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
// const { exec, spawn } = require('child_process');
// const cors = require('cors');

// const app = express();
// const port = 5000;

// app.use(cors());
// app.use(express.static('uploads'));
// app.use(express.json());

// if (!fs.existsSync('uploads')) {
//     fs.mkdirSync('uploads');
// }

// const upload = multer({
//     dest: 'uploads/',
//     limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
// });

// // 🔁 Word (.docx) to PDF using LibreOffice
// app.post('/convert/docx-to-pdf', upload.single('file'), async (req, res) => {
//     try {
//         const inputPath = req.file.path;
//         const outputPath = path.join('uploads', `${req.file.filename}.pdf`);

//         await new Promise((resolve, reject) => {
//             exec(`soffice --headless --convert-to pdf "${inputPath}" --outdir uploads/`, (error) => {
//                 if (error) return reject(error);
//                 resolve();
//             });
//         });

//         res.setHeader('Content-Type', 'application/pdf');
//         res.setHeader('Content-Disposition', 'attachment; filename="converted.pdf"');

//         res.download(outputPath, 'converted.pdf', (err) => {
//             if (!err) {
//                 fs.unlink(inputPath, () => { });
//                 fs.unlink(outputPath, () => { });
//             }
//         });
//     } catch (error) {
//         console.error('DOCX to PDF conversion error:', error);
//         res.status(500).json({ error: 'DOCX to PDF conversion failed' });
//     }
// });

// // 🔁 PDF to Word (.docx) using Python script
// app.post('/convert/pdf-to-docx', upload.single('file'), (req, res) => {
//     const inputPath = req.file.path;
//     const outputPath = path.join('uploads', `${req.file.filename}.docx`);

//     const python = spawn('python', ['convert.py', inputPath, outputPath]);

//     python.stdout.on('data', (data) => {
//         const message = data.toString().trim();
//         if (message === 'success') {
//             res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
//             res.setHeader('Content-Disposition', 'attachment; filename="converted.docx"');

//             res.download(outputPath, 'converted.docx', () => {
//                 fs.unlink(inputPath, () => { });
//                 fs.unlink(outputPath, () => { });
//             });
//         } else if (message.startsWith('error:')) {
//             console.error('Conversion error:', message);
//             res.status(500).json({ error: message });
//         }
//     });

//     python.stderr.on('data', (data) => {
//         console.error(`Python error: ${data}`);
//     });

//     python.on('close', (code) => {
//         if (code !== 0) {
//             console.error(`Python process exited with code ${code}`);
//         }
//     });
// });

// app.listen(port, () => {
//     console.log(`✅ File Converter running at http://localhost:${port}`);
// });

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { exec, spawn } = require('child_process');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// 🧠 Store files with original names + timestamp
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => cb(null, 'uploads/'),
//     filename: (req, file, cb) => {
//         const timestamp = Date.now();
//         const safeName = file.originalname.replace(/\s+/g, '-');
//         cb(null, `${timestamp}-${safeName}`);
//     },
// });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const now = new Date();
        const date = now.toISOString().split('T')[0]; // e.g. 2025-03-30
        const time = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // e.g. 16-15-00
        const originalName = file.originalname.replace(/\s+/g, '-'); // remove spaces

        const finalName = `${date}_${time}_${originalName}`;
        cb(null, finalName);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 },
});

// 📥 DOCX → PDF
app.post('/convert/docx-to-pdf', upload.single('file'), async (req, res) => {
    try {
        const inputPath = req.file.path;
        const outputPath = inputPath.replace(/\.docx$/, '') + '.pdf';

        await new Promise((resolve, reject) => {
            exec(`soffice --headless --convert-to pdf "${inputPath}" --outdir uploads/`, (error) => {
                if (error) return reject(error);
                resolve();
            });
        });

        const filename = path.basename(outputPath);
        res.json({ downloadUrl: `/uploads/${filename}` });
    } catch (error) {
        console.error('DOCX to PDF error:', error);
        res.status(500).json({ error: 'Conversion failed' });
    }
});

app.get("/", (req, res) => {
    res.send("Convert PDF to word and Word to Pdf API is running 🚀");
});
// 📥 PDF → DOCX
app.post('/convert/pdf-to-docx', upload.single('file'), (req, res) => {
    const inputPath = req.file.path;
    const outputPath = inputPath.replace(/\.pdf$/, '') + '.docx';

    const python = spawn('python', ['convert.py', inputPath, outputPath]);

    python.stdout.on('data', (data) => {
        const message = data.toString().trim();
        if (message === 'success') {
            const filename = path.basename(outputPath);
            res.json({ downloadUrl: `/uploads/${filename}` });
        } else if (message.startsWith('error:')) {
            console.error('Python conversion error:', message);
            res.status(500).json({ error: message });
        }
    });

    python.stderr.on('data', (data) => {
        console.error(`Python stderr: ${data}`);
    });

    python.on('close', (code) => {
        if (code !== 0) {
            console.error(`Python process exited with code ${code}`);
        }
    });
});

// 📂 List all files in /uploads
app.get('/files', (req, res) => {
    fs.readdir('uploads', (err, files) => {
        if (err) return res.status(500).json({ error: 'Unable to list files' });

        const fileList = files.map((file) => ({
            name: file,
            url: `/uploads/${file}`,
        }));

        res.json(fileList);
    });
});

app.delete('/delete/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.params.filename);
    fs.unlink(filePath, (err) => {
        if (err) {
            console.error('Delete error:', err);
            return res.status(500).json({ error: 'Failed to delete file' });
        }
        res.json({ success: true });
    });
});


app.listen(port, () => {
    console.log(`✅ File Converter running at http://localhost:${port}`);
});
