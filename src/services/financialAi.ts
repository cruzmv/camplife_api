import axios from 'axios';

interface BalanceRow {
    datetime: string;
    description: string;
    ledger_account_id: number;
    ledger_account: string;
    moviment_account_id: number;
    moviment_account: string;
    status: string;
    value: string | number;
    credit_bill?: boolean | null;
    account_type: 0 | 1 | null;
}

interface FinanceSettings {
    accounts?: Array<{ id: number; description: string; account_type: 0 | 1 | null }>;
    ledgerAccounts?: Array<{ id: number; description: string }>;
}

export interface FinancialAiAnalysis {
    headline: string;
    summary: string;
    insights: Array<{ title: string; detail: string }>;
    risks: string[];
    recommendations: string[];
    generatedAt: string;
    period: string;
}

interface OpenAiResponse {
    output_text?: string;
    output?: Array<{
        content?: Array<{ text?: string }>;
    }>;
}

interface CategorySnapshot {
    name: string;
    income: number;
    expenses: number;
    consumed: number;
    provisioned: number;
    movementCount: number;
}

interface AccountSnapshot {
    name: string;
    expenses: number;
    accountType: 0 | 1 | null;
    movementCount: number;
}

function parsePeriod(period: unknown): { key: string; start: Date; end: Date } {
    const normalized = String(period ?? '').trim();
    const match = normalized.match(/^(\d{4})-(\d{2})$/);

    if (!match) {
        throw new Error('Invalid analysis period');
    }

    const year = Number(match[1]);
    const month = Number(match[2]);

    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
        throw new Error('Invalid analysis period');
    }

    return {
        key: normalized,
        start: new Date(year, month - 1, 1, 0, 0, 0, 0),
        end: new Date(year, month, 0, 23, 59, 59, 999),
    };
}

function roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatMoney(value: number): string {
    return new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
    }).format(value);
}

function isWithinPeriod(row: BalanceRow, start: Date, end: Date): boolean {
    const time = new Date(row.datetime).getTime();

    return Number.isFinite(time) && time >= start.getTime() && time <= end.getTime();
}

function normalizeStatus(status: string | null | undefined): string {
    return (status ?? '').trim().toLowerCase();
}

function normalizeDescription(description: string | null | undefined): string {
    return (description ?? '')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function isCreditBillRow(row: BalanceRow): boolean {
    return !!row.credit_bill || normalizeDescription(row.description).startsWith('fatura ');
}

function getShare(part: number, total: number): number {
    return total > 0 ? Math.round((part / total) * 100) : 0;
}

function buildAnalysis(body: {
    period: unknown;
    rows: BalanceRow[];
    settings: FinanceSettings;
}): FinancialAiAnalysis {
    const period = parsePeriod(body.period);
    const monthRows = body.rows.filter((row) => isWithinPeriod(row, period.start, period.end));
    const ledgerNames = new Map((body.settings.ledgerAccounts ?? []).map((account) => [Number(account.id), account.description]));
    const accountNames = new Map((body.settings.accounts ?? []).map((account) => [Number(account.id), account.description]));
    const accountTypes = new Map((body.settings.accounts ?? []).map((account) => [Number(account.id), account.account_type]));
    const categories = new Map<number, CategorySnapshot>();
    const accounts = new Map<number, AccountSnapshot>();
    let income = 0;
    let expenses = 0;
    let consumedExpenses = 0;
    let provisionedExpenses = 0;
    let creditExpenses = 0;
    let creditBillPayments = 0;
    let creditBillCount = 0;

    monthRows.forEach((row) => {
        const value = Number(row.value) || 0;
        const absValue = Math.abs(value);
        const isExpense = value < 0;
        const isCreditBill = isCreditBillRow(row);
        const status = normalizeStatus(row.status);
        const ledgerId = Number(row.ledger_account_id) || 0;
        const accountId = Number(row.moviment_account_id) || 0;
        const accountType = accountTypes.get(accountId) ?? row.account_type;
        const category = categories.get(ledgerId) ?? {
            name: ledgerNames.get(ledgerId) ?? row.ledger_account ?? 'Sem categoria',
            income: 0,
            expenses: 0,
            consumed: 0,
            provisioned: 0,
            movementCount: 0,
        };
        const account = accounts.get(accountId) ?? {
            name: accountNames.get(accountId) ?? row.moviment_account ?? 'Sem conta',
            expenses: 0,
            accountType,
            movementCount: 0,
        };

        if (isCreditBill) {
            creditBillPayments += absValue;
            creditBillCount += 1;
            return;
        }

        income += value > 0 ? value : 0;
        expenses += isExpense ? absValue : 0;
        consumedExpenses += isExpense && status === 'consumado' ? absValue : 0;
        provisionedExpenses += isExpense && status === 'provisionado' ? absValue : 0;
        creditExpenses += isExpense && accountType === 1 ? absValue : 0;

        category.income += value > 0 ? value : 0;
        category.expenses += isExpense ? absValue : 0;
        category.consumed += status === 'consumado' ? value : 0;
        category.provisioned += status === 'provisionado' ? value : 0;
        category.movementCount += 1;
        categories.set(ledgerId, category);

        account.expenses += isExpense ? absValue : 0;
        account.movementCount += 1;
        accounts.set(accountId, account);
    });

    const net = income - expenses;
    const topCategories = Array.from(categories.values())
        .sort((left, right) => right.expenses - left.expenses)
        .filter((category) => category.expenses > 0);
    const topAccounts = Array.from(accounts.values())
        .sort((left, right) => right.expenses - left.expenses)
        .filter((account) => account.expenses > 0);
    const biggestCategory = topCategories[0];
    const biggestAccount = topAccounts[0];
    const insights: Array<{ title: string; detail: string }> = [];
    const risks: string[] = [];
    const recommendations: string[] = [];

    if (biggestCategory) {
        insights.push({
            title: `${biggestCategory.name} concentra ${getShare(biggestCategory.expenses, expenses)}% das despesas`,
            detail: `Foram ${formatMoney(biggestCategory.expenses)} em ${biggestCategory.movementCount} movimentos neste mes.`,
        });
    }

    insights.push({
        title: net >= 0 ? 'Mes positivo' : 'Mes em desequilibrio',
        detail: `Entraram ${formatMoney(income)} e sairam ${formatMoney(expenses)}, resultando em ${formatMoney(net)}.`,
    });

    if (creditExpenses > 0) {
        insights.push({
            title: 'Cartao de credito no radar',
            detail: `${formatMoney(creditExpenses)} das despesas passaram por contas de credito.`,
        });
    }

    if (creditBillPayments > 0) {
        insights.push({
            title: 'Fatura separada do gasto real',
            detail: `${formatMoney(creditBillPayments)} em ${creditBillCount} lancamento${creditBillCount === 1 ? '' : 's'} de fatura foram ignorados nos totais para evitar duplicidade.`,
        });
    }

    if (provisionedExpenses > 0) {
        risks.push(`Ainda existem ${formatMoney(provisionedExpenses)} em despesas provisionadas para acompanhar.`);
    }

    if (expenses > income && income > 0) {
        risks.push('As despesas do periodo ultrapassaram as entradas registadas.');
    }

    if (biggestAccount?.accountType === 1) {
        risks.push(`A conta ${biggestAccount.name} tem o maior volume de despesas e e de credito.`);
    }

    if (biggestCategory) {
        recommendations.push(`Rever os movimentos de ${biggestCategory.name} antes do proximo fecho do mes.`);
    }

    if (provisionedExpenses > consumedExpenses * 0.4 && provisionedExpenses > 0) {
        recommendations.push('Confirmar quais despesas provisionadas ainda vao acontecer e ajustar o planeamento.');
    }

    recommendations.push(net >= 0
        ? 'Definir quanto do saldo positivo deve ser reservado antes de criar novos gastos.'
        : 'Escolher uma categoria para reduzir ja na proxima semana e acompanhar o impacto.');

    if (monthRows.length === 0) {
        return {
            headline: 'Sem movimentos para analisar',
            summary: 'Ainda nao ha dados suficientes neste periodo para gerar uma leitura financeira.',
            insights: [],
            risks: [],
            recommendations: ['Registar entradas e despesas do mes para desbloquear uma analise util.'],
            generatedAt: new Date().toISOString(),
            period: period.key,
        };
    }

    return {
        headline: net >= 0 ? `Saldo mensal positivo de ${formatMoney(roundMoney(net))}` : `Saldo mensal negativo de ${formatMoney(roundMoney(Math.abs(net)))}`,
        summary: `Foram analisados ${monthRows.length} movimentos, com ${formatMoney(income)} em entradas e ${formatMoney(expenses)} em despesas reais${creditBillPayments > 0 ? `, sem duplicar ${formatMoney(creditBillPayments)} de faturas` : ''}.`,
        insights: insights.slice(0, 4),
        risks: risks.slice(0, 4),
        recommendations: recommendations.slice(0, 5),
        generatedAt: new Date().toISOString(),
        period: period.key,
    };
}


function extractOpenAiText(response: OpenAiResponse): string {
    if (response.output_text) {
        return response.output_text;
    }

    return response.output
        ?.flatMap((item) => item.content ?? [])
        .map((content) => content.text ?? '')
        .filter(Boolean)
        .join('\n') ?? '';
}

function parseOpenAiAnalysis(text: string, fallback: FinancialAiAnalysis): FinancialAiAnalysis {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[0] ?? text) as Partial<FinancialAiAnalysis>;

    return {
        headline: String(parsed.headline ?? fallback.headline).trim(),
        summary: String(parsed.summary ?? fallback.summary).trim(),
        insights: Array.isArray(parsed.insights) ? parsed.insights.slice(0, 4).map((insight: any) => ({
            title: String(insight?.title ?? '').trim(),
            detail: String(insight?.detail ?? '').trim(),
        })).filter((insight) => insight.title && insight.detail) : fallback.insights,
        risks: Array.isArray(parsed.risks)
            ? parsed.risks.slice(0, 4).map((risk) => String(risk).trim()).filter(Boolean)
            : fallback.risks,
        recommendations: Array.isArray(parsed.recommendations)
            ? parsed.recommendations.slice(0, 5).map((item) => String(item).trim()).filter(Boolean)
            : fallback.recommendations,
        generatedAt: new Date().toISOString(),
        period: fallback.period,
    };
}

async function analyzeFinancialSnapshot(body: {
    period: unknown;
    rows: BalanceRow[];
    settings: FinanceSettings;
}): Promise<FinancialAiAnalysis> {
    const fallback = buildAnalysis(body);
    const apiKey = process.env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
        return fallback;
    }

    const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini';

    console.log('[financial-ai] Calling OpenAI model', model);

    const response = await axios.post<OpenAiResponse>(
        'https://api.openai.com/v1/responses',
        {
            model,
            instructions: [
                'Tu és um assistente de análise financeira pessoal.',
                'Responde em português de Portugal, com tom claro, prático e cuidadoso.',
                'Usa apenas os dados recebidos. Não inventes valores.',
                'Não trates pagamentos de fatura de cartão como uma segunda despesa.',
                'Retorna somente JSON válido com headline, summary, insights, risks e recommendations.',
            ].join(' '),
            input: JSON.stringify({
                period: fallback.period,
                localAnalysis: fallback,
                note: 'Os totais já excluem faturas de cartão para evitar duplicidade.',
            }),
        },
        {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            timeout: 45000,
        },
    );

    return parseOpenAiAnalysis(extractOpenAiText(response.data), fallback);
}

export { analyzeFinancialSnapshot };
