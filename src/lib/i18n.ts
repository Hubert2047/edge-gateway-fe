'use client'

import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getStoredSettings, saveSettings } from '@/lib/settings'

export type Locale = 'zh-TW' | 'en'

type Messages = Record<string, string>

const messages: Record<Locale, Messages> = {
    'zh-TW': {
        'nav.overview': '總覽', 'nav.cloudSync': '雲端同步', 'nav.gateways': '本地閘道',
        'nav.meters': '智慧勾表', 'nav.historyData': '歷史資料', 'nav.historyEvents': '歷史事件',
        'nav.processControl': '製程管制', 'nav.processRules': '製程規則', 'nav.settings': '系統設定',
        'nav.apiDocs': 'API 文件', 'nav.logout': '登出', 'nav.edgeService': 'Edge service',
        'nav.connected': '連線正常', 'nav.openMenu': '開啟選單', 'nav.closeMenu': '關閉選單',
        'common.enabled': '啟用', 'common.disabled': '停用', 'common.save': '儲存', 'common.delete': '刪除',
        'common.cancel': '取消', 'common.confirm': '確認', 'common.add': '新增', 'common.adding': '新增中...',
        'common.saving': '儲存中...', 'common.info': '資訊', 'common.status': '狀態', 'common.actions': '操作',
        'common.name': '名稱', 'common.displayName': '顯示名稱', 'common.gateway': '閘道器',
        'common.settings': '細部設定', 'common.ip': 'IP 位址', 'common.port': 'PORT', 'common.seconds': '秒',
        'common.interval': '採集頻率（秒）', 'common.id': 'ID', 'common.collectNow': '立即收集',
        'common.confirmSave': '確認儲存', 'common.confirmDelete': '確認刪除', 'common.confirmCollect': '確認收集',
        'common.confirmSaveDescription': '確定要儲存「{name}」的設定嗎？',
        'common.confirmDeleteDescription': '確定要刪除「{name}」嗎？此操作無法復原。',
        'common.confirmCollectDescription': '確定要立即對「{name}」執行收集嗎？',
        'page.gateways': '本地閘道', 'page.cloudSync': '雲端同步', 'page.meters': '智慧勾表',
        'page.noGateways': '尚未設定任何本地閘道，請先至「本地閘道」新增閘道。',
        'empty.noGateways': '尚未設定任何本地閘道', 'empty.noCloudTargets': '尚未設定任何雲端服務器',
        'gateway.add': '新增閘道器', 'gateway.monitoring': '監控中', 'gateway.meterCount': '{count} 智慧勾表數',
        'gateway.lastSuccess': '最近成功：', 'gateway.idPlaceholder': '例如：GW001',
        'gateway.namePlaceholder': '例如：一樓機房', 'gateway.ipPlaceholder': '192.168.1.100',
        'gateway.portPlaceholder': '10123', 'gateway.intervalPlaceholder': '60', 'gateway.optional': '選填',
        'cloud.runQueue': '執行佇列上傳', 'cloud.running': '執行中...', 'cloud.online': '在線',
        'cloud.server': '雲端服務器', 'cloud.secret': '雲端服務器密鑰', 'cloud.apiBaseUrl': 'API BASE URL',
        'cloud.uploadInterval': '上傳頻率（秒）', 'cloud.lastUpload': '上次正確上傳時間',
        'cloud.pending': '待續傳', 'cloud.notUploaded': '尚未上傳', 'cloud.testConnection': '測試連線',
        'cloud.success': '連線成功', 'cloud.failure': '連線失敗', 'cloud.id': '雲端服務器 ID',
        'cloud.namePlaceholder': '例如：MMold 雲端（展示工廠A）', 'cloud.urlPlaceholder': 'https://api.mmold.com',
        'cloud.add': '新增雲端服務器',
        'meter.add': '新增智慧勾表', 'meter.count': '{count} 個', 'meter.phase': '相位型態',
        'meter.singlePhase': '單相', 'meter.threePhase': '三相', 'meter.voltage': '設定電壓 (V)',
        'meter.powerFactor': '功率因數', 'meter.namePlaceholder': '例如：主進線',
        'meter.macPlaceholder': '例如：AA:BB:CC:DD:EE:FF', 'meter.unsaved': '{count} 筆尚未儲存',
        'meter.allSaved': '所有變更已儲存', 'meter.saveAll': '儲存全部 ({count})',
        'meter.tableName': '智慧勾表名稱', 'meter.macId': 'MAC ID', 'meter.status': '狀態',
        'meter.added': '新增成功', 'meter.saved': '已儲存 {count} 筆',
        'meter.partialSaved': '成功 {success} 筆，失敗 {failure} 筆',
        'meter.confirmSaveAll': '確認全部儲存', 'meter.confirmSaveAllDescription': '確定要儲存{name}嗎？',
        'login.title': '登入帳號', 'login.subtitle': '請輸入您的帳號密碼以繼續', 'login.username': '帳號',
        'login.password': '密碼', 'login.usernamePlaceholder': '輸入帳號', 'login.login': '登入',
        'login.loggingIn': '登入中...', 'login.usernameRequired': '請輸入帳號', 'login.passwordRequired': '請輸入密碼',
        'validation.nameRequired': '請輸入名稱', 'validation.displayNameRequired': '請輸入顯示名稱',
        'validation.ipRequired': '請輸入 IP', 'validation.portInvalid': '請輸入有效的 PORT',
        'validation.intervalInvalid': '請輸入有效的秒數', 'validation.voltageInvalid': '請輸入有效的電壓',
        'validation.powerFactorInvalid': '請輸入 0 ~ 1 之間的功率因數', 'validation.macRequired': '請輸入 MAC ID',
        'validation.urlRequired': '請輸入 API BASE URL', 'validation.cloudIdRequired': '請輸入雲端服務器 ID',
        'validation.secretRequired': '請輸入雲端服務器密鑰', 'toast.saveFailed': '儲存失敗',
        'toast.deleteFailed': '刪除失敗', 'toast.collectFailed': '收集失敗', 'toast.addFailed': '新增失敗',
        'toast.statusFailed': '更新狀態失敗', 'toast.added': '新增成功', 'toast.connectionFailed': '連線失敗',
        'time.justNow': '剛剛', 'time.secondsAgo': '{count} 秒前', 'time.minutesAgo': '{count} 分鐘前',
        'time.hoursAgo': '{count} 小時前', 'time.daysAgo': '{count} 天前',
        'settings.title': '系統設定', 'settings.languageTitle': '語言',
        'settings.languageLabel': '介面語言', 'settings.zhTW': '繁體中文', 'settings.en': 'English',
        'settings.save': '儲存設定', 'settings.saved': '語言設定已儲存',
        'overview.title': '營運總覽', 'overview.refresh': '重新整理', 'overview.gatewayOnline': '閘道器在線',
        'overview.cloudOnline': '雲端在線', 'overview.meterCount': '智慧勾表', 'overview.uploaded': '成功投遞',
        'overview.pending': '等待上傳', 'overview.gatewayStatus': '閘道器狀態', 'overview.cloudStatus': '雲端狀態',
        'overview.meterStatus': '智慧勾表實時狀態', 'overview.meters': '個智慧勾表', 'overview.monitoring': '監控中',
        'overview.online': '在線', 'overview.voltage': '電壓', 'overview.averageCurrent': '平均電流',
        'overview.latestDataUnavailable': '最新資料：尚未提供即時讀值 API', 'overview.noGateways': '尚未設定任何本地閘道',
        'overview.noCloudTargets': '尚未設定任何雲端服務器', 'overview.noMeters': '尚未設定任何智慧勾表',
        'processControl.title': '製程管制分析', 'processControl.normal': '製程正常', 'processControl.timeRange': '時間軸',
        'processControl.daily': '每天（0:00–24:00）', 'processControl.weekly': '每週', 'processControl.monthly': '每月',
        'processControl.date': '指定時間', 'processControl.gateway': '閘道器', 'processControl.meter': '智慧勾表',
        'processControl.metric': '分析指標', 'processControl.activePower': '有效功率', 'processControl.current': '電流',
        'processControl.selectGateway': '請選擇閘道器', 'processControl.selectMeter': '請選擇智慧勾表',
        'processControl.lowerLimit': '管制下限', 'processControl.upperLimit': '管制上限', 'processControl.query': '查詢',
        'processControl.latest': '最新值', 'processControl.average': '平均值', 'processControl.minimum': '最小值',
        'processControl.maximum': '最大值', 'processControl.exceeded': '超出管制', 'processControl.sampleCount': '樣本數',
        'processControl.dataUnavailable': '尚未提供製程歷史資料 API',
        'historyData.title': '歷史數據', 'historyData.records': '筆記錄', 'historyData.timeRange': '時間軸',
        'historyData.hourly': '每時（00–60 分）', 'historyData.daily': '每天', 'historyData.weekly': '每週',
        'historyData.date': '指定時間', 'historyData.gateway': '閘道器', 'historyData.meter': '智慧勾表',
        'historyData.metric': '分析指標', 'historyData.averageCurrent': '平均電流', 'historyData.selectGateway': '請選擇閘道器',
        'historyData.selectMeter': '請選擇智慧勾表', 'historyData.showThreePhase': '顯示三相電流', 'historyData.query': '查詢',
        'historyData.samples': '樣本數', 'historyData.dataUnavailable': '尚未提供歷史資料 API', 'historyData.noData': '查無歷史資料',
        'historyData.time': '時間', 'historyData.voltage': '電壓', 'historyData.activePower': '有效功率', 'historyData.status': '狀態',
        'historyEvents.title': '歷史事件', 'historyEvents.records': '筆事件', 'historyEvents.timeRange': '時間軸',
        'historyEvents.daily': '每天（0:00–24:00）', 'historyEvents.weekly': '每週', 'historyEvents.monthly': '每月',
        'historyEvents.date': '指定時間', 'historyEvents.gateway': '閘道器', 'historyEvents.meter': '智慧勾表',
        'historyEvents.rule': '製程規則', 'historyEvents.allGateways': '全部閘道器', 'historyEvents.allMeters': '全部智慧勾表',
        'historyEvents.allRules': '全部製程規則', 'historyEvents.query': '查詢', 'historyEvents.noData': '查無歷史事件',
        'historyEvents.time': '時間', 'historyEvents.ruleName': '規則名稱', 'historyEvents.metric': '分析指標',
        'historyEvents.triggerValue': '觸發值', 'historyEvents.threshold': '閾值', 'historyEvents.reason': '觸發原因',
        'processRules.title': '製程規則', 'processRules.rules': '條規則', 'processRules.status': '狀態',
        'processRules.ruleName': '規則名稱', 'processRules.gatewayMetric': '閘道器／分析指標', 'processRules.meterThreshold': '智慧勾表／閾值',
        'processRules.noRules': '尚未建立任何製程規則', 'processRules.gateway': '閘道器', 'processRules.metric': '分析指標',
        'processRules.meter': '智慧勾表', 'processRules.lower': '下限閾值', 'processRules.upper': '上限閾值',
        'processRules.activePower': '有效功率', 'processRules.allMeters': '全部智慧勾表', 'processRules.selectGateway': '請選擇閘道器',
        'processRules.addTitle': '新增製程規則',
    },
    en: {
        'nav.overview': 'Overview', 'nav.cloudSync': 'Cloud Sync', 'nav.gateways': 'Local Gateways',
        'nav.meters': 'Smart Meters', 'nav.historyData': 'Historical Data', 'nav.historyEvents': 'Historical Events',
        'nav.processControl': 'Process Control', 'nav.processRules': 'Process Rules', 'nav.settings': 'Settings',
        'nav.apiDocs': 'API Docs', 'nav.logout': 'Log out', 'nav.edgeService': 'Edge service',
        'nav.connected': 'Connected', 'nav.openMenu': 'Open menu', 'nav.closeMenu': 'Close menu',
        'common.enabled': 'Enabled', 'common.disabled': 'Disabled', 'common.save': 'Save', 'common.delete': 'Delete',
        'common.cancel': 'Cancel', 'common.confirm': 'Confirm', 'common.add': 'Add', 'common.adding': 'Adding...',
        'common.saving': 'Saving...', 'common.info': 'Info', 'common.status': 'Status', 'common.actions': 'Actions',
        'common.name': 'Name', 'common.displayName': 'Display name', 'common.gateway': 'Gateway',
        'common.settings': 'Details', 'common.ip': 'IP address', 'common.port': 'PORT', 'common.seconds': 'sec',
        'common.interval': 'Polling interval (sec)', 'common.id': 'ID', 'common.collectNow': 'Collect now',
        'common.confirmSave': 'Confirm save', 'common.confirmDelete': 'Confirm deletion', 'common.confirmCollect': 'Confirm collection',
        'common.confirmSaveDescription': 'Save the settings for “{name}”?',
        'common.confirmDeleteDescription': 'Delete “{name}”? This action cannot be undone.',
        'common.confirmCollectDescription': 'Collect data from “{name}” now?',
        'page.gateways': 'Local Gateways', 'page.cloudSync': 'Cloud Sync', 'page.meters': 'Smart Meters',
        'page.noGateways': 'No local gateways configured. Add one from “Local Gateways” first.',
        'empty.noGateways': 'No local gateways configured', 'empty.noCloudTargets': 'No cloud targets configured',
        'gateway.add': 'Add gateway', 'gateway.monitoring': 'Monitoring', 'gateway.meterCount': '{count} smart meters',
        'gateway.lastSuccess': 'Last success:', 'gateway.idPlaceholder': 'e.g. GW001',
        'gateway.namePlaceholder': 'e.g. First-floor room', 'gateway.ipPlaceholder': '192.168.1.100',
        'gateway.portPlaceholder': '10123', 'gateway.intervalPlaceholder': '60', 'gateway.optional': 'Optional',
        'cloud.runQueue': 'Run queued uploads', 'cloud.running': 'Running...', 'cloud.online': 'Online',
        'cloud.server': 'Cloud server', 'cloud.secret': 'Cloud server secret', 'cloud.apiBaseUrl': 'API BASE URL',
        'cloud.uploadInterval': 'Upload interval (sec)', 'cloud.lastUpload': 'Last successful upload',
        'cloud.pending': 'Pending uploads', 'cloud.notUploaded': 'Not uploaded yet', 'cloud.testConnection': 'Test connection',
        'cloud.success': 'Connection successful', 'cloud.failure': 'Connection failed', 'cloud.id': 'Cloud server ID',
        'cloud.namePlaceholder': 'e.g. MMold Cloud (Factory A)', 'cloud.urlPlaceholder': 'https://api.mmold.com',
        'cloud.add': 'Add cloud server',
        'meter.add': 'Add smart meter', 'meter.count': '{count}', 'meter.phase': 'Phase type',
        'meter.singlePhase': 'Single-phase', 'meter.threePhase': 'Three-phase', 'meter.voltage': 'Voltage (V)',
        'meter.powerFactor': 'Power factor', 'meter.namePlaceholder': 'e.g. Main feed',
        'meter.macPlaceholder': 'e.g. AA:BB:CC:DD:EE:FF', 'meter.unsaved': '{count} unsaved',
        'meter.allSaved': 'All changes saved', 'meter.saveAll': 'Save all ({count})',
        'meter.tableName': 'Smart meter name', 'meter.macId': 'MAC ID', 'meter.status': 'Status',
        'meter.added': 'Added successfully', 'meter.saved': 'Saved {count}',
        'meter.partialSaved': 'Succeeded: {success}, failed: {failure}',
        'meter.confirmSaveAll': 'Confirm save all', 'meter.confirmSaveAllDescription': 'Save {name}?',
        'login.title': 'Sign in', 'login.subtitle': 'Enter your username and password to continue', 'login.username': 'Username',
        'login.password': 'Password', 'login.usernamePlaceholder': 'Enter username', 'login.login': 'Sign in',
        'login.loggingIn': 'Signing in...', 'login.usernameRequired': 'Please enter your username', 'login.passwordRequired': 'Please enter your password',
        'validation.nameRequired': 'Please enter a name', 'validation.displayNameRequired': 'Please enter a display name',
        'validation.ipRequired': 'Please enter an IP address', 'validation.portInvalid': 'Please enter a valid port',
        'validation.intervalInvalid': 'Please enter a valid number of seconds', 'validation.voltageInvalid': 'Please enter a valid voltage',
        'validation.powerFactorInvalid': 'Enter a power factor between 0 and 1', 'validation.macRequired': 'Please enter a MAC ID',
        'validation.urlRequired': 'Please enter an API base URL', 'validation.cloudIdRequired': 'Please enter a cloud server ID',
        'validation.secretRequired': 'Please enter a cloud server secret', 'toast.saveFailed': 'Save failed',
        'toast.deleteFailed': 'Delete failed', 'toast.collectFailed': 'Collection failed', 'toast.addFailed': 'Add failed',
        'toast.statusFailed': 'Failed to update status', 'toast.added': 'Added successfully', 'toast.connectionFailed': 'Connection failed',
        'time.justNow': 'Just now', 'time.secondsAgo': '{count}s ago', 'time.minutesAgo': '{count}m ago',
        'time.hoursAgo': '{count}h ago', 'time.daysAgo': '{count}d ago',
        'settings.title': 'Settings', 'settings.languageTitle': 'Language',
        'settings.languageLabel': 'Interface language', 'settings.zhTW': '繁體中文', 'settings.en': 'English',
        'settings.save': 'Save settings', 'settings.saved': 'Language preference saved',
        'overview.title': 'Operations overview', 'overview.refresh': 'Refresh', 'overview.gatewayOnline': 'Gateways online',
        'overview.cloudOnline': 'Cloud targets online', 'overview.meterCount': 'Smart meters', 'overview.uploaded': 'Successful uploads',
        'overview.pending': 'Pending uploads', 'overview.gatewayStatus': 'Gateway status', 'overview.cloudStatus': 'Cloud status',
        'overview.meterStatus': 'Smart meter live status', 'overview.meters': 'smart meters', 'overview.monitoring': 'Monitoring',
        'overview.online': 'Online', 'overview.voltage': 'Voltage', 'overview.averageCurrent': 'Average current',
        'overview.latestDataUnavailable': 'Latest data: real-time readings API is not available yet', 'overview.noGateways': 'No local gateways configured',
        'overview.noCloudTargets': 'No cloud targets configured', 'overview.noMeters': 'No smart meters configured',
        'processControl.title': 'Process control analysis', 'processControl.normal': 'Process normal', 'processControl.timeRange': 'Time range',
        'processControl.daily': 'Daily (0:00–24:00)', 'processControl.weekly': 'Weekly', 'processControl.monthly': 'Monthly',
        'processControl.date': 'Date', 'processControl.gateway': 'Gateway', 'processControl.meter': 'Smart meter',
        'processControl.metric': 'Metric', 'processControl.activePower': 'Active power', 'processControl.current': 'Current',
        'processControl.selectGateway': 'Select gateway', 'processControl.selectMeter': 'Select smart meter',
        'processControl.lowerLimit': 'Lower limit', 'processControl.upperLimit': 'Upper limit', 'processControl.query': 'Query',
        'processControl.latest': 'Latest', 'processControl.average': 'Average', 'processControl.minimum': 'Minimum',
        'processControl.maximum': 'Maximum', 'processControl.exceeded': 'Exceeded control', 'processControl.sampleCount': 'Samples',
        'processControl.dataUnavailable': 'Process history API is not available yet',
        'historyData.title': 'Historical data', 'historyData.records': 'records', 'historyData.timeRange': 'Time range',
        'historyData.hourly': 'Hourly (00–60 min)', 'historyData.daily': 'Daily', 'historyData.weekly': 'Weekly',
        'historyData.date': 'Date', 'historyData.gateway': 'Gateway', 'historyData.meter': 'Smart meter',
        'historyData.metric': 'Metric', 'historyData.averageCurrent': 'Average current', 'historyData.selectGateway': 'Select gateway',
        'historyData.selectMeter': 'Select smart meter', 'historyData.showThreePhase': 'Show three-phase current', 'historyData.query': 'Query',
        'historyData.samples': 'samples', 'historyData.dataUnavailable': 'Historical data API is not available yet', 'historyData.noData': 'No historical data',
        'historyData.time': 'Time', 'historyData.voltage': 'Voltage', 'historyData.activePower': 'Active power', 'historyData.status': 'Status',
        'historyEvents.title': 'Historical events', 'historyEvents.records': 'events', 'historyEvents.timeRange': 'Time range',
        'historyEvents.daily': 'Daily (0:00–24:00)', 'historyEvents.weekly': 'Weekly', 'historyEvents.monthly': 'Monthly',
        'historyEvents.date': 'Date', 'historyEvents.gateway': 'Gateway', 'historyEvents.meter': 'Smart meter',
        'historyEvents.rule': 'Process rule', 'historyEvents.allGateways': 'All gateways', 'historyEvents.allMeters': 'All smart meters',
        'historyEvents.allRules': 'All process rules', 'historyEvents.query': 'Query', 'historyEvents.noData': 'No historical events',
        'historyEvents.time': 'Time', 'historyEvents.ruleName': 'Rule name', 'historyEvents.metric': 'Metric',
        'historyEvents.triggerValue': 'Trigger value', 'historyEvents.threshold': 'Threshold', 'historyEvents.reason': 'Trigger reason',
        'processRules.title': 'Process rules', 'processRules.rules': 'rules', 'processRules.status': 'Status',
        'processRules.ruleName': 'Rule name', 'processRules.gatewayMetric': 'Gateway / metric', 'processRules.meterThreshold': 'Smart meter / threshold',
        'processRules.noRules': 'No process rules configured', 'processRules.gateway': 'Gateway', 'processRules.metric': 'Metric',
        'processRules.meter': 'Smart meter', 'processRules.lower': 'Lower limit', 'processRules.upper': 'Upper limit',
        'processRules.activePower': 'Active power', 'processRules.allMeters': 'All smart meters', 'processRules.selectGateway': 'Select gateway',
        'processRules.addTitle': 'Add process rule',
    },
}

type I18nContextValue = {
    locale: Locale
    setLocale: (locale: Locale) => void
    t: (key: string, values?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function detectLocale(): Locale {
    if (typeof navigator === 'undefined') return 'zh-TW'
    const languages = navigator.languages?.length ? navigator.languages : [navigator.language]
    return languages.some((language) => language.toLowerCase().startsWith('en')) ? 'en' : 'zh-TW'
}

export function I18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocale] = useState<Locale>('zh-TW')

    useEffect(() => {
        const stored = getStoredSettings().locale
        const detected: Locale = stored === 'en' || stored === 'zh-TW' ? stored : detectLocale()
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLocale(detected)
        document.documentElement.lang = detected === 'en' ? 'en' : 'zh-Hant'
    }, [])

    const changeLocale = (nextLocale: Locale) => {
        saveSettings({ locale: nextLocale })
        setLocale(nextLocale)
        document.documentElement.lang = nextLocale === 'en' ? 'en' : 'zh-Hant'
    }

    const value = useMemo<I18nContextValue>(() => ({
        locale,
        setLocale: changeLocale,
        t: (key, values = {}) => {
            const template = messages[locale][key] ?? messages['zh-TW'][key] ?? key
            return template.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`))
        },
    }), [locale])

    return createElement(I18nContext.Provider, { value }, children)
}

export function useI18n() {
    const context = useContext(I18nContext)
    if (!context) throw new Error('useI18n must be used within I18nProvider')
    return context
}
