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
    requestId?: string;
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

interface ReceiptImage {
    buffer: Buffer;
    mimeType: string;
    encodedLength: number;
}

function getImageBuffer(body: ReceiptAnalysisRequest): ReceiptImage {
    const image = body.imageBase64 ?? body.image;

    if (!image || typeof image !== 'string') {
        throw new Error('Missing receipt image');
    }

    const dataUriMatch = image.match(/^data:([^;,]+);base64,/i);
    const base64 = image.includes(',')
        ? image.split(',').pop() ?? ''
        : image;
    const buffer = Buffer.from(base64, 'base64');

    if (buffer.length === 0) {
        throw new Error('Invalid receipt image');
    }

    return {
        buffer,
        mimeType: dataUriMatch?.[1] ?? 'unknown',
        encodedLength: base64.length,
    };
}

async function readReceiptQr(buffer: Buffer, requestId: string): Promise<string> {
    const startedAt = Date.now();

    try {
        const image = await Jimp.read(buffer);
        const { data, width, height } = image.bitmap;
        const code = jsQR(new Uint8ClampedArray(data), width, height);

        console.log('[receipt/qr] Completed', {
            requestId,
            durationMs: Date.now() - startedAt,
            width,
            height,
            found: !!code?.data,
        });
        return code?.data ?? '';
    } catch (error) {
        console.error('[receipt/qr] Failed', {
            requestId,
            durationMs: Date.now() - startedAt,
            error,
        });
        return '';
    }
}

async function readReceiptOcr(buffer: Buffer, language: string, requestId: string): Promise<string> {
    const startedAt = Date.now();

    try {
        const result = await tesseract.recognize(buffer, language);
        const text = result.data.text.trim();

        console.log('[receipt/ocr] Completed', {
            requestId,
            durationMs: Date.now() - startedAt,
            language,
            textLength: text.length,
        });
        return text;
    } catch (error) {
        console.error('[receipt/ocr] Failed', {
            requestId,
            durationMs: Date.now() - startedAt,
            language,
            error,
        });
        throw error;
    }
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
    const requestId = body.requestId ?? 'unknown';
    const startedAt = Date.now();
    const { buffer, mimeType, encodedLength } = getImageBuffer(body);
    const language = body.language ?? 'por+eng+spa';

    console.log('[receipt] Analysis started', {
        requestId,
        mimeType,
        encodedLength,
        bufferBytes: buffer.length,
        language,
        ledgerAccountCount: body.ledgerAccounts?.length ?? 0,
    });

    const [qrText, ocrText] = await Promise.all([
        readReceiptQr(buffer, requestId),
        readReceiptOcr(buffer, language, requestId),
    ]);
    const text = [qrText, ocrText].filter(Boolean).join('\n');
    const guesses = {
        valor: extractReceiptValue(text),
        descricao: extractReceiptDescription(text),
        plano_conta: extractLedgerAccount(text, body.ledgerAccounts),
    };

    console.log('[receipt] Analysis completed', {
        requestId,
        durationMs: Date.now() - startedAt,
        qrTextLength: qrText.length,
        ocrTextLength: ocrText.length,
        guessedValue: guesses.valor !== null,
        guessedDescription: !!guesses.descricao,
        guessedLedgerAccount: !!guesses.plano_conta,
    });

    return {
        text,
        ocrText,
        qrText,
        guesses,
    };
}

export {
    analyzeMovimentReceipt
};
