const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');
const cors = require('cors');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.static('uploads'));
app.use(express.json());

if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// 🔁 Word (.docx) to PDF using LibreOffice
app.post('/convert/docx-to-pdf', upload.single('file'), async (req, res) => {
    try {
        const inputPath = req.file.path;
        const outputPath = path.join('uploads', `${req.file.filename}.pdf`);

        await new Promise((resolve, reject) => {
            exec(`soffice --headless --convert-to pdf "${inputPath}" --outdir uploads/`, (error) => {
                if (error) return reject(error);
                resolve();
            });
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="converted.pdf"');

        res.download(outputPath, 'converted.pdf', (err) => {
            if (!err) {
                fs.unlink(inputPath, () => { });
                fs.unlink(outputPath, () => { });
            }
        });
    } catch (error) {
        console.error('DOCX to PDF conversion error:', error);
        res.status(500).json({ error: 'DOCX to PDF conversion failed' });
    }
});

// 🔁 PDF to Word (.docx) using Python script
app.post('/convert/pdf-to-docx', upload.single('file'), (req, res) => {
    const inputPath = req.file.path;
    const outputPath = path.join('uploads', `${req.file.filename}.docx`);

    const python = spawn('python', ['convert.py', inputPath, outputPath]);

    python.stdout.on('data', (data) => {
        const message = data.toString().trim();
        if (message === 'success') {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', 'attachment; filename="converted.docx"');

            res.download(outputPath, 'converted.docx', () => {
                fs.unlink(inputPath, () => { });
                fs.unlink(outputPath, () => { });
            });
        } else if (message.startsWith('error:')) {
            console.error('Conversion error:', message);
            res.status(500).json({ error: message });
        }
    });

    python.stderr.on('data', (data) => {
        console.error(`Python error: ${data}`);
    });

    python.on('close', (code) => {
        if (code !== 0) {
            console.error(`Python process exited with code ${code}`);
        }
    });
});

app.listen(port, () => {
    console.log(`✅ File Converter running at http://localhost:${port}`);
});
