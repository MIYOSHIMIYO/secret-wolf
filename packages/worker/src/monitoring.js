/**
 * Durable Object負荷測定・監視システム
 * Phase 0検証用の詳細な監視機能
 */
export class DurableObjectMonitor {
    monitoringData = [];
    quotaUsage = {
        requests: 0,
        cpuTime: 0,
        durableObjectRequests: 0,
        durableObjectCpuTime: 0,
        storageReads: 0,
        storageWrites: 0
    };
    /**
     * 接続数の監視
     */
    recordConnection(roomId, connectionCount) {
        this.monitoringData.push({
            timestamp: Date.now(),
            roomId,
            connectionCount,
            messageCount: 0,
            cpuTime: 0,
            memoryUsage: 0,
            errorCount: 0
        });
        // 古いデータを削除（1時間以上前）
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        this.monitoringData = this.monitoringData.filter(data => data.timestamp > oneHourAgo);
    }
    /**
     * メッセージ数の監視
     */
    recordMessage(roomId) {
        const latestData = this.monitoringData[this.monitoringData.length - 1];
        if (latestData && latestData.roomId === roomId) {
            latestData.messageCount++;
        }
    }
    /**
     * CPU時間の監視
     */
    recordCpuTime(roomId, cpuTime) {
        const latestData = this.monitoringData[this.monitoringData.length - 1];
        if (latestData && latestData.roomId === roomId) {
            latestData.cpuTime += cpuTime;
        }
    }
    /**
     * エラー数の監視
     */
    recordError(roomId) {
        const latestData = this.monitoringData[this.monitoringData.length - 1];
        if (latestData && latestData.roomId === roomId) {
            latestData.errorCount++;
        }
    }
    /**
     * クォータ使用量の更新
     */
    updateQuotaUsage(usage) {
        this.quotaUsage = { ...this.quotaUsage, ...usage };
    }
    /**
     * 監視データの取得
     */
    getMonitoringData() {
        const current = this.monitoringData;
        const summary = {
            totalConnections: current.reduce((sum, data) => sum + data.connectionCount, 0),
            totalMessages: current.reduce((sum, data) => sum + data.messageCount, 0),
            totalCpuTime: current.reduce((sum, data) => sum + data.cpuTime, 0),
            totalErrors: current.reduce((sum, data) => sum + data.errorCount, 0),
            averageConnectionsPerRoom: current.length > 0
                ? current.reduce((sum, data) => sum + data.connectionCount, 0) / current.length
                : 0
        };
        return {
            current,
            summary,
            quota: this.quotaUsage
        };
    }
    /**
     * アラート条件のチェック
     */
    checkAlerts() {
        const data = this.getMonitoringData();
        return {
            highConnectionCount: data.summary.totalConnections > 40, // 50ユーザーの80%
            highCpuUsage: data.summary.totalCpuTime > 1000, // 1秒以上
            highErrorRate: data.summary.totalErrors > 5, // 5エラー以上
            quotaWarning: this.quotaUsage.requests > 1000000 // 月間100万リクエストの警告
        };
    }
    /**
     * コスト試算
     */
    calculateCosts() {
        const data = this.getMonitoringData();
        // 1時間あたりの使用量から月間を推定
        const hourlyRequests = this.quotaUsage.requests;
        const hourlyCpuTime = this.quotaUsage.cpuTime;
        const monthlyRequests = hourlyRequests * 24 * 30;
        const monthlyCpuTime = hourlyCpuTime * 24 * 30;
        // Cloudflare Workers料金（2024年12月時点）
        const requestCost = Math.max(0, monthlyRequests - 1000000) * 0.0000005; // $0.50 per 1M requests
        const cpuCost = monthlyCpuTime * 0.00000125; // $12.50 per 10M GB-seconds
        const durableObjectCost = Math.max(0, monthlyRequests - 1000000) * 0.0000005; // $0.50 per 1M requests
        const estimatedCost = requestCost + cpuCost + durableObjectCost;
        return {
            monthlyRequests,
            monthlyCpuTime,
            estimatedCost
        };
    }
}
/**
 * グローバル監視インスタンス
 */
export const globalMonitor = new DurableObjectMonitor();
/**
 * 監視データのエクスポート用関数
 */
export function exportMonitoringData() {
    const data = globalMonitor.getMonitoringData();
    const alerts = globalMonitor.checkAlerts();
    const costs = globalMonitor.calculateCosts();
    return {
        ...data,
        alerts,
        costs,
        timestamp: new Date().toISOString()
    };
}
