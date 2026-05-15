const { Jimp } = require('jimp');
const jsQR = require('jsqr');
const tesseract = require('tesseract.js') as {
    recognize: (
        image: Buffer,
        language?: string,
    ) => Promise<{ data: { text: string } }>;
};

interface ReceiptAnalysisRequest {
    image?: string;
    imageBase64?: string;
    ledgerAccounts?: string[];
    language?: string;
}

interface ReceiptAnalysisResult {
    text: string;
    ocrText: string;
    qrText: string;
    guesses: {
        valor: number | null;
        descricao: string;
        plano_conta: string;
    };
}

function getImageBuffer(body: ReceiptAnalysisRequest): Buffer {
    const image = body.imageBase64 ?? body.image;

    if (!image || typeof image !== 'string') {
        throw new Error('Missing receipt image');
    }

    const base64 = image.includes(',')
        ? image.split(',').pop() ?? ''
        : image;
    const buffer = Buffer.from(base64, 'base64');

    if (buffer.length === 0) {
        throw new Error('Invalid receipt image');
    }

    return buffer;
}

async function readReceiptQr(buffer: Buffer): Promise<string> {
    try {
        const image = await Jimp.read(buffer);
        const { data, width, height } = image.bitmap;
        const code = jsQR(new Uint8ClampedArray(data), width, height);
        return code?.data ?? '';
    } catch (error) {
        console.log('Error reading receipt QR', error);
        return '';
    }
}

async function readReceiptOcr(buffer: Buffer, language: string): Promise<string> {
    const result = await tesseract.recognize(buffer, language);
    return result.data.text.trim();
}

function extractReceiptValue(text: string): number | null {
    const lines = text.split(/\r?\n/);
    const totalLine = lines.find((line) =>
        /total|valor|amount|importe|pagar|a pagar/i.test(line),
    );
    const source = totalLine ?? text;
    const matches = Array.from(source.matchAll(/(?:€\s*)?(\d{1,6}(?:[.,]\d{2}))(?:\s*€)?/g));
    const values = matches
        .map((match) => Number(match[1].replace(',', '.')))
        .filter((value) => Number.isFinite(value));

    if (values.length === 0) {
        return null;
    }

    return -Math.abs(values[values.length - 1]);
}

function extractReceiptDescription(text: string): string {
    return text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) =>
            line.length >= 3 &&
            !/^\d|total|valor|amount|importe|nif|iva|tax|data|date|hora|time/i.test(line),
        ) ?? '';
}

function extractLedgerAccount(text: string, ledgerAccounts: string[] = []): string {
    const normalizedText = text.toLowerCase();
    const accountMatch = ledgerAccounts.find((ledger) =>
        normalizedText.includes(ledger.toLowerCase()),
    );

    if (accountMatch) {
        return accountMatch;
    }

    const keywordMatches: Array<[RegExp, string]> = [
        [/supermerc|mercado|grocery|continente|pingo|lidl|aldi|auchan/i, 'Alimentacao'],
        [/gasolina|diesel|combust|fuel|repsol|galp|bp|cepsa/i, 'Combustivel'],
        [/restaurante|cafe|coffee|bar|food/i, 'Restaurante'],
        [/farmacia|pharmacy|saude|health/i, 'Saude'],
        [/parking|parque|estacion/i, 'Parking'],
    ];
    const keywordMatch = keywordMatches.find(([pattern]) => pattern.test(text));

    return keywordMatch?.[1] ?? '';
}

async function analyzeMovimentReceipt(body: ReceiptAnalysisRequest): Promise<ReceiptAnalysisResult> {
    const buffer = getImageBuffer(body);
    const language = body.language ?? 'por+eng+spa';
    const [qrText, ocrText] = await Promise.all([
        readReceiptQr(buffer),
        readReceiptOcr(buffer, language),
    ]);
    const text = [qrText, ocrText].filter(Boolean).join('\n');

    return {
        text,
        ocrText,
        qrText,
        guesses: {
            valor: extractReceiptValue(text),
            descricao: extractReceiptDescription(text),
            plano_conta: extractLedgerAccount(text, body.ledgerAccounts),
        },
    };
}

export {
    analyzeMovimentReceipt
};
