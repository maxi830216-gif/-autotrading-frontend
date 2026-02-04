/**
 * API Client for Upbit Trading Backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiResponse<T> {
    data?: T;
    error?: string;
}

function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
}

async function fetchApi<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    try {
        const token = getAuthToken();
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        // Add auth token if available
        if (token) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            // Handle 401 Unauthorized - redirect to login
            if (response.status === 401 && typeof window !== 'undefined') {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }

            return { error: errorData.detail || `HTTP ${response.status}` };
        }

        const data = await response.json();
        return { data };
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

// ==================
// System API
// ==================

export interface BotStatus {
    // For mode-specific status
    is_running?: boolean;
    mode?: string;
    uptime_seconds?: number | null;
    last_check?: string | null;
    whitelist_count: number;
    active_positions: number;
    // For combined status (when no mode specified)
    simulation_running?: boolean;
    real_running?: boolean;
    simulation_uptime?: number | null;
    real_uptime?: number | null;
    simulation_last_check?: string | null;
    real_last_check?: string | null;
}

export async function getBotStatus(mode?: string): Promise<ApiResponse<BotStatus>> {
    const params = mode ? `?mode=${mode}` : '';
    return fetchApi<BotStatus>(`/api/system/status${params}`);
}

export async function startBot(mode: string = 'simulation'): Promise<ApiResponse<{ success: boolean; message: string; mode: string }>> {
    return fetchApi(`/api/system/start?mode=${mode}`, { method: 'POST' });
}

export async function stopBot(mode: string = 'simulation'): Promise<ApiResponse<{ success: boolean; message: string; mode: string }>> {
    return fetchApi(`/api/system/stop?mode=${mode}`, { method: 'POST' });
}

export interface PanicSellResult {
    success: boolean;
    message: string;
    mode?: string;
    sold_positions: Array<{
        market: string;
        quantity: number;
        executed_price: number;
        success: boolean;
    }>;
}

export async function panicSell(mode: string = 'simulation'): Promise<ApiResponse<PanicSellResult>> {
    return fetchApi<PanicSellResult>(`/api/system/panic-sell?mode=${mode}`, { method: 'POST' });
}

export interface SellPositionResult {
    success: boolean;
    message: string;
    mode: string;
    market: string;
    quantity: number;
    executed_price: number;
}

export async function sellPosition(market: string, mode: string = 'simulation'): Promise<ApiResponse<SellPositionResult>> {
    return fetchApi<SellPositionResult>(`/api/system/sell-position?market=${market}&mode=${mode}`, { method: 'POST' });
}

// ==================
// Trading API
// ==================

export interface WhitelistItem {
    market: string;
    korean_name: string;
    english_name: string;
    trade_volume_24h: number;
    current_price: number | null;
    change_rate: number | null;
    status: 'watching' | 'pending_buy' | 'holding';
}

export interface WhitelistResponse {
    updated_at: string;
    coins: WhitelistItem[];
}

export async function getWhitelist(mode: 'simulation' | 'real' = 'simulation'): Promise<ApiResponse<WhitelistResponse>> {
    return fetchApi<WhitelistResponse>(`/api/trading/whitelist?mode=${mode}`);
}

export async function refreshWhitelist(): Promise<ApiResponse<{ success: boolean; count: number }>> {
    return fetchApi('/api/trading/whitelist/refresh', { method: 'POST' });
}

export interface TradeLog {
    id: number;
    mode: string;
    strategy: string;
    timeframe: string;
    coin: string;
    side: 'buy' | 'sell';
    price: number;
    quantity: number;
    total_amount: number;
    pnl: number | null;
    pnl_percent: number | null;
    confidence: number | null;
    reason: string | null;
    order_id: string | null;
    stop_loss: number | null;
    take_profit: number | null;
    take_profit_2: number | null;  // ★ Phase 9
    created_at: string;
}

export interface TradeHistoryResponse {
    total: number;
    logs: TradeLog[];
}

export interface TradeHistoryParams {
    mode?: string;
    strategy?: string;
    coin?: string;
    side?: string;
    exchange?: string;
    limit?: number;
    offset?: number;
}

export async function getTradeHistory(params: TradeHistoryParams = {}): Promise<ApiResponse<TradeHistoryResponse>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
    });
    const query = searchParams.toString();
    return fetchApi<TradeHistoryResponse>(`/api/trading/history${query ? `?${query}` : ''}`);
}

export interface PortfolioItem {
    coin: string;
    balance: number;
    avg_buy_price: number;
    current_price: number | null;
    unrealized_pnl: number | null;
    unrealized_pnl_percent: number | null;
    source: 'ai' | 'manual';  // "ai" for AI trades, "manual" for direct exchange trades
    strategy?: string | null;  // Strategy name if AI trade (e.g., "squirrel", "morning")
    can_sell: boolean;  // False if market_value < 5,000 KRW (Upbit minimum order)
}

export interface PortfolioResponse {
    krw_balance: number;
    total_asset_value: number;
    today_pnl: number;
    today_pnl_percent: number;
    positions: PortfolioItem[];
}

export async function getPortfolio(mode: string = 'simulation'): Promise<ApiResponse<PortfolioResponse>> {
    return fetchApi<PortfolioResponse>(`/api/trading/portfolio?mode=${mode}`);
}

export interface SystemLogEntry {
    id: number;
    level: string;
    message: string;
    mode?: string;
    created_at: string;
}

export async function getRecentLogs(limit = 100, mode?: string): Promise<ApiResponse<{ logs: SystemLogEntry[] }>> {
    const params = mode ? `?limit=${limit}&mode=${mode}` : `?limit=${limit}`;
    return fetchApi<{ logs: SystemLogEntry[] }>(`/api/trading/logs/recent${params}`);
}

// Period Returns
export interface PeriodReturns {
    period_days: number;
    mode: string;
    total_pnl: number;
    pnl_percent: number;
    trade_count: number;
    total_invested: number;
}

export async function getPeriodReturns(mode: string = 'simulation', days: number = 1): Promise<ApiResponse<PeriodReturns>> {
    return fetchApi<PeriodReturns>(`/api/trading/returns?mode=${mode}&days=${days}`);
}

// Returns Chart
export interface ReturnsChartDataPoint {
    timestamp: string;
    cumulative_return_percent: number;
    cumulative_pnl: number;  // 누적 수익금액 (원 또는 USDT)
    trade_count: number;
}

export interface ReturnsChartResponse {
    data_points: ReturnsChartDataPoint[];
    total_return_percent: number;
    total_pnl: number;  // 총 수익금액
    total_trades: number;
}

export interface ReturnsChartParams {
    mode?: string;
    strategy?: string;
}

export async function getReturnsChart(params: ReturnsChartParams = {}): Promise<ApiResponse<ReturnsChartResponse>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
    });
    const query = searchParams.toString();
    return fetchApi<ReturnsChartResponse>(`/api/trading/history/returns-chart${query ? `?${query}` : ''}`);
}


// SSE Log Stream
export function createLogStream(onLog: (logs: SystemLogEntry[]) => void, onError?: (error: Error) => void) {
    const eventSource = new EventSource(`${API_BASE_URL}/api/trading/logs`);

    eventSource.addEventListener('logs', (event) => {
        try {
            const logs = JSON.parse(event.data);
            onLog(logs);
        } catch (e) {
            console.error('Failed to parse log data:', e);
        }
    });

    eventSource.addEventListener('error', () => {
        onError?.(new Error('Log stream error'));
    });

    return () => eventSource.close();
}

// ==================
// Settings API
// ==================

export interface StrategyConfig {
    enabled: boolean;
    // ★ Phase 9: min_confidence 제거됨
    name: string;
    description: string;
    timeframe: string;
}

export interface Settings {
    upbit_access_key: string;
    upbit_secret_key: string;
    telegram_token: string;
    telegram_chat_id: string;
    telegram_enabled: boolean;
    strategy_settings: Record<string, StrategyConfig>;
    hard_cap_ratio: number;
    virtual_krw_balance: number;
}

export async function getSettings(exchange: 'upbit' | 'bybit' = 'upbit'): Promise<ApiResponse<Settings>> {
    return fetchApi<Settings>(`/api/settings?exchange=${exchange}`);
}

export interface SettingsUpdate {
    upbit_access_key?: string;
    upbit_secret_key?: string;
    telegram_token?: string;
    telegram_chat_id?: string;
    telegram_enabled?: boolean;
    strategy_settings?: Record<string, Partial<StrategyConfig>>;
    hard_cap_ratio?: number;
    virtual_krw_balance?: number;
}

export async function updateSettings(settings: SettingsUpdate, exchange: 'upbit' | 'bybit' = 'upbit'): Promise<ApiResponse<{ success: boolean; updated_fields: string[] }>> {
    return fetchApi(`/api/settings?exchange=${exchange}`, {
        method: 'PUT',
        body: JSON.stringify(settings),
    });
}

export async function testTelegram(): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return fetchApi('/api/settings/telegram/test', {
        method: 'POST',
        body: JSON.stringify({})
    });
}

export async function validateUpbit(): Promise<ApiResponse<{ valid: boolean; krw_balance?: number; message: string }>> {
    return fetchApi('/api/settings/validate-upbit', { method: 'POST' });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return fetchApi('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
}

// ==================
// Bybit API
// ==================

export interface BybitWhitelistItem {
    symbol: string;
    name: string;
    rank: number;
    current_price: number;
    volume_24h: number;
    change_24h: number;
    funding_rate: number;
    status: 'watching' | 'holding';
}

export interface BybitWhitelistResponse {
    updated_at: string;
    coins: BybitWhitelistItem[];
}

export async function getBybitWhitelist(mode: 'simulation' | 'real' = 'simulation'): Promise<ApiResponse<BybitWhitelistResponse>> {
    return fetchApi<BybitWhitelistResponse>(`/api/bybit/whitelist?mode=${mode}`);
}

export interface BybitPortfolioItem {
    id: number;
    symbol: string;
    side: string;
    quantity: number;
    entry_price: number;
    current_price: number;
    leverage: number;
    margin_used: number;
    position_value: number;
    total_buy_amount: number;
    unrealized_pnl: number;
    unrealized_pnl_percent: number;
    liquidation_price: number | null;
    strategy: string;
    timeframe: string;
    source?: string;  // 'ai' or 'manual'
    created_at: string;
}

export interface BybitPortfolioResponse {
    usdt_balance: number;
    total_asset_value: number;
    total_position_value: number;
    total_unrealized_pnl: number;
    positions: BybitPortfolioItem[];
}

export async function getBybitPortfolio(mode: string = 'simulation'): Promise<ApiResponse<BybitPortfolioResponse>> {
    return fetchApi<BybitPortfolioResponse>(`/api/bybit/portfolio?mode=${mode}`);
}

export interface BybitTradeLog {
    id: number;
    mode: string;
    strategy: string;
    timeframe: string;
    symbol: string;
    side: string;
    price: number;
    quantity: number;
    total_amount: number;
    pnl: number | null;
    pnl_percent: number | null;
    confidence: number | null;
    leverage: number | null;
    funding_fee: number | null;
    reason: string | null;
    stop_loss: number | null;
    take_profit: number | null;
    take_profit_2: number | null;  // ★ Phase 9
    created_at: string;
}

export interface BybitTradeHistoryResponse {
    total: number;
    logs: BybitTradeLog[];
}

export async function getBybitHistory(params: { mode?: string; strategy?: string; limit?: number; offset?: number } = {}): Promise<ApiResponse<BybitTradeHistoryResponse>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
    });
    const query = searchParams.toString();
    return fetchApi<BybitTradeHistoryResponse>(`/api/bybit/history${query ? `?${query}` : ''}`);
}

export async function getBybitLogs(limit = 100, mode?: string): Promise<ApiResponse<{ logs: SystemLogEntry[] }>> {
    const params = mode ? `?limit=${limit}&mode=${mode}` : `?limit=${limit}`;
    return fetchApi<{ logs: SystemLogEntry[] }>(`/api/bybit/logs/recent${params}`);
}

// Bybit Period Returns
export interface BybitPeriodReturns {
    period_days: number;
    mode: string;
    total_pnl: number;
    realized_pnl: number;
    unrealized_pnl: number;
    pnl_percent: number;
    trade_count: number;
    total_invested: number;
}

export async function getBybitPeriodReturns(mode: string = 'simulation', days: number = 1): Promise<ApiResponse<BybitPeriodReturns>> {
    return fetchApi<BybitPeriodReturns>(`/api/bybit/returns?mode=${mode}&days=${days}`);
}

// Bybit Returns Chart
export async function getBybitReturnsChart(params: ReturnsChartParams = {}): Promise<ApiResponse<ReturnsChartResponse>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
    });
    const query = searchParams.toString();
    return fetchApi<ReturnsChartResponse>(`/api/bybit/history/returns-chart${query ? `?${query}` : ''}`);
}

export interface BybitSettings {
    api_configured: boolean;
    strategy_settings: Record<string, StrategyConfig>;
    virtual_balance: number;
    leverage: number;
}

export async function getBybitSettings(): Promise<ApiResponse<BybitSettings>> {
    return fetchApi<BybitSettings>('/api/bybit/settings');
}

export async function updateBybitApiKeys(apiKey: string, apiSecret: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return fetchApi('/api/bybit/settings/api', {
        method: 'PUT',
        body: JSON.stringify({ api_key: apiKey, api_secret: apiSecret }),
    });
}

export async function updateBybitStrategySettings(settings: Record<string, Partial<StrategyConfig>>): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return fetchApi('/api/bybit/settings/strategy', {
        method: 'PUT',
        body: JSON.stringify(settings),
    });
}

export async function openBybitPosition(symbol: string, mode: string = 'simulation'): Promise<ApiResponse<{ success: boolean; symbol: string; entry_price: number }>> {
    return fetchApi(`/api/bybit/order/open?symbol=${symbol}&mode=${mode}`, { method: 'POST' });
}

export async function closeBybitPosition(positionId: number, reason: string = '수동 청산'): Promise<ApiResponse<{ success: boolean; pnl: number; pnl_percent: number }>> {
    return fetchApi(`/api/bybit/order/close/${positionId}?reason=${encodeURIComponent(reason)}`, { method: 'POST' });
}

// Bybit Bot Control
export interface BybitBotStatus {
    simulation_running: boolean;
    real_running: boolean;
}

export async function getBybitBotStatus(mode?: string): Promise<ApiResponse<BybitBotStatus>> {
    const params = mode ? `?mode=${mode}` : '';
    return fetchApi<BybitBotStatus>(`/api/bybit/bot/status${params}`);
}

export async function startBybitBot(mode: string = 'simulation'): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return fetchApi(`/api/bybit/bot/start?mode=${mode}`, { method: 'POST' });
}

export async function stopBybitBot(mode: string = 'simulation'): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return fetchApi(`/api/bybit/bot/stop?mode=${mode}`, { method: 'POST' });
}

// ==================
// Chart API
// ==================

export interface ChartCandle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface ChartData {
    candles: ChartCandle[];
    indicators: {
        rsi?: number[];
        ma5?: number[];
        ma20?: number[];
        bb_upper?: number[];
        bb_lower?: number[];
        bb_middle?: number[];
    };
    levels: {
        entry: number | null;
        stop_loss: number | null;
        take_profit: number | null;
        take_profit_2: number | null;  // ★ Phase 9
    };
    pattern?: {
        type: string;
        markers: Array<{ type: string; indices?: number[]; index?: number }>;
    };
    trade?: {
        id: number;
        coin: string;
        strategy: string;
        timeframe: string;
        side: string;
        price: number | null;
        quantity: number | null;
        pnl: number | null;
        pnl_percent: number | null;
        reason: string;
        confidence: number | null;
        created_at: string | null;
        exchange: string;
        has_snapshot?: boolean;
    };
    position?: {
        id: number;
        coin: string;
        strategy: string;
        timeframe: string;
        direction: string;
        entry_price: number | null;
        quantity: number | null;
        current_price: number;
        pnl_percent: number;
        created_at: string | null;
        exchange: string;
    };
}

export async function getTradeChartData(tradeId: number): Promise<ApiResponse<ChartData>> {
    return fetchApi<ChartData>(`/api/chart/trade/${tradeId}`);
}

export async function getPositionChartData(positionId: number): Promise<ApiResponse<ChartData>> {
    return fetchApi<ChartData>(`/api/chart/position/${positionId}`);
}
