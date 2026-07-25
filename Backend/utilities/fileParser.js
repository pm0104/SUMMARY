import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export const parseFile = async (buffer, mimetype, originalname) => {
    try {
        let text = '';
        let pageCount = 0;

        if (mimetype === 'application/pdf') {
            const data = await pdfParse(buffer);
            text = data.text;
            pageCount = data.numpages || 0;
        } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ buffer });
            text = result.value;
        } else if (mimetype === 'text/plain' || mimetype === 'text/markdown') {
            text = buffer.toString('utf-8');
        } else {
            throw new Error('Unsupported file type');
        }

        // Clean up whitespace: collapse multiple newlines to double newline
        text = text.replace(/\n{3,}/g, '\n\n').trim();
        
        const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
        if (pageCount === 0) {
            pageCount = Math.ceil(wordCount / 300);
        }

        const chunks = [];
        if (text.length > 25000) {
            const paragraphs = text.split('\n\n');
            let currentChunk = '';
            
            for (const para of paragraphs) {
                if (currentChunk.length + para.length + 2 > 25000) {
                    if (currentChunk.length > 0) {
                        chunks.push(currentChunk.trim());
                        currentChunk = '';
                    }
                    
                    if (para.length > 25000) {
                        let remainingPara = para;
                        while(remainingPara.length > 25000) {
                            chunks.push(remainingPara.substring(0, 25000));
                            remainingPara = remainingPara.substring(25000);
                        }
                        if (remainingPara.length > 0) {
                            currentChunk = remainingPara + '\n\n';
                        }
                    } else {
                        currentChunk = para + '\n\n';
                    }
                } else {
                    currentChunk += para + '\n\n';
                }
            }
            if (currentChunk.trim().length > 0) {
                chunks.push(currentChunk.trim());
            }
        } else {
            chunks.push(text);
        }

        return {
            fileName: originalname,
            content: text,
            wordCount,
            pageCount,
            chunks
        };
    } catch (error) {
        return {
            fileName: originalname,
            content: '',
            wordCount: 0,
            pageCount: 0,
            chunks: [],
            error: error.message
        };
    }
};
