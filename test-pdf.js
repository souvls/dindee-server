const fs = require('fs');
const pdf = require('pdf-parse');

const filePath = 'src/assets/rawlandlao.pdf';

if (fs.existsSync(filePath)) {
    const dataBuffer = fs.readFileSync(filePath);
    
    console.log('Attempting pdf(dataBuffer)...');
    
    pdf(dataBuffer).then(data => {
        console.log('Success!');
        console.log('Pages:', data.numpages);
        console.log('Text preview:', data.text.substring(0, 100).replace(/\n/g, ' '));
    }).catch(e => {
        console.error('Error:', e);
    });

} else {
    console.log('File not found:', filePath);
}
